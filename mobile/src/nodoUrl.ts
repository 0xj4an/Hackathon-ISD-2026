/**
 * URL del nodo del pueblo (:8788). Sin IPs hardcodeadas.
 *
 * Orden: override manual → hallazgo LAN → IP de Metro → EXPO_PUBLIC_NODO_URL.
 * En la misma WiFi, la app sonda el /24 buscando /salud con servicio inaigar-pueblo.
 */
import Constants from "expo-constants";
import * as Network from "expo-network";
import {
  deleteAsync,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const PUERTO = 8788;
const ARCHIVO = "pueblo-url.txt";
const SERVICIO = "inaigar-pueblo";
const SONDEO_MS = 450;
const CONCURRENCIA = 40;

/** undefined = aún no cargó disco; null = sin override. */
let override: string | null | undefined;
/** Último pueblo hallado en la LAN (sesión). */
let hallado: string | null = null;

export type OrigenNodo = "manual" | "lan" | "metro" | "env" | "ninguno";

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
  if (hallado) return { url: hallado, origen: "lan" };
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

/** Quita el override: vuelve a LAN / Metro / env. */
export async function limpiarUrlNodo(): Promise<void> {
  override = null;
  if (!documentDirectory) return;
  try {
    await deleteAsync(`${documentDirectory}${ARCHIVO}`, { idempotent: true });
  } catch {
    /* ignore */
  }
}

async function esPueblo(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SONDEO_MS);
  try {
    const r = await fetch(`${url}/salud`, { method: "GET", signal: ctrl.signal });
    if (!r.ok) return false;
    const data = await r.json() as { servicio?: string; rol?: string; ok?: boolean };
    return data?.servicio === SERVICIO || data?.rol === "corregimiento";
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function prefijoLan(ip: string): string | null {
  const m = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  return m && esIpLan(ip) ? m[1] : null;
}

/**
 * Busca el pueblo en la misma WiFi: Metro primero, luego el /24 del teléfono.
 * No hace falta rebuild ni pegar IP al cambiar de red.
 */
export async function descubrirPuebloLan(): Promise<{ url: string; detalle: string } | null> {
  const candidatos: string[] = [];
  const metro = hostDelMetro();
  if (metro && esIpLan(metro)) candidatos.push(`http://${metro}:${PUERTO}`);

  try {
    const ip = await Network.getIpAddressAsync();
    const pref = prefijoLan(ip);
    if (pref) {
      for (let i = 1; i <= 254; i++) {
        const url = `http://${pref}.${i}:${PUERTO}`;
        if (!candidatos.includes(url)) candidatos.push(url);
      }
    }
  } catch {
    /* sin IP local: solo Metro */
  }

  if (!candidatos.length) return null;

  // Metro (y los primeros del rango) primero; el resto en paralelo acotado.
  const vistos = new Set<string>();
  let idx = 0;
  let encontrado: string | null = null;

  const worker = async () => {
    while (!encontrado && idx < candidatos.length) {
      const i = idx++;
      const url = candidatos[i];
      if (vistos.has(url)) continue;
      vistos.add(url);
      if (await esPueblo(url)) {
        encontrado = url;
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, candidatos.length) }, () => worker()));

  if (!encontrado) return null;
  hallado = encontrado;
  return { url: encontrado, detalle: "hallado en la WiFi" };
}

/** Resuelve URL: si no hay, intenta descubrir en LAN. */
export async function asegurarUrlNodo(): Promise<string> {
  const ya = urlNodo();
  if (ya) {
    if (await esPueblo(ya)) return ya;
  }
  const d = await descubrirPuebloLan();
  return d?.url ?? ya;
}

export async function probarNodo(
  url = urlNodo(),
): Promise<{ ok: boolean; detalle: string }> {
  let destino = url;
  if (!destino) {
    const d = await descubrirPuebloLan();
    if (!d) return { ok: false, detalle: "Sin pueblo en esta WiFi. ¿Corre el nodo en la laptop?" };
    destino = d.url;
  }
  try {
    const t0 = Date.now();
    const r = await fetch(`${destino}/salud`, { method: "GET" });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, detalle: `HTTP ${r.status} · ${ms}ms` };
    const data = await r.json() as { servicio?: string; rol?: string };
    if (data?.servicio !== SERVICIO && data?.rol !== "corregimiento") {
      return { ok: false, detalle: `responde pero no es el pueblo · ${ms}ms` };
    }
    hallado = destino;
    return { ok: true, detalle: `ok · ${ms}ms · ${destino}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falló";
    return { ok: false, detalle: msg };
  }
}

export function etiquetaOrigen(o: OrigenNodo): string {
  if (o === "manual") return "manual";
  if (o === "lan") return "auto (WiFi)";
  if (o === "metro") return "auto (Metro)";
  if (o === "env") return "env";
  return "sin pueblo";
}
