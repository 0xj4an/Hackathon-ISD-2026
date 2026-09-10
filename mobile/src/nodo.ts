/**
 * El teléfono no habla con el banco. Habla con el nodo del pueblo, en la LAN,
 * sin internet. Ese nodo es quien envía y recibe del banco cuando él tiene
 * salida.
 *
 * Las fotos no viajan. Ni al nodo ni al banco. El OCR corre aquí; si MedPsy no
 * cabe, el LLM se puede delegar (texto, no imagen). Ver ADR-006.
 *
 * En desarrollo la IP sale de Metro (la laptop en la misma LAN). En Release,
 * `NODO_URL_DEMO`.
 */
import Constants from "expo-constants";
import type { Respuesta } from "./core/credito/motor";
import type { Solicitud } from "./core/schemas";

/** IP de la laptop en la LAN de la demo. Solo se usa si Metro no está. */
const NODO_URL_DEMO = "http://192.168.0.19:8788";

function hostDelMetro(): string | undefined {
  const uri = Constants.expoConfig?.hostUri;
  if (!uri) return;
  return uri.replace(/^\w+:\/\//, "").split(":")[0];
}

export function urlNodo(): string {
  const env = process.env.EXPO_PUBLIC_NODO_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = hostDelMetro();
  if (h && h !== "localhost" && h !== "127.0.0.1") return `http://${h}:8788`;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:8788";
  return NODO_URL_DEMO;
}

export type Envio =
  | { ok: true; respuesta: Respuesta }
  | { ok: false; enNodo: true; detalle: string }
  | { ok: false; enNodo: false; detalle: string };

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

/** Entrega al nodo del pueblo. Él se la lleva al banco. */
export async function enviarSolicitud(sol: Solicitud): Promise<Envio> {
  const nodo = urlNodo();
  const r = await pedir(`${nodo}/solicitud`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...sol, estado: "enviada" }),
  }, 8000);

  if (esFinal(r)) return { ok: true, respuesta: r };
  if (r?.decision === "pendiente") {
    return { ok: false, enNodo: true, detalle: "En el nodo del pueblo. Él se la lleva al banco." };
  }
  return { ok: false, enNodo: false, detalle: `Sin el nodo del pueblo (${nodo}).` };
}

/** Pregunta solo al nodo. El banco no le habla al teléfono. */
export async function consultarRespuesta(id: string): Promise<Respuesta | null> {
  const r = await pedir(`${urlNodo()}/respuesta/${id}`, {}, 4000);
  return esFinal(r) ? r : null;
}
