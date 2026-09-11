/**
 * Consumidor laptop: prueba delegate sin el teléfono.
 * El proveedor tiene que estar corriendo.
 *
 *   node consumidor.mjs --proveedor <64 hex>
 *   P2P_PROVEEDOR=<hex> node consumidor.mjs
 */
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1]; };
const pk = (arg("proveedor") || process.env.P2P_PROVEEDOR || "").trim().toLowerCase().replace(/^0x/, "");
if (!/^[0-9a-f]{64}$/.test(pk)) {
  console.error("Falta la clave: --proveedor <64 hex> (la imprime npm run proveedor)");
  process.exit(1);
}

const { loadModel, completion, unloadModel } = await import("@qvac/sdk");
const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");

console.log(`delegate → ${pk.slice(0, 8)}…  (primera DHT: 15–45 s)`);
const t0 = Date.now();
const modelId = await loadModel({
  modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
  modelType: "llm",
  modelConfig: { ctx_size: 2048, device: "cpu", reasoning_budget: 0 },
  delegate: { providerPublicKey: pk, timeout: 90_000, fallbackToLocal: false },
});
console.log(`loadModel ${Date.now() - t0} ms`);

const t1 = Date.now();
const r = completion({
  modelId,
  stream: true,
  generationParams: { temp: 0.1, predict: 40 },
  history: [
    { role: "system", content: "Responde en una frase, sin JSON." },
    { role: "user", content: "Di solo: par P2P listo." },
  ],
});
let text = "";
for await (const tok of r.tokenStream) text += tok;
console.log(`completion ${Date.now() - t1} ms`);
console.log(text.trim() || "(vacío)");
await unloadModel({ modelId, clearStorage: false }).catch(() => {});
if (!text.trim()) process.exit(2);
