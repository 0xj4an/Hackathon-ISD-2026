// Vuelve a medir base y adaptador con el puntuador corregido, sin reentrenar.
// Reusa el adaptador que ya existe en out/.
import { loadModel, completion, unloadModel, close, HEALTHCARE_1_7B_MEDICAL_Q8_0 } from "@qvac/sdk";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const DIR = resolve(import.meta.dirname);
const ADAPTADOR = resolve(DIR, "out/trained-lora-adapter.gguf");
if (!existsSync(ADAPTADOR)) { console.log("no hay adaptador en out/"); process.exit(1); }

const limpiarJson = (s) => { let t = s.replace(/<think>[\s\S]*?<\/think>/g,"").replace(/<\/?think>/g,"").replace(/```json|```/g,"").trim();
  const a=t.indexOf("{"), b=t.lastIndexOf("}"); return a>=0&&b>a?t.slice(a,b+1):t; };
const NO_SE_PUNTUA = new Set(["confianza"]);
const comoNumero = (v) => { if (typeof v==="number") return v; if (typeof v!=="string") return NaN;
  const n=Number(v.replace(/[^0-9.-]/g,"")); return Number.isFinite(n)?n:NaN; };
function puntuar(esperado, crudo) {
  let obj=null; try { obj=JSON.parse(limpiarJson(crudo)); } catch {}
  if (obj===null||typeof obj!=="object") return { valido:false, campos:0, total:0 };
  const claves = Object.keys(esperado).filter(k=>!NO_SE_PUNTUA.has(k));
  let ok=0;
  for (const k of claves) { const a=obj[k], b=esperado[k];
    if (typeof b==="number") { if (Math.abs(comoNumero(a)-b)<0.01) ok++; }
    else if (String(a??"").trim().toLowerCase()===String(b).trim().toLowerCase()) ok++; }
  return { valido:true, campos:ok, total:claves.length };
}
const tareaDe = (c) => { const s=c.messages[0].content;
  if (s.includes("cedula de identidad")) return "cedula";
  if (s.includes("documento de ingresos")) return "ingresos";
  if (s.includes("estado de cuenta")) return "extracto"; return "triaje"; };
const TAREAS = ["cedula","ingresos","extracto","triaje"];
const CASOS = readFileSync(resolve(DIR,"eval.jsonl"),"utf8").split("\n").filter(Boolean).map(JSON.parse);

async function medir(etiqueta, extra) {
  const id = await loadModel({ modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0, modelType:"llm",
    modelConfig:{ ctx_size:2048, reasoning_budget:0, ...extra } });
  const acc = Object.fromEntries(TAREAS.map(t=>[t,{n:0,validos:0,campos:0,total:0}]));
  for (const c of CASOS) {
    const t = tareaDe(c), esp = JSON.parse(c.messages[2].content);
    const r = completion({ modelId:id, history:[c.messages[0],c.messages[1]], stream:false, generationParams:{temp:0,predict:220} });
    const p = puntuar(esp, ((await r.final).contentText ?? "").trim());
    const a = acc[t]; a.n++; a.validos += p.valido?1:0; a.campos += p.campos; a.total += p.total;
  }
  await unloadModel({ modelId:id });
  for (const a of Object.values(acc)) { a.pctValido = a.n?Math.round(a.validos/a.n*100):0; a.pctCampos = a.total?Math.round(a.campos/a.total*100):0; }
  console.log(`  ${etiqueta}: ` + TAREAS.map(t=>`${t} ${acc[t].pctValido}%/${acc[t].pctCampos}%`).join("  "));
  return acc;
}
console.log("Remedicion con el puntuador corregido (sin confianza, numeros como cadena valen)\n");
const base = await medir("BASE", {});
const lora = await medir("LORA", { lora: ADAPTADOR });
console.log("\n| Tarea | JSON base | JSON LoRA | Campos base | Campos LoRA |");
console.log("| --- | --- | --- | --- | --- |");
for (const t of TAREAS) console.log(`| ${t} | ${base[t].pctValido}% | ${lora[t].pctValido}% | ${base[t].pctCampos}% | ${lora[t].pctCampos}% |`);
const ag = (o) => { let v=0,n=0,c=0,tt=0; for (const t of TAREAS) { v+=o[t].validos; n+=o[t].n; c+=o[t].campos; tt+=o[t].total; }
  return { pv: Math.round(v/n*100), pc: Math.round(c/tt*100) }; };
const b=ag(base), l=ag(lora);
console.log(`| **total** | **${b.pv}%** | **${l.pv}%** | **${b.pc}%** | **${l.pc}%** |`);
writeFileSync(resolve(DIR,"out/remedicion.json"), JSON.stringify({ base, lora, agregado:{ base:b, lora:l } }, null, 2));
await close(); process.exit(0);
