/**
 * Lee documentos en el teléfono: se achican, OCR de todas, MedPsy extrae JSON,
 * se borra la copia.
 *
 * El lote importa: si OCR y MedPsy conviven, el detector (CRAFT) se queda sin
 * grafo (`ggml_galloc_alloc_graph`) en la segunda página. Aquí el OCR corre
 * solo, se suelta entre foto y foto, y MedPsy entra después, sin LoRA.
 *
 * No hay SQLite aquí. La cola durable de la solicitud de crédito está en
 * `cola.ts` (SQLite). Aquí solo queda el JSON validado en memoria del flujo.
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
import {
  breadcrumbLectura,
  docKindSentry,
  reportarLoteLecturaSentry,
  type DocKindSentry,
} from "./sentry";

/** Código corto para Sentry — sin mensaje de usuario ni OCR. */
function codigoErrorLectura(err: unknown): string {
  const t = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (t.includes("galloc") || t.includes("alloc_graph") || t.includes("stepdetection")) return "graph";
  if (t.includes("heic") || t.includes("formato que el lector no abre")) return "heic";
  if (t.includes("invalid") || t.includes("unrecognized") || t.includes("expected string")) return "invalid_image";
  if (t.includes("not found") || t.includes("not accessible")) return "missing_file";
  if (t.includes("ya se está leyendo")) return "busy";
  return "other";
}

const OCR_NOMBRE = "OCR_LATIN";
/** Lado largo máximo. 1280 aún estalla CRAFT en 17 Pro Max (Sentry galloc ×28). */
const MAX_LADO = 1024;
const MAX_LADO_REINTENTO = 800;

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

function esFalloGrafo(err: unknown): boolean {
  const t = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    t.includes("galloc")
    || t.includes("alloc_graph")
    || t.includes("stepdetection")
    || t.includes("demasiado grande para el lector")
    || t.includes("invalid input")
    || t.includes("invalid image")
    || t.includes("invalid_image")
  );
}

/** El unload nativo no libera Metal en el mismo tick. Sin esta pausa, la página 2 hereda el grafo roto. */
function cederRam(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 350));
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

/** JPEG chico, lado largo <= MAX_LADO. El detector no traga la foto nativa del 17 Pro Max. */
async function achicar(uri: string, lado = MAX_LADO): Promise<string> {
  type Accion = { resize: { width?: number; height?: number } };
  const acciones: Accion[] = [];
  try {
    const { width, height } = await medidaDe(uri);
    const largo = Math.max(width, height);
    if (largo > lado) {
      acciones.push(width >= height ? { resize: { width: lado } } : { resize: { height: lado } });
    }
  } catch (err) {
    recordError("medidaImagen", err);
    acciones.push({ resize: { width: lado } });
  }
  try {
    // El nativo no entra al arranque: si no está linkeado, Release se queda en blanco.
    const ImageManipulator = await import("expo-image-manipulator");
    const out = await ImageManipulator.manipulateAsync(uri, acciones, {
      compress: lado <= MAX_LADO_REINTENTO ? 0.5 : 0.55,
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

async function ocrPagina(
  uri: string,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<{ texto: string; confianza?: number; stats: unknown }> {
  const intentar = async (imagenUri: string) => {
    await asegurarOcr(onProgreso);
    return ocrImagen(imagenUri);
  };
  try {
    return await intentar(uri);
  } catch (err) {
    if (!esFalloGrafo(err)) throw err;
    recordError("ocr.grafo", err);
    await soltarOcr();
    await cederRam();
    const masChica = await achicar(uri, MAX_LADO_REINTENTO);
    try {
      return await intentar(masChica);
    } finally {
      if (masChica !== uri) borrarCopia(masChica);
    }
  } finally {
    await soltarOcr();
    await cederRam();
  }
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
    conLora: false,
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

/** Borra copia de trabajo `file://`. Galería (`ph://`/`content://`) se salta. */
export function borrarUriFoto(uri: string): boolean {
  return borrarCopia(uri);
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
 * Achica, lee el texto de cada foto con el detector fresco, extrae con MedPsy
 * base (sin LoRA), borra copias. Nunca deja el detector y MedPsy a la vez.
 */
export async function leerDocumentos(
  entradas: EntradaDocumento[],
  onProgreso?: (clave: ClaveDocumento, p: ProgresoLectura) => void,
): Promise<Partial<Record<ClaveDocumento, LecturaDocumento>>> {
  if (ocupado) throw new Error("Ya se está leyendo un lote.");
  if (entradas.length === 0) return {};
  ocupado = true;
  const appLog = getAppLogger();
  const tLote = Date.now();
  const aviso = (p: ProgresoLectura) => {
    for (const e of entradas) onProgreso?.(e.clave, p);
  };
  const trabajos: Trabajo[] = [];
  const out: Partial<Record<ClaveDocumento, LecturaDocumento>> = {};
  /** Telemetría por kind — sin texto OCR. */
  const tele: Array<{
    kind: DocKindSentry;
    ok: boolean;
    chars?: number;
    ms?: number;
    borrada?: boolean;
    errorCode?: string;
  }> = [];

  breadcrumbLectura("lote.start", { n: entradas.length });

  try {
    aviso({ paso: "ocr", detalle: "Achicando las fotos" });
    for (const e of entradas) {
      onProgreso?.(e.clave, { paso: "ocr", detalle: `Achicando ${NOMBRE[e.clave]}` });
      const kind = docKindSentry(e.clave);
      breadcrumbLectura("resize", { kind });
      const chica = await achicar(e.uri);
      if (chica !== e.uri) borrarCopia(e.uri);
      trabajos.push({ clave: e.clave, original: e.uri, chica });
    }

    await soltarMedPsy(true);
    await cederRam();
    for (const t of trabajos) {
      const kind = docKindSentry(t.clave);
      onProgreso?.(t.clave, { paso: "ocr", detalle: `Leyendo ${NOMBRE[t.clave]}` });
      breadcrumbLectura("ocr.start", { kind });
      const tOcr = Date.now();
      try {
        const ocr = await ocrPagina(t.chica, aviso);
        const ms = Date.now() - tOcr;
        await recordInference({
          task: "ocr",
          model: OCR_NOMBRE,
          quant: "-",
          lora: null,
          ctx_size: 0,
          device_cfg: "cpu",
          ttft_ms: null,
          load_ms: ms,
          stats: ocr.stats ?? {},
          out_chars: ocr.texto.length,
        });
        if (!ocr.texto) {
          t.error = "No se leyó texto. Prueba con más luz o sube otra imagen.";
          breadcrumbLectura("ocr.empty", { kind, ms }, "warning");
        } else {
          t.ocr = ocr;
          breadcrumbLectura("ocr.ok", {
            kind,
            ms,
            chars: ocr.texto.length,
            conf: typeof ocr.confianza === "number" ? Math.round(ocr.confianza * 100) / 100 : -1,
          });
        }
      } catch (err) {
        recordError(`ocr.${t.clave}`, err);
        t.error = mensajeLectura(err);
        breadcrumbLectura("ocr.fail", {
          kind,
          ms: Date.now() - tOcr,
          err: codigoErrorLectura(err),
        }, "error");
      }
    }

    await soltarOcr();

    const conTexto = trabajos.filter(t => t.ocr && !t.error);
    if (conTexto.length > 0) {
      breadcrumbLectura("extract.start", { n: conTexto.length });
      await asegurarMedPsy(
        p => aviso({ paso: "extraccion", pct: p.pct, detalle: p.detalle }),
        { conLora: false },
      );
      for (const t of conTexto) {
        const ocr = t.ocr;
        if (!ocr) continue;
        const kind = docKindSentry(t.clave);
        onProgreso?.(t.clave, { paso: "extraccion", detalle: `Sacando datos de ${NOMBRE[t.clave]}` });
        const tEx = Date.now();
        try {
          const bruto = await extraerConLlm(t.clave, ocr.texto, ocr.confianza);
          const parsed = parsearExtraccion(t.clave, bruto, ocr.texto);
          const borrar = [...new Set([t.chica, t.original])];
          const borrada = borrar.every(borrarCopia);
          if (!borrada) appLog.info(`no se pudo borrar ${t.clave}`);
          out[t.clave] = { ...parsed, textoOcr: ocr.texto, borrada };
          breadcrumbLectura(parsed.ok ? "extract.ok" : "extract.parse_fail", {
            kind,
            ms: Date.now() - tEx,
            chars: ocr.texto.length,
            borrada,
          }, parsed.ok ? "info" : "warning");
          tele.push({
            kind,
            ok: parsed.ok,
            chars: ocr.texto.length,
            ms: Date.now() - tEx,
            borrada,
            errorCode: parsed.ok ? undefined : "parse",
          });
        } catch (err) {
          recordError(`extraccion.${t.clave}`, err);
          t.error = mensajeLectura(err);
          breadcrumbLectura("extract.fail", {
            kind,
            ms: Date.now() - tEx,
            err: codigoErrorLectura(err),
          }, "error");
        }
      }
      await soltarMedPsy(true);
    }

    for (const t of trabajos) {
      if (out[t.clave]) continue;
      const borrada = [t.chica, t.original].every(borrarCopia);
      out[t.clave] = fallo(t.clave, t.error ?? "No se pudo leer el documento.", t.ocr?.texto ?? "", borrada);
      tele.push({
        kind: docKindSentry(t.clave),
        ok: false,
        chars: t.ocr?.texto?.length ?? 0,
        borrada,
        errorCode: t.error ? (t.ocr ? "extract_or_empty" : "ocr") : "unknown",
      });
    }
    reportarLoteLecturaSentry({ resultados: tele, msTotal: Date.now() - tLote });
    return out;
  } catch (err) {
    breadcrumbLectura("lote.crash", { err: codigoErrorLectura(err) }, "error");
    throw err;
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
 * Solo OCR de una foto. Suelta MedPsy antes: detector y LLM no caben.
 */
export async function leerOcrDeUri(
  uri: string,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<{ texto: string; confianza?: number; stats: unknown }> {
  await soltarMedPsy(true);
  await cederRam();
  onProgreso?.({ paso: "ocr", detalle: "Achicando la foto" });
  breadcrumbLectura("ocr.single.start");
  const chica = await achicar(uri);
  onProgreso?.({ paso: "ocr", detalle: "Leyendo el texto del papel" });
  const tOcr = Date.now();
  try {
    const ocr = await ocrPagina(chica, onProgreso);
    const ms = Date.now() - tOcr;
    await recordInference({
      task: "ocr",
      model: OCR_NOMBRE,
      quant: "-",
      lora: null,
      ctx_size: 0,
      device_cfg: "cpu",
      ttft_ms: null,
      load_ms: ms,
      stats: ocr.stats ?? {},
      out_chars: ocr.texto.length,
    });
    breadcrumbLectura(ocr.texto ? "ocr.single.ok" : "ocr.single.empty", {
      ms,
      chars: ocr.texto.length,
    }, ocr.texto ? "info" : "warning");
    return ocr;
  } catch (err) {
    breadcrumbLectura("ocr.single.fail", {
      ms: Date.now() - tOcr,
      err: codigoErrorLectura(err),
    }, "error");
    throw err;
  } finally {
    if (chica !== uri) borrarCopia(chica);
  }
}

/** Libera RAM al salir de la pantalla. Los pesos siguen en caché. */
export async function soltarLectores(): Promise<void> {
  await soltarOcr();
  await soltarMedPsy();
}
