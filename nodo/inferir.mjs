/**
 * Pedido de inferencia al pueblo. Solo texto. Si llega una imagen, se rechaza:
 * las fotos no salen del teléfono (`ADR-006`).
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export function aceptarPedido(body) {
  if (!body || typeof body !== "object") throw new Error("pedido vacio");
  if (body.image != null || body.foto != null || body.foto_b64 != null || body.imagen != null) {
    throw new Error("el pueblo no recibe fotos ni imagenes");
  }
  if (typeof body.system !== "string" || !body.system.trim()) throw new Error("falta system");
  if (typeof body.user !== "string" || !body.user.trim()) throw new Error("falta user");
  const temp = typeof body.temp === "number" ? body.temp : 0.1;
  const predict = typeof body.predict === "number" ? body.predict : 220;
  return { system: body.system, user: body.user, temp, predict };
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
export async function inferir(body) {
  const p = aceptarPedido(body);
  const qvac = await sdk();
  if (!modeloId) {
    modeloId = await qvac.loadModel({
      modelSrc: qvac.HEALTHCARE_1_7B_MEDICAL_Q8_0,
      modelType: "llm",
      modelConfig: { ctx_size: 2048, device: "cpu", reasoning_budget: 0 },
    });
  }
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
  return { text, origen: "nodo" };
}
