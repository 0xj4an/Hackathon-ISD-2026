/**
 * Transporte del crédito. Tres vocabularios, no mezclarlos:
 *
 *   vía A / vía B     salud: historial vs foto de laboratorio
 *   camino A / B      crédito: Railway vs LAN→pueblo (esta laptop)
 *   QVAC `delegate`   prestar cómputo del modelo; no elige este camino
 *
 * Camino B primero: el teléfono deja el JSON en el pueblo (:8788, esta laptop).
 * Camino A si el pueblo no está: POST al banco en Railway. El motor corre
 * solo en el banco. Si A va primero, con wifi la laptop nunca se entera.
 */
import Constants from "expo-constants";
import { urlBanco } from "./bancoUrl";
import type { Respuesta } from "./core/credito/motor";
import type { Solicitud } from "./core/schemas";

export { urlBanco };

const NODO_URL_DEMO = "http://192.168.0.19:8788";

function hostDelMetro(): string | undefined {
  const uri = Constants.expoConfig?.hostUri;
  if (!uri) return;
  return uri.replace(/^\w+:\/\//, "").split(":")[0];
}

/** Nodo del pueblo, LAN, camino B. */
export function urlNodo(): string {
  const env = process.env.EXPO_PUBLIC_NODO_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = hostDelMetro();
  if (h && h !== "localhost" && h !== "127.0.0.1") return `http://${h}:8788`;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:8788";
  return NODO_URL_DEMO;
}

export type Envio =
  | { ok: true; camino: "A" | "B"; respuesta: Respuesta }
  | { ok: false; camino: "B"; pendiente: true; detalle: string }
  | { ok: false; camino: null; pendiente: false; detalle: string };

function esFinal(r: { decision?: string } | null): r is Respuesta {
  return r?.decision === "aprobada" || r?.decision === "rechazada" || r?.decision === "revision";
}

async function pedir(url: string, init: RequestInit, ms: number): Promise<Respuesta | { decision: string; motivo?: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return await r.json() as Respuesta;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function post(sol: Solicitud) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...sol, estado: "enviada" }),
  };
}

/** Pueblo primero (laptop). Banco remoto solo si el pueblo no responde. */
export async function enviarSolicitud(sol: Solicitud): Promise<Envio> {
  const nodo = urlNodo();
  const b = await pedir(`${nodo}/solicitud`, post(sol), 5000);
  if (esFinal(b)) return { ok: true, camino: "B", respuesta: b };
  if (b?.decision === "pendiente") {
    return { ok: false, camino: "B", pendiente: true, detalle: "En el nodo del pueblo. Él se la lleva al banco." };
  }

  const a = await pedir(`${urlBanco()}/solicitud`, post(sol), 8000);
  if (esFinal(a)) return { ok: true, camino: "A", respuesta: a };
  return { ok: false, camino: null, pendiente: false, detalle: "Sin el nodo del pueblo y sin red al banco." };
}

/** Misma prioridad: pueblo, luego banco remoto. */
export async function consultarRespuesta(id: string): Promise<Respuesta | null> {
  const b = await pedir(`${urlNodo()}/respuesta/${id}`, {}, 3000);
  if (esFinal(b)) return b;
  const a = await pedir(`${urlBanco()}/respuesta/${id}`, {}, 4000);
  return esFinal(a) ? a : null;
}
