import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";

const DSN =
  "https://f0fa21d5e86f121f6900b1a131703422@o4512063261179904.ingest.us.sentry.io/4512063272648704";

const APP = "isd-hackathon-mobile";
const VERSION = Constants.expoConfig?.version ?? "0.0.0";
const BUILD =
  Platform.OS === "ios"
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode;
const RELEASE = BUILD ? `${APP}@${VERSION}+${BUILD}` : `${APP}@${VERSION}`;

/** Campos/valores que nunca deben salir del teléfono hacia Sentry. */
const BLOQUEADOS = /foto|imagen|image|base64|cedula|cédula|documento|extracto|ingresos|nit|password|token|autorizacion/i;

/** Categorías ya saneadas (sin PII en message/data). */
const SAFE_BC = new Set([
  "lectura",
  "modelo",
  "lora",
  "inferencia",
  "envio",
  "sesion",
  "navegacion",
  "alerta",
  "nodo",
]);

/** Códigos cortos de doc — sin palabras bloqueadas en breadcrumbs. */
export type DocKindSentry = "id" | "work" | "bank" | "lab" | "other";

export function docKindSentry(clave: string): DocKindSentry {
  if (clave === "cedula") return "id";
  if (clave === "ingresos") return "work";
  if (clave === "extracto") return "bank";
  if (clave === "examen" || clave === "lab") return "lab";
  return "other";
}

type DatoPlano = Record<string, string | number | boolean | null | undefined>;

function scrub(valor: unknown, profundidad = 0): unknown {
  if (profundidad > 4 || valor == null) return valor;
  if (typeof valor === "string") {
    if (valor.length > 400 && /^[A-Za-z0-9+/=]+$/.test(valor)) return "[redacted-blob]";
    if (BLOQUEADOS.test(valor) && valor.length > 80) return "[redacted]";
    return valor;
  }
  if (Array.isArray(valor)) return valor.slice(0, 20).map(v => scrub(v, profundidad + 1));
  if (typeof valor === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      out[k] = BLOQUEADOS.test(k) ? "[redacted]" : scrub(v, profundidad + 1);
    }
    return out;
  }
  return valor;
}

function plano(data?: DatoPlano): Record<string, string | number | boolean> | undefined {
  if (!data) return undefined;
  const limpio: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    limpio[k] = v;
  }
  return Object.keys(limpio).length ? limpio : undefined;
}

export function iniciarSentry() {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    release: RELEASE,
    dist: BUILD != null ? String(BUILD) : undefined,
    sendDefaultPii: false,
    enableLogs: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    beforeSend(event) {
      if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => ({
          ...b,
          data: b.data ? (scrub(b.data) as Record<string, unknown>) : b.data,
          message:
            b.message && BLOQUEADOS.test(b.message) && !SAFE_BC.has(b.category ?? "")
              ? "[redacted]"
              : b.message,
        }));
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        const url = String(breadcrumb.data?.url ?? "");
        if (url.includes("ingest") || url.includes("sentry")) return null;
      }
      if (SAFE_BC.has(breadcrumb.category ?? "")) return breadcrumb;
      if (breadcrumb.message && BLOQUEADOS.test(breadcrumb.message)) return null;
      return breadcrumb;
    },
    initialScope: {
      tags: {
        app: APP,
        hackathon: "isd-2026",
        platform: Platform.OS,
        release_tag: RELEASE,
      },
    },
  });
}

/** Correo solo como id opaco de demo — no PII completa. */
export function marcarUsuarioSentry(correo: string | null | undefined) {
  if (!correo) {
    Sentry.setUser(null);
    return;
  }
  const id = correo.trim().toLowerCase();
  Sentry.setUser({ id, username: id.split("@")[0] || id });
}

export function marcarRuntimeSentry(opts: {
  modo?: string;
  sdk?: string;
  lora?: string | null;
}) {
  if (opts.modo) Sentry.setTag("modo", opts.modo);
  if (opts.sdk) Sentry.setTag("sdk", opts.sdk);
  if (opts.lora !== undefined) Sentry.setTag("lora", opts.lora ?? "none");
}

export function marcarPasoSentry(paso: string, datos?: Record<string, string | number | boolean>) {
  breadcrumbApp("navegacion", paso, datos);
  Sentry.setTag("paso", paso);
}

/** Breadcrumb genérico (categorías SAFE_BC). */
export function breadcrumbApp(
  category: string,
  message: string,
  data?: DatoPlano,
  level: "info" | "warning" | "error" = "info",
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: plano(data),
  });
}

export function breadcrumbLectura(
  paso: string,
  data?: DatoPlano,
  level: "info" | "warning" | "error" = "info",
) {
  breadcrumbApp("lectura", paso, data, level);
}

function emitir(mensaje: string, opts: {
  level: "info" | "warning" | "error";
  flujo: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}) {
  Sentry.withScope(scope => {
    scope.setLevel(opts.level);
    scope.setTag("flujo", opts.flujo);
    if (opts.tags) {
      for (const [k, v] of Object.entries(opts.tags)) scope.setTag(k, v);
    }
    if (opts.extra) {
      for (const [k, v] of Object.entries(opts.extra)) {
        scope.setExtra(k, scrub(v));
      }
    }
    Sentry.captureMessage(mensaje);
  });
}

/** Arranque de sesión: un evento por cold start. */
export function reportarSesionSentry(opts: {
  modo: string;
  sdk: string;
  colaPendiente?: boolean;
}) {
  marcarRuntimeSentry({ modo: opts.modo, sdk: opts.sdk });
  breadcrumbApp("sesion", "start", {
    modo: opts.modo,
    sdk: opts.sdk,
    cola: !!opts.colaPendiente,
    build: BUILD != null ? String(BUILD) : "dev",
  });
  emitir(`sesion: start ${opts.modo}`, {
    level: "info",
    flujo: "sesion",
    tags: { modo: opts.modo, sdk: opts.sdk },
    extra: { colaPendiente: !!opts.colaPendiente, release: RELEASE },
  });
}

/** Carga / unload de MedPsy (± LoRA). */
export function reportarModeloSentry(opts: {
  paso: "load" | "unload" | "load_fail";
  conLora: boolean;
  loraVersion?: string | null;
  ms?: number;
  err?: string;
}) {
  const level = opts.paso === "load_fail" ? "error" : "info";
  breadcrumbApp("modelo", `medpsy.${opts.paso}`, {
    lora: opts.conLora ? (opts.loraVersion ?? "yes") : "no",
    ms: opts.ms ?? -1,
    err: opts.err ?? undefined,
  }, level);
  if (opts.paso === "load" || opts.paso === "load_fail") {
    emitir(
      opts.paso === "load"
        ? `modelo: medpsy load${opts.conLora ? `+${opts.loraVersion ?? "lora"}` : ""}`
        : `modelo: medpsy load_fail`,
      {
        level,
        flujo: "modelo",
        tags: {
          lora: opts.conLora ? (opts.loraVersion ?? "yes") : "none",
        },
        extra: { ms: opts.ms ?? null, err: opts.err ?? null },
      },
    );
  }
}

/** Resolución del asset LoRA en disco. */
export function reportarLoraSentry(opts: {
  ok: boolean;
  version: string;
  via: "cache" | "copy" | "miss";
  bytes?: number;
  err?: string;
}) {
  breadcrumbApp("lora", opts.ok ? `ok.${opts.via}` : "miss", {
    version: opts.version,
    bytes: opts.bytes ?? -1,
    err: opts.err ?? undefined,
  }, opts.ok ? "info" : "warning");
  emitir(opts.ok ? `lora: ${opts.version} ${opts.via}` : `lora: miss ${opts.version}`, {
    level: opts.ok ? "info" : "warning",
    flujo: "lora",
    tags: { lora: opts.version, via: opts.via },
    extra: { bytes: opts.bytes ?? null, err: opts.err ?? null },
  });
}

/** Una corrida de inferencia (local, OCR o nodo). Sin texto. */
export function reportarInferenciaSentry(opts: {
  task: string;
  model: string;
  lora: string | null;
  device: string;
  ttft_ms: number | null;
  load_ms: number | null;
  out_chars?: number;
}) {
  breadcrumbApp("inferencia", `${opts.task}.${opts.device}`, {
    model: opts.model,
    lora: opts.lora ?? "none",
    ttft: opts.ttft_ms ?? -1,
    load: opts.load_ms ?? -1,
    chars: opts.out_chars ?? -1,
  });
  emitir(`inferencia: ${opts.task} @${opts.device}`, {
    level: "info",
    flujo: "inferencia",
    tags: {
      task: opts.task,
      device: opts.device,
      lora: opts.lora ?? "none",
    },
    extra: {
      model: opts.model,
      ttft_ms: opts.ttft_ms,
      load_ms: opts.load_ms,
      out_chars: opts.out_chars ?? null,
    },
  });
}

export function reportarAlertaSentry(opts: {
  ok: boolean;
  motivoCode?: string;
  ms?: number;
}) {
  breadcrumbApp("alerta", opts.ok ? "ok" : "fail", {
    ms: opts.ms ?? -1,
    err: opts.motivoCode ?? undefined,
  }, opts.ok ? "info" : "warning");
  emitir(opts.ok ? "alerta: ok" : `alerta: fail`, {
    level: opts.ok ? "info" : "warning",
    flujo: "alerta",
    tags: { alerta_ok: String(opts.ok) },
    extra: { motivo: opts.motivoCode ?? null, ms: opts.ms ?? null },
  });
}

export function reportarNodoSentry(opts: {
  ok: boolean;
  origen: string;
  ms?: number;
}) {
  breadcrumbApp("nodo", opts.ok ? "hallado" : "miss", {
    origen: opts.origen,
    ms: opts.ms ?? -1,
  }, opts.ok ? "info" : "warning");
  if (!opts.ok) {
    emitir("nodo: no hallado en LAN", {
      level: "warning",
      flujo: "nodo",
      tags: { origen: opts.origen },
    });
  }
}

/**
 * Fallo blando de transporte (pueblo/banco). También OK para auditar Release.
 */
export function reportarEnvioSentry(opts: {
  ok: boolean;
  envio: "banco" | "pueblo" | null;
  pendiente?: boolean;
  detalle?: string;
  tecnico: string;
  modo: string;
  nodoHost: string;
}) {
  const level = opts.ok ? "info" : "warning";
  breadcrumbApp(
    "envio",
    opts.ok ? `ok:${opts.envio}` : (opts.detalle ?? "envio falló"),
    {
      envio: opts.envio ?? "ninguno",
      pendiente: opts.pendiente ?? false,
      modo: opts.modo,
      nodo: opts.nodoHost,
    },
    level,
  );

  emitir(
    opts.ok
      ? `credito: ok via ${opts.envio}`
      : opts.pendiente
        ? "credito: pendiente en pueblo"
        : "credito: sin banco ni nodo",
    {
      level,
      flujo: "credito-envio",
      tags: {
        modo: opts.modo,
        envio: opts.envio ?? "ninguno",
        nodo_host: opts.nodoHost || "none",
      },
      extra: {
        tecnico: opts.tecnico.slice(0, 2000),
        detalle: opts.detalle?.slice(0, 400) ?? null,
        pendiente: opts.pendiente ?? false,
      },
    },
  );
}

/**
 * Resumen de un lote: ok/fail por kind, ms, chars (no el texto).
 */
export function reportarLoteLecturaSentry(opts: {
  resultados: Array<{
    kind: DocKindSentry;
    ok: boolean;
    chars?: number;
    ms?: number;
    borrada?: boolean;
    errorCode?: string;
  }>;
  msTotal: number;
}) {
  const okN = opts.resultados.filter(r => r.ok).length;
  const failN = opts.resultados.length - okN;
  breadcrumbLectura("lote.fin", {
    n: opts.resultados.length,
    ok: okN,
    fail: failN,
    ms: opts.msTotal,
  }, failN ? "warning" : "info");

  emitir(
    failN > 0
      ? `lectura: ${failN}/${opts.resultados.length} fallaron`
      : `lectura: ok ${okN}/${opts.resultados.length}`,
    {
      level: failN > 0 ? "warning" : "info",
      flujo: "lectura-docs",
      tags: {
        lectura_ok: String(okN),
        lectura_fail: String(failN),
      },
      extra: {
        msTotal: opts.msTotal,
        docs: opts.resultados.map(r => ({
          kind: r.kind,
          ok: r.ok,
          chars: r.chars ?? 0,
          ms: r.ms ?? 0,
          borrada: r.borrada ?? false,
          err: r.errorCode ?? null,
        })),
      },
    },
  );
}

export { Sentry };
