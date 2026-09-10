/**
 * Transporte del crédito. Tres vocabularios, no mezclarlos:
 *
 *   vía A / vía B     salud: historial vs foto de laboratorio
 *   camino A / B      crédito: wifi → banco; si no hay red → pueblo, y él envía
 *   inferencia        MedPsy en el teléfono; si no carga, texto al pueblo
 *
 * Camino A primero: POST al banco por wifi/datos. Camino B si A no responde:
 * el JSON queda en el pueblo (:8788) y él lo lleva al banco. Nunca fotos.
 */
import { urlBanco } from "./bancoUrl";
import { urlNodo } from "./nodoUrl";
import { Sentry } from "./sentry";
import type { Respuesta } from "./core/credito/motor";
import type { Solicitud } from "./core/schemas";

export { urlBanco };
export { urlNodo };

export type Envio =
  | { ok: true; camino: "A" | "B"; respuesta: Respuesta }
  | { ok: false; camino: "B"; pendiente: true; detalle: string }
  | { ok: false; camino: null; pendiente: false; detalle: string };

function esFinal(r: { decision?: string } | null): r is Respuesta {
  return r?.decision === "aprobada" || r?.decision === "rechazada" || r?.decision === "revision";
}

function hostDe(url: string) {
  try { return new URL(url).host; } catch { return "bad-url"; }
}

async function pedir(url: string, init: RequestInit, ms: number): Promise<Respuesta | { decision?: string; motivo?: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) {
      Sentry.addBreadcrumb({
        category: "envio",
        level: "warning",
        message: `HTTP ${r.status}`,
        data: { host: hostDe(url) },
      });
    }
    return await r.json() as Respuesta;
  } catch (err) {
    // Abort/red caída son esperados offline — no captureException.
    if (err instanceof Error && err.name !== "AbortError") {
      Sentry.addBreadcrumb({
        category: "envio",
        level: "info",
        message: err.message.slice(0, 120),
        data: { host: hostDe(url) },
      });
    }
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

/** Wifi al banco. Si no hay red, el pueblo lo envía. */
export async function enviarSolicitud(sol: Solicitud): Promise<Envio> {
  const a = await pedir(`${urlBanco()}/solicitud`, post(sol), 8000);
  if (esFinal(a)) return { ok: true, camino: "A", respuesta: a };

  const nodo = urlNodo();
  const b = await pedir(`${nodo}/solicitud`, post(sol), 8000);
  if (esFinal(b)) return { ok: true, camino: "B", respuesta: b };
  if (b?.decision === "pendiente") {
    return { ok: false, camino: "B", pendiente: true, detalle: "En el nodo del pueblo. Él se la lleva al banco." };
  }
  return { ok: false, camino: null, pendiente: false, detalle: "Sin red y sin el nodo del pueblo." };
}

/** Misma prioridad: banco remoto, luego pueblo. */
export async function consultarRespuesta(id: string): Promise<Respuesta | null> {
  const a = await pedir(`${urlBanco()}/respuesta/${id}`, {}, 4000);
  if (esFinal(a)) return a;
  const b = await pedir(`${urlNodo()}/respuesta/${id}`, {}, 4000);
  return esFinal(b) ? b : null;
}
