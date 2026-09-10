/**
 * URL del nodo del pueblo (:8788). Sin IPs hardcodeadas.
 *
 * Orden: override manual (demo) → IP LAN de Metro → EXPO_PUBLIC_NODO_URL.
 * Si Expo y el nodo corren en la misma laptop en LAN, Metro basta.
 */
import Constants from "expo-constants";
import {
  deleteAsync,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const PUERTO = 8788;
const ARCHIVO = "pueblo-url.txt";

/** undefined = aún no cargó disco; null = sin override. */
let override: string | null | undefined;

export type OrigenNodo = "manual" | "metro" | "env" | "ninguno";

function esIpLan(host: string): boolean {
  return (
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
  );
}

function hostDelMetro(): string | undefined {
  const uri = Constants.expoConfig?.hostUri;
  if (!uri) return;
  return uri.replace(/^\w+:\/\//, "").split(":")[0];
}

/** Acepta URL completa o solo host / host:puerto. */
export function normalizarPueblo(raw: string): string | null {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+(:\d+)?$/.test(t)) {
    const host = t.includes(":") ? t : `${t}:${PUERTO}`;
    return `http://${host}`;
  }
  return null;
}

export function resolverNodo(): { url: string; origen: OrigenNodo } {
  if (override) return { url: override, origen: "manual" };
  const h = hostDelMetro();
  if (h && esIpLan(h)) return { url: `http://${h}:${PUERTO}`, origen: "metro" };
  const env = process.env.EXPO_PUBLIC_NODO_URL?.replace(/\/$/, "");
  if (env) return { url: env, origen: "env" };
  return { url: "", origen: "ninguno" };
}

export function urlNodo(): string {
  return resolverNodo().url;
}

export async function cargarUrlNodo(): Promise<void> {
  try {
    if (!documentDirectory) {
      override = null;
      return;
    }
    const raw = await readAsStringAsync(`${documentDirectory}${ARCHIVO}`);
    override = normalizarPueblo(raw);
  } catch {
    override = null;
  }
}

export async function fijarUrlNodo(raw: string): Promise<string | null> {
  const n = normalizarPueblo(raw);
  if (!n) return null;
  override = n;
  if (documentDirectory) {
    await writeAsStringAsync(`${documentDirectory}${ARCHIVO}`, n);
  }
  return n;
}

/** Quita el override: vuelve a Metro / env. */
export async function limpiarUrlNodo(): Promise<void> {
  override = null;
  if (!documentDirectory) return;
  try {
    await deleteAsync(`${documentDirectory}${ARCHIVO}`, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function probarNodo(
  url = urlNodo(),
): Promise<{ ok: boolean; detalle: string }> {
  if (!url) return { ok: false, detalle: "Sin URL del pueblo (activa Metro en LAN o escribe la IP)." };
  try {
    const t0 = Date.now();
    const r = await fetch(`${url}/salud`, { method: "GET" });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, detalle: `HTTP ${r.status} · ${ms}ms` };
    return { ok: true, detalle: `ok · ${ms}ms` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falló";
    return { ok: false, detalle: msg };
  }
}

export function etiquetaOrigen(o: OrigenNodo): string {
  if (o === "manual") return "manual";
  if (o === "metro") return "auto (Metro)";
  if (o === "env") return "env";
  return "sin pueblo";
}
