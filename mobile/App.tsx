// Smoke test: MedPsy 1.7B en el dispositivo → primer token. Si esto corre en el Android, el resto es UI.
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, StyleSheet } from "react-native";
import { loadModel, completion, unloadModel, getSystemResources } from "@qvac/sdk";
import { HEALTHCARE_1_7B_MEDICAL_Q8_0 } from "@qvac/sdk/models";

const SYSTEM = "Eres un asistente de salud comunitaria en Panamá. Responde en español, en 2 frases, sin diagnosticar.";

export default function App() {
  const [log, setLog] = useState<string[]>(["arrancando…"]);
  const [out, setOut] = useState("");
  const add = (s: string) => setLog((l) => [...l, `${new Date().toISOString().slice(11, 19)} ${s}`]);

  useEffect(() => {
    let modelId: string | undefined;
    (async () => {
      try {
        const res = await getSystemResources().catch(() => null);
        if (res) add(`recursos: ${JSON.stringify(res).slice(0, 160)}`);
        const t0 = Date.now(); let last = -1;
        modelId = await loadModel({
          modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0, modelType: "llm",
          modelConfig: { ctx_size: 2048, device: "gpu", reasoning_budget: 0 },
          onProgress: (p: any) => { const r = Math.floor(p?.percentage ?? 0); if (r !== last && r % 10 === 0) { last = r; add(`descarga ${r}%`); } },
        });
        add(`modelo cargado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        const t1 = Date.now(); let first: number | null = null; let n = 0; let text = "";
        const r = completion({ modelId, stream: true, generationParams: { temp: 0.2, predict: 80 },
          history: [{ role: "system", content: SYSTEM }, { role: "user", content: "Mi glucosa en ayunas salió 132 tres días seguidos. ¿Qué me recomiendas?" }] });
        for await (const tok of r.tokenStream) { if (first === null) first = Date.now() - t1; n++; text += tok; setOut(text); }
        const f = await r.final;
        add(`TTFT ${first} ms · ${n} tokens · ${JSON.stringify(f?.stats ?? {}).slice(0, 200)}`);
      } catch (e: any) { add(`ERROR: ${e?.message ?? e}`); }
    })();
    return () => { if (modelId) unloadModel({ modelId }).catch(() => {}); };
  }, []);

  return (
    <SafeAreaView style={s.c}>
      <ScrollView>
        <Text style={s.h}>Smoke test · MedPsy 1.7B Q8_0 on-device</Text>
        {log.map((l, i) => <Text key={i} style={s.l}>{l}</Text>)}
        <Text style={s.o}>{out}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ c: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: "#fff" }, h: { fontWeight: "700", fontSize: 16, marginBottom: 8 }, l: { fontFamily: "monospace", fontSize: 11, color: "#444" }, o: { marginTop: 12, fontSize: 16 } });
