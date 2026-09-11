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
import { demoLog, marcarVia } from "./demoLog";

function hostDe(url: string) {
  try { return new URL(url).host; } catch { return "bad-url"; }
}
import { LORA_LAB_VERSION, rutaLoraLab } from "./lora";
import { asegurarUrlNodo } from "./nodoUrl";
import { saltarMedPsyLocal } from "./modo";
import { claveProveedor } from "./p2p";
import { breadcrumbApp, marcarRuntimeSentry, reportarModeloSentry } from "./sentry";

const CTX = 2048;
const MEDPSY = "HEALTHCARE_1_7B_MEDICAL_Q8_0";
const MODELO = "MedPsy 1.7B Q8";

function trabajo(task: InferenceTask): string {
  if (task === "alerta") return "alerta";
  if (task === "extraccion") return "extraer campos";
  if (task === "ocr") return "OCR";
  return task;
}

function etiquetaModelo(conLora?: boolean): string {
  return conLora ? `${MODELO} + LoRA ${LORA_LAB_VERSION}` : MODELO;
}

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
/** Serializa loadModel: dos llamadas a la vez → MODEL_LOAD_FAILED already registered. */
let cargando: Promise<string> | null = null;

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
  const teniaLora = llmConLora;
  llmId = null;
  llmLoadMs = null;
  llmConLora = null;
  loraRutaActiva = null;
  if (!s || !id) return;
  try {
    await s.unloadModel({ modelId: id, clearStorage: false });
    reportarModeloSentry({
      paso: "unload",
      conLora: !!teniaLora,
      loraVersion: teniaLora ? LORA_LAB_VERSION : null,
    });
  } catch (err) {
    recordError("unloadModel", err);
  }
}

export async function asegurarMedPsy(
  onProgreso?: (p: ProgresoMedPsy) => void,
  opts?: { conLora?: boolean },
): Promise<string> {
  const quiereLora = !!opts?.conLora;
  if (llmId && llmConLora === quiereLora) {
    demoLog(`${etiquetaModelo(quiereLora)} ya en RAM`);
    return llmId;
  }

  if (cargando) {
    await cargando.catch(() => undefined);
    if (llmId && llmConLora === quiereLora) return llmId;
  }

  cargando = (async () => {
    if (llmId && llmConLora === quiereLora) return llmId as string;
    if (llmId) await soltarMedPsy(true);

    const s = await sdk();
    const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");
    onProgreso?.({ detalle: "Preparando MedPsy" });
    breadcrumbApp("modelo", "medpsy.prepare", { want_lora: quiereLora });
    const t0 = Date.now();
    try {
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
      demoLog(`cargando ${etiquetaModelo(!!loraPath)}…`);
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
      demoLog(`${etiquetaModelo(!!loraPath)} en RAM · ${llmLoadMs} ms`);
      marcarRuntimeSentry({ lora: llmConLora ? LORA_LAB_VERSION : null });
      reportarModeloSentry({
        paso: "load",
        conLora: !!loraPath,
        loraVersion: loraPath ? LORA_LAB_VERSION : null,
        ms: llmLoadMs,
      });
      return llmId;
    } catch (err) {
      reportarModeloSentry({
        paso: "load_fail",
        conLora: quiereLora,
        loraVersion: quiereLora ? LORA_LAB_VERSION : null,
        ms: Date.now() - t0,
        err: err instanceof Error ? err.message.slice(0, 120) : "load_fail",
      });
      throw err;
    }
  })().finally(() => {
    cargando = null;
  });

  return cargando;
}

async function completarEnNodo(opts: {
  system: string;
  user: string;
  task: InferenceTask;
  temp?: number;
  predict?: number;
  onProgreso?: (p: ProgresoMedPsy) => void;
}): Promise<string> {
  opts.onProgreso?.({ detalle: "Sin capacidad aquí. Delegando al nodo por HTTP…" });
  breadcrumbApp("inferencia", "nodo.start", { task: opts.task });
  const nodo = await asegurarUrlNodo();
  if (!nodo) throw new Error("sin pueblo en esta WiFi");
  marcarVia({ via: "pueblo", viva: true, texto: `Pueblo HTTP · ${hostDe(nodo)}` });
  demoLog(`pueblo ${hostDe(nodo)} · HTTP /inferir`);
  demoLog(`nodo corre ${MODELO} · ${trabajo(opts.task)} · ${opts.user.length} chars`);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 180_000);
  const t0 = Date.now();
  try {
    const r = await fetch(`${nodo}/inferir`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system: opts.system,
        user: opts.user,
        task: opts.task,
        temp: opts.temp ?? 0.1,
        predict: opts.predict ?? 220,
      }),
      signal: ctrl.signal,
    });
    const data = await r.json() as { text?: string; motivo?: string };
    if (!r.ok || typeof data?.text !== "string" || !data.text.trim()) {
      demoLog(`pueblo falló HTTP ${r.status} · ${Date.now() - t0} ms`);
      throw new Error(data?.motivo ?? "el nodo no respondió");
    }
    demoLog(`pueblo listo · ${data.text.length} chars · ${Date.now() - t0} ms`);
    marcarVia({ via: "pueblo", viva: false, texto: `Pueblo HTTP · ${Date.now() - t0} ms` });
    await recordInference({
      task: opts.task,
      model: MEDPSY,
      quant: "Q8_0",
      lora: null,
      ctx_size: CTX,
      device_cfg: "nodo-lan",
      ttft_ms: null,
      load_ms: Date.now() - t0,
      stats: { origen: "nodo" },
      out_chars: data.text.length,
    });
    getAppLogger().info(`${opts.task} nodo ${data.text.length} chars`);
    return data.text;
  } finally {
    clearTimeout(t);
  }
}

/** Inferencia en la laptop por llave (Hyperswarm del SDK). Sin topic. */
async function completarDelegado(opts: {
  system: string;
  user: string;
  task: InferenceTask;
  temp?: number;
  predict?: number;
  onProgreso?: (p: ProgresoMedPsy) => void;
}, pk: string): Promise<string> {
  opts.onProgreso?.({ detalle: "Buscando par P2P…" });
  marcarVia({ via: "p2p", viva: true, texto: `Buscando par P2P · ${pk.slice(0, 8)}…` });
  demoLog(`par ${pk.slice(0, 8)}… · conectando`);
  const s = await sdk();
  const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");
  const t0 = Date.now();
  const modelId = await s.loadModel({
    modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
    modelType: "llm",
    modelConfig: { ctx_size: CTX, device: "cpu", reasoning_budget: 0 },
    delegate: { providerPublicKey: pk, timeout: 90_000, fallbackToLocal: false },
  } as unknown as Parameters<Qvac["loadModel"]>[0]);
  marcarVia({ via: "p2p", viva: true, texto: "Par conectado · mandando el pedido…" });
  opts.onProgreso?.({ detalle: "Par conectado. Mandando el pedido de inferencia…" });
  demoLog(`par conectado · mandando ${trabajo(opts.task)}`);
  let first: number | null = null;
  let text = "";
  const t1 = Date.now();
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
    if (first === null) {
      first = Date.now() - t1;
      marcarVia({ via: "p2p", viva: true, texto: "Par P2P · esperando inferencia…" });
      demoLog("par generando…");
    }
    text += tok;
  }
  try { await s.unloadModel({ modelId, clearStorage: false }); } catch { /* ignore */ }
  if (!text.trim()) throw new Error("delegate vacío");
  demoLog(`par listo · ${text.length} chars · ${Date.now() - t0} ms`);
  marcarVia({ via: "p2p", viva: false, texto: `Par P2P · MedPsy · ${Date.now() - t0} ms` });
  await recordInference({
    task: opts.task,
    model: MEDPSY,
    quant: "Q8_0",
    lora: null,
    ctx_size: CTX,
    device_cfg: "p2p-delegate",
    ttft_ms: first,
    load_ms: Date.now() - t0,
    stats: { origen: "delegate" },
    out_chars: text.length,
  });
  return text;
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
      if (saltarMedPsyLocal()) {
        const pk = claveProveedor();
        demoLog(`sin capacidad aquí · ${trabajo(opts.task)}`);
        demoLog(`modelo en el nodo: ${MODELO}`);
        marcarVia({
          via: pk ? "p2p" : "pueblo",
          viva: true,
          texto: pk
            ? "Sin capacidad aquí. Delegando al nodo por P2P."
            : "Sin capacidad aquí. Delegando al nodo por HTTP.",
        });
        if (pk) {
          try { return await completarDelegado(opts, pk); }
          catch (err) {
            recordError("medpsy.delegate", err);
            demoLog(`par no respondió · paso a pueblo HTTP`);
            demoLog(err instanceof Error ? err.message.slice(0, 80) : "fail");
            marcarVia({ via: "pueblo", viva: true, texto: "Par no respondió · pueblo HTTP" });
          }
        } else {
          demoLog("sin llave P2P · pueblo HTTP");
        }
        return await completarEnNodo(opts);
      }
      marcarVia({
        via: "local",
        viva: true,
        texto: opts.conLora ? "MedPsy + LoRA en este teléfono" : "MedPsy en este teléfono",
      });
      demoLog(`${trabajo(opts.task)} en este teléfono`);
      demoLog(`modelo: ${etiquetaModelo(opts.conLora)}`);
      const s = await sdk();
      const modelId = await asegurarMedPsy(opts.onProgreso, { conLora: opts.conLora });
      const t1 = Date.now();
      let first: number | null = null;
      let text = "";
      breadcrumbApp("inferencia", "local.start", {
        task: opts.task,
        lora: opts.conLora ? LORA_LAB_VERSION : "no",
      });
      demoLog("generando…");
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
        stats: { ...(f?.stats ?? {}), lora_attached: !!loraRutaActiva },
        out_chars: text.length,
      });
      getAppLogger().info(`${opts.task} ${text.length} chars lora=${llmConLora ? LORA_LAB_VERSION : "no"}`);
      demoLog(`listo · ${text.length} chars · primer token ${first ?? "—"} ms`);
      marcarVia({
        via: "local",
        viva: false,
        texto: `Este teléfono · ${first ?? Date.now() - t1} ms`,
      });
      return text;
    } finally {
      inflight--;
    }
  } catch (err) {
    recordError("medpsy.local", err);
    breadcrumbApp("inferencia", "local.fail_fallback_nodo", {
      task: opts.task,
      err: err instanceof Error ? err.message.slice(0, 80) : "fail",
    }, "warning");
    return completarEnNodo(opts);
  }
}
