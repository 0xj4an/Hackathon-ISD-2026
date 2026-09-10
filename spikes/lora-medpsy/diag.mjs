import { loadModel, completion, unloadModel, close, HEALTHCARE_1_7B_MEDICAL_Q8_0 } from "@qvac/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const limpiar = (s) => { let t = s.replace(/<think>[\s\S]*?<\/think>/g,"").replace(/<\/?think>/g,"").replace(/```json|```/g,"").trim();
  const a=t.indexOf("{"), b=t.lastIndexOf("}"); return a>=0&&b>a?t.slice(a,b+1):t; };
const casos = readFileSync("lora-medpsy/eval.jsonl","utf8").split("\n").filter(Boolean).map(JSON.parse)
  .filter(c => !c.messages[0].content.includes("cedula de identidad") && !c.messages[0].content.includes("documento de ingresos") && !c.messages[0].content.includes("estado de cuenta")).slice(0,5);
const lora = process.argv[2] === "lora";
const id = await loadModel({ modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0, modelType:"llm",
  modelConfig:{ ctx_size:2048, reasoning_budget:0, ...(lora?{lora:resolve("lora-medpsy/out/trained-lora-adapter.gguf")}:{}) } });
console.log(`\n########## ${lora ? "CON LORA" : "BASE"} ##########`);
for (const c of casos) {
  const esp = JSON.parse(c.messages[2].content);
  const r = completion({ modelId:id, history:[c.messages[0],c.messages[1]], stream:false, generationParams:{temp:0,predict:200} });
  const f = await r.final;
  let got=null; try { got = JSON.parse(limpiar((f.contentText??"").trim())); } catch {}
  console.log("\n  ENTRADA: " + JSON.stringify(c.messages[1].content.slice(0,110)));
  console.log("  ESPERADO:", JSON.stringify(esp));
  console.log("  OBTENIDO:", got ? JSON.stringify(got) : "NO PARSEA -> " + JSON.stringify((f.contentText??"").slice(0,120)));
  if (got) {
    const malos = Object.keys(esp).filter(k => {
      const a=got[k], b=esp[k];
      return typeof b === "number" ? !(typeof a==="number" && Math.abs(a-b)<0.01)
        : String(a??"").trim().toLowerCase() !== String(b).trim().toLowerCase();
    });
    console.log("  FALLA EN:", malos.join(", ") || "nada");
  }
}
await unloadModel({modelId:id}); await close(); process.exit(0);
