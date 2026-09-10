/**
 * Lee documentos en el teléfono: se achican, OCR de todas, MedPsy extrae JSON,
 * se borra la copia.
 *
 * El lote importa: si OCR y MedPsy conviven, el detector (CRAFT) se queda sin
 * grafo (`ggml_galloc_alloc_graph`) en la segunda página. Aquí el OCR corre
 * solo, se suelta, y MedPsy entra después.
 *
 * No hay SQLite aquí. Lo que queda es el JSON validado, en memoria, hasta que
 * confirmemos si hace falta persistirlo para la cola.
 */
import { Image } from "react-native";
import { File, Paths } from "expo-file-system";
import {
  SYSTEM_EXTRACCION_CEDULA,
  SYSTEM_EXTRACCION_EXTRACTO,
  SYSTEM_EXTRACCION_INGRESOS,
} from "./core/prompts";
import { parsearExtraccion, type ClaveDocumento, type ExtraccionFallo, type ExtraccionOk } from "./core/extraccion";
import { asegurarMedPsy, bajar, completarMedPsy, sdk, soltarMedPsy } from "./medpsy";
import { getAppLogger, recordError, recordInference } from "./perf/logger";

const OCR_NOMBRE = "OCR_LATIN";
/** Lado largo máximo antes del detector. Un 17 Pro Max dispara 4000 px; CRAFT no cabe. */
const MAX_LADO = 1280;

const SYSTEM: Record<ClaveDocumento, string> = {
  cedula: SYSTEM_EXTRACCION_CEDULA,
  ingresos: SYSTEM_EXTRACCION_INGRESOS,
  extracto: SYSTEM_EXTRACCION_EXTRACTO,
};

const NOMBRE: Record<ClaveDocumento, string> = {
  cedula: "la cédula",
  ingresos: "el comprobante",
  extracto: "el extracto",
};

export type ProgresoLectura = {
  paso: "descarga" | "ocr" | "extraccion";
  pct?: number;
  detalle: string;
};

export type LecturaDocumento = (ExtraccionOk | ExtraccionFallo) & {
  textoOcr: string;
  borrada: boolean;
};

export type EntradaDocumento = { clave: ClaveDocumento; uri: string };

let ocrId: string | null = null;
let ocupado = false;

async function asegurarOcr(onProgreso?: (p: ProgresoLectura) => void): Promise<string> {
  if (ocrId) return ocrId;
  const s = await sdk();
  const { OCR_LATIN } = await import("@qvac/sdk/models");
  onProgreso?.({ paso: "descarga", detalle: "Preparando el lector de texto" });
  await bajar(OCR_LATIN, p => {
    onProgreso?.({ paso: "descarga", pct: p.pct, detalle: `Bajando el lector ${p.pct ?? 0}%` });
  });
  onProgreso?.({ paso: "ocr", detalle: "Cargando el lector de texto" });
  ocrId = await s.loadModel({
    modelSrc: OCR_LATIN,
    modelType: "ggml-ocr",
    modelConfig: {
      langList: ["en"],
      magRatio: 1,
      canvasSize: MAX_LADO,
      contrastRetry: false,
      lowConfidenceThreshold: 0.5,
      recognizerBatchSize: 1,
    },
  });
  return ocrId;
}

async function soltarOcr(): Promise<void> {
  const id = ocrId;
  ocrId = null;
  if (!id) return;
  const s = await sdk();
  try {
    await s.unloadModel({ modelId: id, clearStorage: false });
  } catch (err) {
    recordError("unloadModel", err);
  }
}

async function bytesDe(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  if (typeof file.bytes === "function") return await file.bytes();
  const b64 = await file.base64();
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function rutaLocal(uri: string): string {
  return uri.startsWith("file://") ? decodeURIComponent(uri.slice("file://".length)) : uri;
}

/** El cliente de `ocr()` solo manda base64 si `image` no es string y tiene `toString('base64')`. Uint8Array no. */
function imagenBase64(b64: string): { toString: (enc?: string) => string } {
  const limpio = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  return { toString: (enc?: string) => (enc === "base64" || enc == null ? limpio : limpio) };
}

function esJpegOPng(b64: string): boolean {
  const t = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").replace(/\s/g, "");
  return t.startsWith("/9j/") || t.startsWith("iVBORw0KGgo");
}

export function mensajeLectura(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const t = raw.toLowerCase();
  if (t.includes("galloc") || t.includes("alloc_graph") || t.includes("stepdetection")) {
    return "Esa foto es demasiado grande para el lector. Se achica y se leen juntas; si vuelve a pasar, toma otra más de lejos.";
  }
  if (
    t.includes("invalid input")
    || t.includes("invalid image")
    || t.includes("invalid_image")
    || t.includes("expected string")
    || t.includes("unrecognized")
  ) {
    return "El lector no pudo abrir esa foto. Tómala otra vez, de frente y con luz.";
  }
  if (t.includes("not found") || t.includes("not accessible")) {
    return "No se pudo abrir el archivo. Prueba tomándola otra vez con la cámara.";
  }
  return raw || "No se pudo leer el documento.";
}

function medidaDe(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/** JPEG chico, lado largo <= 1280. El detector no traga la foto nativa del 17 Pro Max. */
async function achicar(uri: string): Promise<string> {
  type Accion = { resize: { width?: number; height?: number } };
  const acciones: Accion[] = [];
  try {
    const { width, height } = await medidaDe(uri);
    const largo = Math.max(width, height);
    if (largo > MAX_LADO) {
      acciones.push(width >= height ? { resize: { width: MAX_LADO } } : { resize: { height: MAX_LADO } });
    }
  } catch (err) {
    recordError("medidaImagen", err);
    acciones.push({ resize: { width: MAX_LADO } });
  }
  try {
    // El nativo no entra al arranque: si no está linkeado, Release se queda en blanco.
    const ImageManipulator = await import("expo-image-manipulator");
    const out = await ImageManipulator.manipulateAsync(uri, acciones, {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return out.uri;
  } catch (err) {
    recordError("achicarImagen", err);
    try {
      const dest = new File(Paths.cache, `inaigar-doc-${Date.now()}.jpg`);
      new File(uri).copy(dest);
      return dest.uri;
    } catch {
      return uri;
    }
  }
}

async function ocrImagen(uri: string): Promise<{ texto: string; confianza?: number; stats: unknown }> {
  const s = await sdk();
  if (!ocrId) throw new Error("OCR no cargado");
  if (typeof s.ocr !== "function") throw new Error("Este SDK no expone ocr()");

  const file = new File(uri);
  const b64 = typeof file.base64 === "function"
    ? await file.base64()
    : uint8ToBase64(await bytesDe(uri));
  if (!esJpegOPng(b64)) {
    throw new Error("Esa foto quedó en un formato que el lector no abre (HEIC). Tómala otra vez con la cámara de la app.");
  }

  const correr = async (image: unknown) => {
    const r = s.ocr({ modelId: ocrId as string, image: image as string });
    const bloques = await r.blocks;
    const stats = await r.stats;
    return { bloques, stats };
  };

  let bloques: { text: string; confidence?: number }[];
  let stats: unknown;
  try {
    const r = await correr(imagenBase64(b64));
    bloques = r.bloques;
    stats = r.stats;
  } catch (err) {
    recordError("ocr.base64", err);
    try {
      const r = await correr(rutaLocal(uri));
      bloques = r.bloques;
      stats = r.stats;
    } catch (err2) {
      recordError("ocr.path", err2);
      throw new Error(mensajeLectura(err2 instanceof Error ? err2 : err));
    }
  }

  const texto = bloques.map(b => b.text.trim()).filter(Boolean).join("\n");
  const confs = bloques.map(b => b.confidence).filter((c): c is number => typeof c === "number");
  const confianza = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : undefined;
  return { texto, confianza, stats };
}

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function extraerConLlm(clave: ClaveDocumento, textoOcr: string, confianzaOcr?: number) {
  // Texto, no la foto. Si MedPsy no carga aquí, completarMedPsy pide al pueblo.
  const confianza =
    typeof confianzaOcr === "number" ? `\nOCR confidence (mean): ${confianzaOcr.toFixed(2)}` : "";
  return completarMedPsy({
    system: SYSTEM[clave],
    user: `${textoOcr}${confianza}`,
    task: "extraccion",
    temp: 0.1,
    predict: 220,
  });
}

function borrarCopia(uri: string): boolean {
  if (!uri || uri.startsWith("ph://") || uri.startsWith("content://")) return true;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
      return true;
    }
    const otra = new File(rutaLocal(uri));
    if (otra.exists) {
      otra.delete();
      return true;
    }
    return true;
  } catch (err) {
    recordError("borrarFoto", err);
  }
  return false;
}

type Trabajo = {
  clave: ClaveDocumento;
  original: string;
  chica: string;
  ocr?: { texto: string; confianza?: number; stats: unknown };
  error?: string;
};

function fallo(clave: ClaveDocumento, error: string, textoOcr = "", borrada = false): LecturaDocumento {
  return { ok: false, clave, crudo: null, error, textoOcr, borrada };
}

/**
 * Achica, lee el texto de todas, suelta el OCR, extrae con MedPsy, borra copias.
 * Nunca deja el detector y MedPsy cargados a la vez.
 */
export async function leerDocumentos(
  entradas: EntradaDocumento[],
  onProgreso?: (clave: ClaveDocumento, p: ProgresoLectura) => void,
): Promise<Partial<Record<ClaveDocumento, LecturaDocumento>>> {
  if (ocupado) throw new Error("Ya se está leyendo un lote.");
  if (entradas.length === 0) return {};
  ocupado = true;
  const appLog = getAppLogger();
  const aviso = (p: ProgresoLectura) => {
    for (const e of entradas) onProgreso?.(e.clave, p);
  };
  const trabajos: Trabajo[] = [];
  const out: Partial<Record<ClaveDocumento, LecturaDocumento>> = {};

  try {
    aviso({ paso: "ocr", detalle: "Achicando las fotos" });
    for (const e of entradas) {
      onProgreso?.(e.clave, { paso: "ocr", detalle: `Achicando ${NOMBRE[e.clave]}` });
      const chica = await achicar(e.uri);
      trabajos.push({ clave: e.clave, original: e.uri, chica });
    }

    await soltarMedPsy();
    await asegurarOcr(aviso);
    for (const t of trabajos) {
      onProgreso?.(t.clave, { paso: "ocr", detalle: `Leyendo ${NOMBRE[t.clave]}` });
      const tOcr = Date.now();
      try {
        const ocr = await ocrImagen(t.chica);
        await recordInference({
          task: "ocr",
          model: OCR_NOMBRE,
          quant: "-",
          lora: null,
          ctx_size: 0,
          device_cfg: "cpu",
          ttft_ms: null,
          load_ms: Date.now() - tOcr,
          stats: ocr.stats ?? {},
        });
        if (!ocr.texto) {
          t.error = "No se leyó texto. Prueba con más luz o sube otra imagen.";
        } else {
          t.ocr = ocr;
        }
      } catch (err) {
        recordError(`ocr.${t.clave}`, err);
        t.error = mensajeLectura(err);
      }
    }

    await soltarOcr();

    const conTexto = trabajos.filter(t => t.ocr && !t.error);
    if (conTexto.length > 0) {
      await asegurarMedPsy(p => aviso({ paso: "extraccion", pct: p.pct, detalle: p.detalle }));
      for (const t of conTexto) {
        const ocr = t.ocr;
        if (!ocr) continue;
        onProgreso?.(t.clave, { paso: "extraccion", detalle: `Sacando datos de ${NOMBRE[t.clave]}` });
        try {
          const bruto = await extraerConLlm(t.clave, ocr.texto, ocr.confianza);
          const parsed = parsearExtraccion(t.clave, bruto, ocr.texto);
          const borrar = [...new Set([t.chica, t.original])];
          const borrada = borrar.every(borrarCopia);
          if (!borrada) appLog.info(`no se pudo borrar ${t.clave}`);
          out[t.clave] = { ...parsed, textoOcr: ocr.texto, borrada };
        } catch (err) {
          recordError(`extraccion.${t.clave}`, err);
          t.error = mensajeLectura(err);
        }
      }
      await soltarMedPsy();
    }

    for (const t of trabajos) {
      if (out[t.clave]) continue;
      const borrada = [t.chica, t.original].every(borrarCopia);
      out[t.clave] = fallo(t.clave, t.error ?? "No se pudo leer el documento.", t.ocr?.texto ?? "", borrada);
    }
    return out;
  } finally {
    for (const t of trabajos) {
      borrarCopia(t.chica);
      borrarCopia(t.original);
    }
    ocupado = false;
  }
}

export async function leerDocumento(
  clave: ClaveDocumento,
  uri: string,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<LecturaDocumento> {
  const r = await leerDocumentos([{ clave, uri }], (c, p) => {
    if (c === clave) onProgreso?.(p);
  });
  const x = r[clave];
  if (!x) throw new Error("No se pudo leer el documento.");
  return x;
}

/**
 * Solo OCR de una foto (vía B). Suelta MedPsy antes: detector y LLM no caben.
 */
export async function leerOcrDeUri(
  uri: string,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<{ texto: string; confianza?: number; stats: unknown }> {
  await soltarMedPsy();
  onProgreso?.({ paso: "ocr", detalle: "Achicando la foto" });
  const chica = await achicar(uri);
  await asegurarOcr(onProgreso);
  onProgreso?.({ paso: "ocr", detalle: "Leyendo el texto del papel" });
  const tOcr = Date.now();
  try {
    const ocr = await ocrImagen(chica);
    await recordInference({
      task: "ocr",
      model: OCR_NOMBRE,
      quant: "-",
      lora: null,
      ctx_size: 0,
      device_cfg: "cpu",
      ttft_ms: null,
      load_ms: Date.now() - tOcr,
      stats: ocr.stats ?? {},
    });
    return ocr;
  } finally {
    if (chica !== uri) borrarCopia(chica);
  }
}

/** Libera RAM al salir de la pantalla. Los pesos siguen en caché. */
export async function soltarLectores(): Promise<void> {
  await soltarOcr();
  await soltarMedPsy();
}
