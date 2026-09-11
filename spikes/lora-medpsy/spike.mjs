// Spike LoRA en el dispositivo. Codigo propio del equipo.
//
// Mide el modelo base sobre el set de evaluacion, entrena un adaptador LoRA,
// vuelve a medir con el adaptador puesto, e imprime la tabla antes/despues.
//
// El set de evaluacion (eval.jsonl) NO se usa para entrenar: sale del mismo
// generador pero queda apartado, asi que la comparacion es honesta.
//
// Uso:  node lora-medpsy/spike.mjs
//       EPOCHS=1 node lora-medpsy/spike.mjs      (corrida rapida)
//
// Requiere haber corrido antes make-dataset.mjs.

import {
  loadModel, completion, unloadModel, finetune, getModelInfo, close,
  HEALTHCARE_1_7B_MEDICAL_Q8_0,
} from "@qvac/sdk";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(import.meta.dirname);
const OUT = resolve(DIR, "out");
mkdirSync(OUT, { recursive: true });

const EPOCHS = Number(process.env.EPOCHS || 1);
const SKIP_TRAIN = process.env.SKIP_TRAIN === "1";
/** Un informe con 5 marcadores no cabe en 220 tokens: el JSON sale cortado. */
const PREDICT = Number(process.env.PREDICT || 512);
const t0 = Date.now();
const ts = () => `[${((Date.now() - t0) / 1000).toFixed(0)}s]`;

// Misma limpieza que usa la app en core/prompts.ts: el modelo fuga <think>
// aunque reasoning_budget sea 0, y sin quitarlo el JSON.parse revienta.
const limpiarJson = (s) => {
  let t = s.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "");
  t = t.replace(/```json|```/g, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
};

const CASOS = readFileSync(resolve(DIR, "eval.jsonl"), "utf8")
  .split("\n").filter(Boolean).map(JSON.parse);

/**
 * Cuatro tareas, no dos. Clasificar por "cedula de identidad" metia ingresos y
 * extracto en el balde de triaje, y la tabla salia mintiendo sobre que midio.
 */
const tareaDe = (c) => {
  const s = c.messages[0].content;
  if (s.includes("cedula de identidad")) return "cedula";
  if (s.includes("documento de ingresos")) return "ingresos";
  if (s.includes("estado de cuenta")) return "extracto";
  return "laboratorio";
};
const TAREAS = ["cedula", "ingresos", "extracto", "laboratorio"];

/**
 * Campos que NO se puntuan, y por que.
 *
 * `confianza` es imposible de acertar: el valor esperado lo genera
 * `make-dataset.mjs` como `0.95 - capas*0.18 + azar*0.05`, con un termino
 * aleatorio que no esta en el texto de entrada. Pedirle al modelo que lo adivine
 * y contarlo como fallo regalaba una quinta parte de la nota en cada caso, y
 * castigaba igual al base y al adaptador. Se sigue pidiendo en el JSON porque la
 * app lo usa, pero no se mide.
 */
const NO_SE_PUNTUA = new Set(["confianza"]);

/**
 * Numero escrito como cadena es acierto. El modelo devuelve "620.00" donde se
 * espera 620: el valor es correcto y el unico problema es el tipo. Medirlo como
 * fallo confunde un defecto de formato con uno de lectura, que es justo lo que
 * el LoRA deberia arreglar. El esquema de la app ya coacciona el tipo.
 */
const comoNumero = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(",", ".").replace(/[^0-9.eE+-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Un informe de laboratorio devuelve un ARREGLO de lecturas, y compararlo como
 * texto seria todo o nada: un marcador mal y los cinco cuentan como fallo. Se
 * puntua marcador por marcador, emparejando por `codigo`, que es la pregunta
 * que importa: cuantos leyo bien.
 */
function puntuarLecturas(esperadas, obtenidas) {
  const total = esperadas.length;
  if (!Array.isArray(obtenidas)) return { ok: 0, total };
  const porCodigo = new Map(
    obtenidas.filter((l) => l && typeof l === "object").map((l) => [String(l.codigo ?? "").toUpperCase(), l]));
  let ok = 0;
  for (const e of esperadas) {
    const g = porCodigo.get(String(e.codigo).toUpperCase());
    if (g && Math.abs(comoNumero(g.valor) - e.valor) < 0.01) ok++;
  }
  return { ok, total };
}

/** Compara el JSON del modelo contra el esperado, campo por campo. */
function puntuar(esperado, crudo) {
  let obj = null;
  try { obj = JSON.parse(limpiarJson(crudo)); } catch { /* JSON invalido */ }
  if (obj === null || typeof obj !== "object") return { valido: false, campos: 0, total: 0 };
  const claves = Object.keys(esperado).filter((k) => !NO_SE_PUNTUA.has(k));
  let ok = 0;
  let total = 0;
  for (const k of claves) {
    const a = obj[k], b = esperado[k];
    if (Array.isArray(b)) {
      const r = puntuarLecturas(b, a);
      ok += r.ok; total += r.total;      // cada lectura pesa como un campo
    } else if (typeof b === "number") {
      total++; if (Math.abs(comoNumero(a) - b) < 0.01) ok++;
    } else {
      total++; if (String(a ?? "").trim().toLowerCase() === String(b).trim().toLowerCase()) ok++;
    }
  }
  return { valido: true, campos: ok, total };
}

async function medir(etiqueta, modelConfigExtra) {
  const modelId = await loadModel({
    modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
    modelType: "llm",
    modelConfig: { ctx_size: 2048, reasoning_budget: 0, ...modelConfigExtra },
  });
  console.log(`\n${ts()} === MIDIENDO: ${etiqueta} ===`);

  const acc = Object.fromEntries(
    TAREAS.map((t) => [t, { n: 0, validos: 0, campos: 0, total: 0 }]));

  for (const caso of CASOS) {
    const tarea = tareaDe(caso);
    const esperado = JSON.parse(caso.messages[2].content);
    const r = completion({
      modelId,
      history: [caso.messages[0], caso.messages[1]],
      stream: false,
      generationParams: { temp: 0, predict: PREDICT },
    });
    const final = await r.final;
    const p = puntuar(esperado, (final.contentText ?? "").trim());
    const a = acc[tarea];
    a.n++; a.validos += p.valido ? 1 : 0; a.campos += p.campos; a.total += p.total;
  }

  await unloadModel({ modelId });

  for (const [k, a] of Object.entries(acc)) {
    a.pctValido = a.n ? Math.round((a.validos / a.n) * 100) : 0;
    a.pctCampos = a.total ? Math.round((a.campos / a.total) * 100) : 0;
    console.log(`${ts()} ${etiqueta} · ${k}: ${a.validos}/${a.n} JSON valido (${a.pctValido}%), ${a.pctCampos}% de campos correctos`);
  }
  return acc;
}

// ---------------------------------------------------------------- 0) entorno
const info = await getModelInfo({ name: "HEALTHCARE_1_7B_MEDICAL_Q8_0" });
console.log(`${ts()} modelo: quant=${info.quantization} params=${info.params} cacheado=${info.isCached}`);
console.log(`${ts()} casos de evaluacion: ${CASOS.length} (` +
  TAREAS.map((t) => `${CASOS.filter((c) => tareaDe(c) === t).length} ${t}`).join(", ") + ")");

// ---------------------------------------------------------------- 1) base
const base = await medir("BASE (sin adaptador)", {});

// ---------------------------------------------------------------- 2) entrenar
let segundos = Number(process.env.TRAIN_SECS || 0);
if (!SKIP_TRAIN) {
  const ftId = await loadModel({
    modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
    modelType: "llm",
    modelConfig: { ctx_size: 2048 },
  });
  console.log(`\n${ts()} === ENTRENANDO ${EPOCHS} epoca(s) ===`);
  const tEntrena = Date.now();
  const handle = finetune({
    modelId: ftId,
    options: {
      trainDatasetDir: resolve(DIR, "train.jsonl"), // lab-only; ver make-dataset.mjs
      validation: { type: "dataset", path: resolve(DIR, "eval.jsonl") },
      outputParametersDir: OUT,
      checkpointSaveDir: resolve(OUT, "ckpt"),
      numberOfEpochs: EPOCHS,
      learningRate: Number(process.env.LR || 2e-5),
      lrMin: 1e-8,
      contextLength: 1024,
      loraRank: 8,
      loraAlpha: 16,
      assistantLossOnly: true,
      loraModules: "attn_q,attn_k,attn_v,attn_o,ffn_gate,ffn_up,ffn_down",
    },
  });

  let ultimaEpoca = -1, pasos = 0;
  for await (const p of handle.progressStream) {
    pasos++;
    if (p.current_epoch !== ultimaEpoca || pasos % 20 === 0) {
      ultimaEpoca = p.current_epoch;
      console.log(`${ts()} ${p.is_train ? "train" : "val"} epoca ${p.current_epoch} lote ${p.current_batch}/${p.total_batches} loss ${p.loss?.toFixed?.(3)} eta ${(p.eta_ms / 1000).toFixed(0)}s`);
    }
  }
  const res = await handle.result;
  segundos = (Date.now() - tEntrena) / 1000;
  console.log(`${ts()} finetune ${res.status} en ${segundos.toFixed(0)}s (${(segundos / EPOCHS).toFixed(0)}s por epoca)`);
  await unloadModel({ modelId: ftId });
} else {
  console.log(`\n${ts()} SKIP_TRAIN: sin finetune, se mide el .gguf ya escrito`);
}

const ggufs = readdirSync(OUT).filter((f) => f.endsWith(".gguf"))
  .map((f) => {
    const st = statSync(resolve(OUT, f));
    return { f, mb: +(st.size / 1048576).toFixed(1), mtime: st.mtimeMs };
  })
  .sort((a, b) => b.mtime - a.mtime);
if (ggufs.length === 0) { console.log("__SIN_ADAPTADOR__"); await close(); process.exit(1); }
const adaptador = process.env.ADAPTER
  ? (ggufs.find((g) => g.f === process.env.ADAPTER) ?? ggufs[0])
  : ggufs[0];
console.log(`${ts()} adaptador: ${adaptador.f} (${adaptador.mb} MB)`);

// ---------------------------------------------------------------- 3) con LoRA
const conLora = await medir(`LoRA (${adaptador.f})`, { lora: resolve(OUT, adaptador.f) });

// ---------------------------------------------------------------- 4) tabla
const fila = (t) => {
  const b = base[t], l = conLora[t];
  if (!b.n) return `| ${t} | sin casos | | | |`;
  return `| ${t} | ${b.pctValido}% | ${l.pctValido}% | ${b.pctCampos}% | ${l.pctCampos}% |`;
};
const tabla = [
  "| Tarea | JSON valido base | JSON valido LoRA | Campos base | Campos LoRA |",
  "| --- | --- | --- | --- | --- |",
  ...TAREAS.map(fila),
].join("\n");

console.log(`\n${ts()} RESUMEN\n${tabla}`);
writeFileSync(resolve(OUT, "resultados.json"), JSON.stringify({
  epocas: EPOCHS,
  segundosEntrenamiento: Math.round(segundos),
  adaptadorMB: adaptador.mb,
  casosEvaluacion: CASOS.length,
  base, conLora,
}, null, 2));
console.log(`${ts()} numeros crudos en out/resultados.json`);
console.log("__SPIKE_LISTO__");
await close();
process.exit(0);
