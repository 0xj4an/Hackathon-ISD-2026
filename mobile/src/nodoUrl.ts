/**
 * URL del nodo del pueblo (:8788). Sin IPs hardcodeadas.
 *
 * Orden: override manual → hallazgo LAN → IP de Metro → EXPO_PUBLIC_NODO_URL.
 * En la misma WiFi, la app sonda el /24 buscando /salud del corregimiento.
 */
import Constants from "expo-constants";
import * as Network from "expo-network";
import { NetworkStateType } from "expo-network";
import {
  deleteAsync,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const PUERTO = 8788;
const ARCHIVO = "pueblo-url.txt";
const SERVICIO = "inaigar-pueblo";
const SONDEO_MS = 400;
const CONCURRENCIA = 48;

/** undefined = aún no cargó disco; null = sin override. */
let override: string | null | undefined;
/** Último pueblo hallado en la LAN (sesión). */
let hallado: string | null = null;
/** Evita dos barridos LAN a la vez. */
let barrido: Promise<{ url: string; detalle: string } | null> | null = null;

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
  const host = uri.replace(/^\w+:\/\//, "").split(":")[0];
  if (!host || host.includes("exp.direct") || host.includes("exp.host")) return;
  return host;
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

/** Quita override y hallazgo de sesión. */
export async function limpiarUrlNodo(): Promise<void> {
  override = null;
  hallado = null;
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
    const data = await r.json() as { servicio?: string; rol?: string };
    return data?.servicio === SERVICIO || data?.rol === "corregimiento";
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function prefijoLan(ip: string): string | null {
  if (!ip || ip === "0.0.0.0" || ip.startsWith("127.")) return null;
  const m = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  return m && esIpLan(ip) ? m[1] : null;
}

function ordenarHosts(pref: string, propios: string[]): string[] {
  const prioridad = new Set([1, 19, 20, 100, 101, 254]);
  const outs: string[] = [];
  for (const h of propios) {
    if (!outs.includes(h)) outs.push(h);
  }
  for (const n of [...prioridad].sort((a, b) => a - b)) {
    const h = `${pref}.${n}`;
    if (!outs.includes(h)) outs.push(h);
  }
  for (let i = 1; i <= 254; i++) {
    const h = `${pref}.${i}`;
    if (!outs.includes(h)) outs.push(h);
  }
  return outs;
}

/**
 * Busca el pueblo en la misma WiFi: Metro primero, luego el /24 del teléfono.
 */
export async function descubrirPuebloLan(): Promise<{ url: string; detalle: string } | null> {
  if (barrido) return barrido;
  barrido = (async () => {
    const candidatos: string[] = [];
    const metro = hostDelMetro();
    if (metro && esIpLan(metro)) candidatos.push(`http://${metro}:${PUERTO}`);

    try {
      const estado = await Network.getNetworkStateAsync();
      const enLan =
        estado.type === NetworkStateType.WIFI
        || estado.type === NetworkStateType.VPN
        || estado.type === NetworkStateType.UNKNOWN;
      if (enLan) {
        const ip = await Network.getIpAddressAsync();
        const pref = prefijoLan(ip) || (metro ? prefijoLan(metro) : null);
        if (pref) {
          const propios = [
            ...(metro && metro.startsWith(`${pref}.`) ? [metro] : []),
            ...(ip && ip.startsWith(`${pref}.`) ? [ip] : []),
          ];
          for (const h of ordenarHosts(pref, propios)) {
            const url = `http://${h}:${PUERTO}`;
            if (!candidatos.includes(url)) candidatos.push(url);
          }
        }
      } else if (metro && prefijoLan(metro)) {
        const pref = prefijoLan(metro)!;
        for (const h of ordenarHosts(pref, [metro])) {
          const url = `http://${h}:${PUERTO}`;
          if (!candidatos.includes(url)) candidatos.push(url);
        }
      }
    } catch {
      if (metro && prefijoLan(metro)) {
        const pref = prefijoLan(metro)!;
        for (const h of ordenarHosts(pref, [metro])) {
          const url = `http://${h}:${PUERTO}`;
          if (!candidatos.includes(url)) candidatos.push(url);
        }
      }
    }

    if (!candidatos.length) return null;

    let idx = 0;
    let encontrado: string | null = null;

    const worker = async () => {
      while (!encontrado && idx < candidatos.length) {
        const i = idx++;
        const url = candidatos[i];
        if (await esPueblo(url)) {
          encontrado = url;
          return;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCIA, candidatos.length) }, () => worker()),
    );

    if (!encontrado) return null;
    hallado = encontrado;
    return { url: encontrado, detalle: "hallado en la WiFi" };
  })();

  try {
    return await barrido;
  } finally {
    barrido = null;
  }
}

/** Resuelve URL viva del pueblo; si la actual murió, vuelve a barrer la LAN. */
export async function asegurarUrlNodo(): Promise<string> {
  const ya = urlNodo();
  if (ya && await esPueblo(ya)) return ya;
  if (ya && hallado === ya) hallado = null;
  const d = await descubrirPuebloLan();
  return d?.url ?? "";
}

export async function probarNodo(
  url?: string,
): Promise<{ ok: boolean; detalle: string }> {
  let destino = url?.trim() ? normalizarPueblo(url) : urlNodo();
  if (destino && !(await esPueblo(destino))) destino = null;

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
