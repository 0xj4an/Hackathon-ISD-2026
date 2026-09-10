// Block 0 smoke: MedPsy 1.7B on device until the first token.
// Isolated from Ina Igar. To use it, import this from App.tsx.
import { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import {
  attachQvacLogs,
  getAppLogger,
  installErrorHandler,
  logPath,
  PERF_FILE,
  QVAC_FILE,
  recordError,
  recordInference,
  subscribeUi,
} from "./perf/logger";

const SYSTEM =
  "You are a community health assistant. Reply in English, in 2 sentences, without diagnosing.";
const MODEL = "HEALTHCARE_1_7B_MEDICAL_Q8_0";
const QUANT = "Q8_0";
const CTX = 2048;

type Status = "idle" | "running" | "done" | "error";

export default function SmokeTest() {
  const [log, setLog] = useState<string[]>([
    "UI ready. QVAC worker not started.",
    "Keep this app open. Closing it pauses the 2.1 GB download.",
    `Logs: ${logPath(PERF_FILE)}`,
    `      ${logPath(QVAC_FILE)}`,
  ]);
  const [out, setOut] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [pct, setPct] = useState<number | null>(null);
  const add = (s: string) => setLog((l) => [...l, s]);

  useEffect(() => {
    installErrorHandler();
    const off = subscribeUi(add);
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        add("App left foreground. QVAC will suspend the download.");
      }
    });
    return () => {
      off();
      sub.remove();
    };
  }, []);

  async function runSmoke(deviceCfg: "cpu" | "gpu") {
    if (status === "running") return;
    setStatus("running");
    setOut("");
    setPct(null);
    const appLog = getAppLogger();
    appLog.info(`smoke start device=${deviceCfg}`);

    try {
      add("1/5 importing @qvac/sdk…");
      const qvac = await import("@qvac/sdk");
      const { HEALTHCARE_1_7B_MEDICAL_Q8_0 } = await import("@qvac/sdk/models");
      add("2/5 SDK imported. Checking worker.mobile.bundle…");
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@qvac/sdk/worker.mobile.bundle");
        add("2b/5 bundle OK.");
      } catch (bundleErr: unknown) {
        const msg =
          bundleErr instanceof Error ? bundleErr.message : String(bundleErr);
        add(`2b/5 missing worker.mobile.bundle: ${msg}`);
        throw bundleErr;
      }

      const t0 = Date.now();
      let last = -1;
      const onProgress = (p: { percentage?: number }) => {
        const r = Math.floor(p?.percentage ?? 0);
        if (r !== last) {
          last = r;
          setPct(r);
          if (r % 5 === 0) appLog.info(`download ${r}%`);
        }
      };

      add("3/5 downloadAsset (resumes from QVAC cache if present)…");
      if (typeof qvac.getModelInfo === "function") {
        try {
          const info = await qvac.getModelInfo({
            modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
          });
          add(`cache: ${JSON.stringify(info).slice(0, 220)}`);
        } catch (err: unknown) {
          recordError("getModelInfo", err);
        }
      }
      if (typeof qvac.downloadAsset === "function") {
        await qvac.downloadAsset({
          assetSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
          onProgress,
        });
      }

      add("4/5 loadModel from disk…");
      const modelId = await qvac.loadModel({
        modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
        modelType: "llm",
        modelConfig: { ctx_size: CTX, device: deviceCfg, reasoning_budget: 0 },
        onProgress,
      });
      const loadMs = Date.now() - t0;
      appLog.info(`model ready in ${(loadMs / 1000).toFixed(1)}s`);
      await attachQvacLogs().catch((err: unknown) =>
        recordError("attachQvacLogs", err),
      );

      add("5/5 completion (English)…");
      const t1 = Date.now();
      let first: number | null = null;
      let n = 0;
      let text = "";
      const r = qvac.completion({
        modelId,
        stream: true,
        generationParams: { temp: 0.2, predict: 80 },
        history: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              "Fasting glucose was 132 three days in a row. What do you recommend?",
          },
        ],
      });
      for await (const tok of r.tokenStream) {
        if (first === null) first = Date.now() - t1;
        n++;
        text += tok;
        setOut(text);
      }
      const f = await r.final;
      await recordInference({
        task: "smoke",
        model: MODEL,
        quant: QUANT,
        lora: null,
        ctx_size: CTX,
        device_cfg: deviceCfg,
        ttft_ms: first,
        load_ms: loadMs,
        stats: f?.stats ?? {},
      });
      appLog.info(`TTFT ${first} ms · ${n} tokens`);
      setStatus("done");
    } catch (e: unknown) {
      recordError("smoke", e);
      setStatus("error");
    }
  }

  return (
    <SafeAreaView style={s.c}>
      <ScrollView>
        <Text style={s.h}>Smoke test · MedPsy 1.7B Q8_0</Text>
        <Text style={s.hint}>
          Keep the app open. QVAC pauses on background. Re-open and tap again
          to resume from cache. Model replies in English.
        </Text>
        {pct != null && (
          <Text style={s.pct}>
            Download {pct}%{pct < 100 ? " · keep the app open" : ""}
          </Text>
        )}
        <Pressable
          style={[s.btn, status === "running" && s.btnOff]}
          disabled={status === "running"}
          onPress={() => void runSmoke("cpu")}
        >
          <Text style={s.btnT}>
            {status === "running" ? "Working…" : "Load MedPsy (CPU)"}
          </Text>
        </Pressable>
        {log.map((l, i) => (
          <Text key={i} style={s.l}>
            {l}
          </Text>
        ))}
        <Text style={s.o}>{out}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: "#fff" },
  h: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  hint: { color: "#555", marginBottom: 12, fontSize: 13, lineHeight: 18 },
  pct: { fontWeight: "700", fontSize: 22, marginBottom: 12 },
  btn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  btnOff: { opacity: 0.5 },
  btnT: { color: "#fff", fontWeight: "600", textAlign: "center" },
  l: { fontFamily: "monospace", fontSize: 11, color: "#444" },
  o: { marginTop: 12, fontSize: 16 },
});
