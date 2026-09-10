/**
 * Lee un documento en el teléfono: OCR → MedPsy extrae JSON → se borra la copia.
 *
 * No hay SQLite aquí. Lo que queda es el JSON validado, en memoria, hasta que
 * confirmemos si hace falta persistirlo para la cola.
 */
import { File, Paths } from "expo-file-system";
import {
  SYSTEM_EXTRACCION_CEDULA,
  SYSTEM_EXTRACCION_EXTRACTO,
  SYSTEM_EXTRACCION_INGRESOS,
} from "./core/prompts";
import { parsearExtraccion, type ClaveDocumento, type ExtraccionFallo, type ExtraccionOk } from "./core/extraccion";
import { getAppLogger, recordError, recordInference } from "./perf/logger";

const CTX = 2048;
const MEDPSY = "HEALTHCARE_1_7B_MEDICAL_Q8_0";
const OCR_NOMBRE = "OCR_LATIN";

const SYSTEM: Record<ClaveDocumento, string> = {
  cedula: SYSTEM_EXTRACCION_CEDULA,
  ingresos: SYSTEM_EXTRACCION_INGRESOS,
  extracto: SYSTEM_EXTRACCION_EXTRACTO,
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

type Qvac = typeof import("@qvac/sdk");

let qvac: Qvac | null = null;
let ocrId: string | null = null;
let llmId: string | null = null;
let llmLoadMs: number | null = null;
let ocupado = false;

async function sdk(): Promise<Qvac> {
  if (qvac) return qvac;
  qvac = await import("@qvac/sdk");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@qvac/sdk/worker.mobile.bundle");
  } catch (err) {
    recordError("worker.bundle", err);
    throw err;
  }
  return qvac;
}

async function bajar(asset: unknown, onProgreso?: (p: ProgresoLectura) => void) {
  const s = await sdk();
  if (typeof s.downloadAsset !== "function") return;
  let last = -1;
  await s.downloadAsset({
    assetSrc: asset,
    onProgress: (p: { percentage?: number }) => {
      const r = Math.floor(p?.percentage ?? 0);
      if (r === last) return;
      last = r;
      onProgreso?.({ paso: "descarga", pct: r, detalle: `Bajando el lector ${r}%` });
    },
  });
}

async function asegurarOcr(onProgreso?: (p: ProgresoLectura) => void): Promise<string> {
  if (ocrId) return ocrId;
  const s = await sdk();
  const { OCR_LATIN } = await import("@qvac/sdk/models");
  onProgreso?.({ paso: "descarga", detalle: "Preparando el lector de texto" });
  await bajar(OCR_LATIN, onProgreso);
  onProgreso?.({ paso: "ocr", detalle: "Cargando el lector de texto" });
  ocrId = await s.loadModel({
    modelSrc: OCR_LATIN,
    modelType: "ggml-ocr",
    modelConfig: {
      langList: ["en"],
      magRatio: 1.5,
      defaultRotationAngles: [90, 180, 270],
      contrastRetry: false,
      lowConfidenceThreshold: 0.5,
      recognizerBatchSize: 1,
    },
  });
  return ocrId;
}

async function asegurarLlm(onProgreso?: (p: ProgresoLectura) => void): Promise<string> {
  if (llmId) return llmId;
  const s = await sdk();
  const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");
  onProgreso?.({ paso: "descarga", detalle: "Preparando MedPsy" });
  const t0 = Date.now();
  await bajar(HEALTHCARE_1_7B_MEDICAL_Q8_0, (p) => {
    onProgreso?.({ ...p, detalle: `Bajando MedPsy ${p.pct ?? 0}%` });
  });
  onProgreso?.({ paso: "extraccion", detalle: "Cargando MedPsy" });
  llmId = await s.loadModel({
    modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
    modelType: "llm",
    modelConfig: { ctx_size: CTX, device: "cpu", reasoning_budget: 0 },
  });
  llmLoadMs = Date.now() - t0;
  return llmId;
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

async function copiaTrabajo(uri: string): Promise<string> {
  try {
    const dest = new File(Paths.cache, `inaigar-doc-${Date.now()}.jpg`);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

async function ocrImagen(uri: string): Promise<{ texto: string; confianza?: number; stats: unknown }> {
  const s = await sdk();
  if (!ocrId) throw new Error("OCR no cargado");
  if (typeof s.ocr !== "function") throw new Error("Este SDK no expone ocr()");

  const correr = async (image: string | Uint8Array) => {
    const r = s.ocr({ modelId: ocrId as string, image: image as unknown as string });
    const bloques = await r.blocks;
    const stats = await r.stats;
    return { bloques, stats };
  };

  let bloques: { text: string; confidence?: number }[];
  let stats: unknown;
  try {
    const r = await correr(rutaLocal(uri));
    bloques = r.bloques;
    stats = r.stats;
  } catch (err) {
    recordError("ocr.path", err);
    const r = await correr(await bytesDe(uri));
    bloques = r.bloques;
    stats = r.stats;
  }

  const texto = bloques.map(b => b.text.trim()).filter(Boolean).join("\n");
  const confs = bloques.map(b => b.confidence).filter((c): c is number => typeof c === "number");
  const confianza = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : undefined;
  return { texto, confianza, stats };
}

async function extraerConLlm(clave: ClaveDocumento, textoOcr: string, confianzaOcr?: number) {
  const s = await sdk();
  if (!llmId) throw new Error("MedPsy no cargado");
  const t1 = Date.now();
  let first: number | null = null;
  let text = "";
  const confianza =
    typeof confianzaOcr === "number" ? `\nOCR confidence (mean): ${confianzaOcr.toFixed(2)}` : "";
  const r = s.completion({
    modelId: llmId,
    stream: true,
    generationParams: { temp: 0.1, predict: 220 },
    history: [
      { role: "system", content: SYSTEM[clave] },
      { role: "user", content: `${textoOcr}${confianza}` },
    ],
  });
  for await (const tok of r.tokenStream) {
    if (first === null) first = Date.now() - t1;
    text += tok;
  }
  const f = await r.final;
  await recordInference({
    task: "extraccion",
    model: MEDPSY,
    quant: "Q8_0",
    lora: null,
    ctx_size: CTX,
    device_cfg: "cpu",
    ttft_ms: first,
    load_ms: llmLoadMs,
    stats: f?.stats ?? {},
  });
  return text;
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

export async function leerDocumento(
  clave: ClaveDocumento,
  uri: string,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<LecturaDocumento> {
  if (ocupado) throw new Error("Ya se está leyendo otro documento.");
  ocupado = true;
  const appLog = getAppLogger();
  appLog.info(`leerDocumento ${clave}`);
  let borrada = false;
  let textoOcr = "";
  try {
    await asegurarOcr(onProgreso);
    onProgreso?.({ paso: "ocr", detalle: "Leyendo el documento" });
    const trabajo = await copiaTrabajo(uri);
    const tOcr = Date.now();
    try {
      const ocr = await ocrImagen(trabajo);
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
      textoOcr = ocr.texto;
      if (!textoOcr) {
        throw new Error("No se leyó texto. Prueba con más luz o sube otra imagen.");
      }

      const borrar = [...new Set([trabajo, uri])];
      borrada = borrar.every(borrarCopia);
      if (!borrada) appLog.info("no se pudo borrar la copia local");

      await asegurarLlm(onProgreso);
      onProgreso?.({ paso: "extraccion", detalle: "Sacando los datos" });
      const bruto = await extraerConLlm(clave, textoOcr, ocr.confianza);
      const parsed = parsearExtraccion(clave, bruto);
      return { ...parsed, textoOcr, borrada };
    } finally {
      borrarCopia(trabajo);
    }
  } finally {
    if (!borrada) borrada = borrarCopia(uri);
    ocupado = false;
  }
}

/** Libera RAM al salir de la pantalla. Los pesos siguen en caché. */
export async function soltarLectores(): Promise<void> {
  const s = qvac;
  if (!s) return;
  const ids = [ocrId, llmId];
  ocrId = null;
  llmId = null;
  llmLoadMs = null;
  for (const id of ids) {
    if (!id) continue;
    try {
      await s.unloadModel({ modelId: id, clearStorage: false });
    } catch (err) {
      recordError("unloadModel", err);
    }
  }
}
