/**
 * Pedido de inferencia al pueblo. Solo texto. Si llega una imagen, se rechaza:
 * las fotos no salen del teléfono (`ADR-006`).
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const MODELO = "MedPsy 1.7B Q8";

function trabajo(task) {
  if (task === "alerta") return "alerta";
  if (task === "extraccion") return "extraer campos";
  if (task === "ocr") return "OCR";
  return task || "inferencia";
}

export function aceptarPedido(body) {
  if (!body || typeof body !== "object") throw new Error("pedido vacio");
  if (body.image != null || body.foto != null || body.foto_b64 != null || body.imagen != null) {
    throw new Error("el pueblo no recibe fotos ni imagenes");
  }
  if (typeof body.system !== "string" || !body.system.trim()) throw new Error("falta system");
  if (typeof body.user !== "string" || !body.user.trim()) throw new Error("falta user");
  const temp = typeof body.temp === "number" ? body.temp : 0.1;
  const predict = typeof body.predict === "number" ? body.predict : 220;
  const task = typeof body.task === "string" ? body.task : null;
  const lora = typeof body.lora === "string" && body.lora ? body.lora : null;
  return { system: body.system, user: body.user, temp, predict, task, lora };
}

const require = createRequire(import.meta.url);
let modeloId = null;

function resolver(id) {
  try {
    return require.resolve(id);
  } catch {
    return require.resolve(id, { paths: [new URL("../spikes", import.meta.url).pathname] });
  }
}

async function sdk() {
  return import(pathToFileURL(resolver("@qvac/sdk")).href);
}

/** MedPsy en esta laptop. La primera llamada carga el modelo. */
export async function inferir(body, onPaso) {
  const paso = (msg) => {
    if (typeof onPaso === "function") onPaso(msg);
  };
  const p = aceptarPedido(body);
  const que = trabajo(p.task);
  const modelo = p.lora ? `${MODELO} + LoRA ${p.lora}` : MODELO;
  if (p.lora) paso(`LoRA ${p.lora} · fine-tuning de laboratorio`);
  paso(`pedido: ${que} · ${p.user.length} chars · sin foto`);
  paso(`modelo: ${modelo}`);
  const qvac = await sdk();
  if (!modeloId) {
    paso(`cargando ${modelo} en esta laptop…`);
    const t0 = Date.now();
    modeloId = await qvac.loadModel({
      modelSrc: qvac.HEALTHCARE_1_7B_MEDICAL_Q8_0,
      modelType: "llm",
      modelConfig: { ctx_size: 2048, device: "cpu", reasoning_budget: 0 },
    });
    paso(`${MODELO} en RAM · ${Date.now() - t0} ms`);
  } else {
    paso(`${MODELO} ya en RAM`);
  }
  paso(p.lora ? `generando ${que} con LoRA ${p.lora}…` : `generando ${que}…`);
  const t1 = Date.now();
  const r = qvac.completion({
    modelId: modeloId,
    stream: true,
    generationParams: { temp: p.temp, predict: p.predict },
    history: [
      { role: "system", content: p.system },
      { role: "user", content: p.user },
    ],
  });
  let text = "";
  for await (const tok of r.tokenStream) text += tok;
  paso(`listo · ${text.length} chars · ${Date.now() - t1} ms`);
  return { text, origen: "nodo" };
}
