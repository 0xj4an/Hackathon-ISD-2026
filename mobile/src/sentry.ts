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

/** Campos que nunca deben salir del teléfono hacia Sentry. */
const BLOQUEADOS = /foto|imagen|image|base64|cedula|cédula|documento|ocr|extracto|ingresos|nit|password|token|autorizacion/i;

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
          message: b.message && BLOQUEADOS.test(b.message) ? "[redacted]" : b.message,
        }));
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        const url = String(breadcrumb.data?.url ?? "");
        // No registrar cuerpos; solo host/path corto.
        if (url.includes("ingest") || url.includes("sentry")) return null;
      }
      if (breadcrumb.message && BLOQUEADOS.test(breadcrumb.message)) return null;
      return breadcrumb;
    },
    initialScope: {
      tags: {
        app: APP,
        hackathon: "isd-2026",
        platform: Platform.OS,
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

export function marcarPasoSentry(paso: string, datos?: Record<string, string | number | boolean>) {
  Sentry.addBreadcrumb({
    category: "navegacion",
    message: paso,
    level: "info",
    data: datos ? (scrub(datos) as Record<string, unknown>) : undefined,
  });
  Sentry.setTag("paso", paso);
}

/**
 * Fallo blando de transporte (pueblo/banco). No es crash: crea issue revisable
 * con modo, destino y el log técnico (sin PII de docs).
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
  Sentry.addBreadcrumb({
    category: "envio",
    level,
    message: opts.ok ? `ok:${opts.envio}` : (opts.detalle ?? "envio falló"),
    data: scrub({
      envio: opts.envio,
      pendiente: opts.pendiente ?? false,
      modo: opts.modo,
      nodo: opts.nodoHost,
    }) as Record<string, unknown>,
  });
  if (opts.ok) return;

  Sentry.withScope(scope => {
    scope.setLevel("warning");
    scope.setTag("flujo", "credito-envio");
    scope.setTag("modo", opts.modo);
    scope.setTag("envio", opts.envio ?? "ninguno");
    scope.setTag("nodo_host", opts.nodoHost);
    scope.setExtra("tecnico", opts.tecnico.slice(0, 2000));
    if (opts.detalle) scope.setExtra("detalle", opts.detalle.slice(0, 400));
    Sentry.captureMessage(
      opts.pendiente
        ? "credito: pendiente en pueblo"
        : "credito: sin banco ni nodo",
    );
  });
}

export { Sentry };
