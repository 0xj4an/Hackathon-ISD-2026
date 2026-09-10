import { File, Paths } from "expo-file-system";
import { getLogger } from "@qvac/sdk";

export const SDK_VERSION = "0.18.2";
export const PERF_FILE = "perf.jsonl";
export const QVAC_FILE = "qvac.jsonl";

export type InferenceTask = "alerta" | "ocr" | "extraccion" | "smoke";

export type InferenceRecord = {
  ts: string;
  task: InferenceTask;
  model: string;
  quant: string;
  lora: string | null;
  sdk: string;
  ctx_size: number;
  device_cfg: string;
  ttft_ms: number | null;
  load_ms: number | null;
  stats: unknown;
  system: unknown;
};

type UiListener = (line: string) => void;

const uiListeners = new Set<UiListener>();
let writeChain: Promise<void> = Promise.resolve();
let unsubscribeServer: (() => void) | null = null;
let cachedSystem: unknown = null;
let errorHandlerInstalled = false;

const appLog = getLogger("app", {
  level: "info",
  enableConsole: true,
  transports: [
    (level, namespace, message) => {
      void appendJson(QVAC_FILE, {
        ts: new Date().toISOString(),
        kind: "app",
        level,
        namespace,
        message,
      });
      emitUi(`${level} ${namespace} ${message}`);
    },
  ],
});

export function logPath(name: string): string {
  return new File(Paths.document, name).uri;
}

export function subscribeUi(listener: UiListener): () => void {
  uiListeners.add(listener);
  return () => {
    uiListeners.delete(listener);
  };
}

export function getAppLogger() {
  return appLog;
}

export function installErrorHandler() {
  if (errorHandlerInstalled) return;
  errorHandlerInstalled = true;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    recordError(isFatal ? "fatal" : "js", error);
    previous?.(error, isFatal);
  });
}

export async function attachQvacLogs(): Promise<void> {
  const { subscribeServerLogs, getSystemResources } = await import("@qvac/sdk");
  cachedSystem = await getSystemResources().catch((err: unknown) => {
    recordError("getSystemResources", err);
    return null;
  });
  if (unsubscribeServer) return;
  unsubscribeServer = subscribeServerLogs((log) => {
    void appendJson(QVAC_FILE, {
      ts: new Date(log.timestamp).toISOString(),
      kind: "qvac",
      id: log.id,
      level: log.level,
      namespace: log.namespace,
      message: log.message,
    });
    emitUi(`qvac ${log.level} ${log.namespace}: ${truncate(log.message, 180)}`);
  });
}

export function recordError(where: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  void appendJson(QVAC_FILE, {
    ts: new Date().toISOString(),
    kind: "error",
    where,
    message,
    stack,
  });
  emitUi(`ERROR ${where}: ${message}`);
}

export async function recordInference(
  rec: Omit<InferenceRecord, "ts" | "sdk" | "system"> & { system?: unknown },
): Promise<void> {
  const line: InferenceRecord = {
    ts: new Date().toISOString(),
    sdk: SDK_VERSION,
    system: rec.system ?? cachedSystem,
    ...rec,
  };
  await appendJson(PERF_FILE, line);
  emitUi(
    `perf ${rec.task} ttft=${rec.ttft_ms ?? "—"}ms load=${rec.load_ms ?? "—"}ms device=${rec.device_cfg}`,
  );
}

function emitUi(line: string) {
  const stamped = `${new Date().toISOString().slice(11, 19)} ${line}`;
  for (const listener of uiListeners) listener(stamped);
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

function appendJson(name: string, rec: unknown): Promise<void> {
  writeChain = writeChain
    .then(() => {
      const file = new File(Paths.document, name);
      if (!file.exists) file.create();
      const prev = file.exists ? file.textSync() : "";
      file.write(`${prev}${JSON.stringify(rec)}\n`);
    })
    .catch((err: unknown) => {
      console.warn("log write failed", err);
    });
  return writeChain;
}
