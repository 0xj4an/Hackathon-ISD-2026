/**
 * Un solo MedPsy en RAM. Lo usan la alerta y la extracción de documentos.
 *
 * Primero el teléfono. Si el modelo no carga o no completa, el texto (nunca
 * la foto) va al nodo del pueblo. OCR vive aparte: detector y LLM a la vez
 * se quedan sin grafo.
 *
 * El LoRA de lab es opcional y reemplazable (`lora.ts`). Solo el examen de laboratorio lo pide.
 */
import { getAppLogger, recordError, recordInference, type InferenceTask } from "./perf/logger";
import { LORA_LAB_VERSION, rutaLoraLab } from "./lora";
import { urlNodo } from "./nodoUrl";
import { saltarMedPsyLocal } from "./modo";

const CTX = 2048;
const MEDPSY = "HEALTHCARE_1_7B_MEDICAL_Q8_0";

type Qvac = typeof import("@qvac/sdk");
type OrigenAsset = Parameters<NonNullable<Qvac["downloadAsset"]>>[0]["assetSrc"];

export type ProgresoMedPsy = { pct?: number; detalle: string };

let qvac: Qvac | null = null;
let llmId: string | null = null;
let llmLoadMs: number | null = null;
/** Qué modo tiene el modelo en RAM. Null = nada cargado. */
let llmConLora: boolean | null = null;
let loraRutaActiva: string | null = null;
let inflight = 0;

export async function sdk(): Promise<Qvac> {
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

export async function bajar(
  asset: OrigenAsset,
  onProgreso?: (p: ProgresoMedPsy) => void,
) {
  const s = await sdk();
  if (typeof s.downloadAsset !== "function") return;
  let last = -1;
  await s.downloadAsset({
    assetSrc: asset,
    onProgress: (p: { percentage?: number }) => {
      const r = Math.floor(p?.percentage ?? 0);
      if (r === last) return;
      last = r;
      onProgreso?.({ pct: r, detalle: `Bajando ${r}%` });
    },
  });
}

export async function soltarMedPsy(force = false): Promise<void> {
  if (!force && inflight > 0) return;
  const s = qvac;
  const id = llmId;
  llmId = null;
  llmLoadMs = null;
  llmConLora = null;
  loraRutaActiva = null;
  if (!s || !id) return;
  try {
    await s.unloadModel({ modelId: id, clearStorage: false });
  } catch (err) {
    recordError("unloadModel", err);
  }
}

export async function asegurarMedPsy(
  onProgreso?: (p: ProgresoMedPsy) => void,
  opts?: { conLora?: boolean },
): Promise<string> {
  const quiereLora = !!opts?.conLora;
  if (llmId && llmConLora === quiereLora) return llmId;
  if (llmId) await soltarMedPsy(true);

  const s = await sdk();
  const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");
  onProgreso?.({ detalle: "Preparando MedPsy" });
  const t0 = Date.now();
  await bajar(HEALTHCARE_1_7B_MEDICAL_Q8_0, (p) => {
    onProgreso?.({ ...p, detalle: `Bajando MedPsy ${p.pct ?? 0}%` });
  });

  let loraPath: string | null = null;
  if (quiereLora) {
    onProgreso?.({ detalle: `Preparando LoRA ${LORA_LAB_VERSION}` });
    loraPath = await rutaLoraLab();
    if (!loraPath) {
      onProgreso?.({ detalle: "Sin LoRA en disco; MedPsy base" });
    }
  }

  onProgreso?.({ detalle: loraPath ? `Cargando MedPsy + ${LORA_LAB_VERSION}` : "Cargando MedPsy" });
  llmId = await s.loadModel({
    modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
    modelType: "llm",
    modelConfig: {
      ctx_size: CTX,
      device: "cpu",
      reasoning_budget: 0,
      ...(loraPath ? { lora: loraPath } : {}),
    },
  });
  llmLoadMs = Date.now() - t0;
  llmConLora = !!loraPath;
  loraRutaActiva = loraPath;
  return llmId;
}

async function completarEnNodo(opts: {
  system: string;
  user: string;
  task: InferenceTask;
  temp?: number;
  predict?: number;
  onProgreso?: (p: ProgresoMedPsy) => void;
}): Promise<string> {
  opts.onProgreso?.({ detalle: "El teléfono no pudo. Pidiendo al nodo del pueblo…" });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const r = await fetch(`${urlNodo()}/inferir`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system: opts.system,
        user: opts.user,
        temp: opts.temp ?? 0.1,
        predict: opts.predict ?? 220,
      }),
      signal: ctrl.signal,
    });
    const data = await r.json() as { text?: string; motivo?: string };
    if (!r.ok || typeof data?.text !== "string" || !data.text.trim()) {
      throw new Error(data?.motivo ?? "el nodo no respondió");
    }
    await recordInference({
      task: opts.task,
      model: MEDPSY,
      quant: "Q8_0",
      lora: null,
      ctx_size: CTX,
      device_cfg: "nodo-lan",
      ttft_ms: null,
      load_ms: null,
      stats: { origen: "nodo" },
    });
    getAppLogger().info(`${opts.task} nodo ${data.text.length} chars`);
    return data.text;
  } finally {
    clearTimeout(t);
  }
}

export async function completarMedPsy(opts: {
  system: string;
  user: string;
  task: InferenceTask;
  temp?: number;
  predict?: number;
  conLora?: boolean;
  onProgreso?: (p: ProgresoMedPsy) => void;
}): Promise<string> {
  try {
    inflight++;
    try {
      if (saltarMedPsyLocal()) return await completarEnNodo(opts);
      const s = await sdk();
      const modelId = await asegurarMedPsy(opts.onProgreso, { conLora: opts.conLora });
      const t1 = Date.now();
      let first: number | null = null;
      let text = "";
      const r = s.completion({
        modelId,
        stream: true,
        generationParams: { temp: opts.temp ?? 0.1, predict: opts.predict ?? 220 },
        history: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      for await (const tok of r.tokenStream) {
        if (first === null) first = Date.now() - t1;
        text += tok;
      }
      const f = await r.final;
      await recordInference({
        task: opts.task,
        model: MEDPSY,
        quant: "Q8_0",
        lora: llmConLora ? LORA_LAB_VERSION : null,
        ctx_size: CTX,
        device_cfg: "cpu",
        ttft_ms: first,
        load_ms: llmLoadMs,
        stats: { ...(f?.stats ?? {}), lora_path: loraRutaActiva },
      });
      getAppLogger().info(`${opts.task} ${text.length} chars lora=${llmConLora ? LORA_LAB_VERSION : "no"}`);
      return text;
    } finally {
      inflight--;
    }
  } catch (err) {
    recordError("medpsy.local", err);
    return completarEnNodo(opts);
  }
}
