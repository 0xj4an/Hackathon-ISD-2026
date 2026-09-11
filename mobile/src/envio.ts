/**
 * Transporte del crédito.
 *
 *   local-wifi: intenta banco, luego pueblo.
 *   *-offline: solo pueblo / pendiente.
 * Inferencia (MedPsy /inferir) es otra tubería. Nunca fotos.
 */
import { urlBanco } from "./bancoUrl";
import { asegurarUrlNodo, urlNodo } from "./nodoUrl";
import { reportarEnvioSentry, Sentry } from "./sentry";
import { modo, sinWifiDemo } from "./modo";
import type { Respuesta } from "./core/credito/motor";
import type { Solicitud } from "./core/schemas";

export { urlBanco };
export { urlNodo };

export type Envio =
  | { ok: true; envio: "banco" | "pueblo"; respuesta: Respuesta; tecnico: string }
  | { ok: false; envio: "pueblo"; pendiente: true; detalle: string; tecnico: string }
  | { ok: false; envio: null; pendiente: false; detalle: string; tecnico: string };

export function hostDe(url: string) {
  try { return new URL(url).host; } catch { return "bad-url"; }
}

function esFinal(r: { decision?: string } | null): r is Respuesta {
  return r?.decision === "aprobada" || r?.decision === "rechazada" || r?.decision === "revision";
}

type Pedido = {
  url: string;
  ms: number;
  http?: number;
  body: Respuesta | { decision?: string; motivo?: string } | null;
  error?: string;
};

async function pedir(url: string, init: RequestInit, ms: number): Promise<Pedido> {
  const t0 = Date.now();
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
    let body: Pedido["body"] = null;
    try {
      body = await r.json() as Pedido["body"];
    } catch (err) {
      return {
        url, ms: Date.now() - t0, http: r.status, body: null,
        error: err instanceof Error ? `JSON: ${err.message}` : "JSON inválido",
      };
    }
    return { url, ms: Date.now() - t0, http: r.status, body };
  } catch (err) {
    const msg = err instanceof Error
      ? (err.name === "AbortError" ? `timeout ${ms}ms` : err.message)
      : String(err);
    if (err instanceof Error && err.name !== "AbortError") {
      Sentry.addBreadcrumb({
        category: "envio",
        level: "info",
        message: msg.slice(0, 120),
        data: { host: hostDe(url) },
      });
    }
    return { url, ms: Date.now() - t0, body: null, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function post(sol: Solicitud, via: "telefono" | "pueblo") {
  return {
    method: "POST" as const,
    headers: {
      "content-type": "application/json",
      "x-via": via,
    },
    body: JSON.stringify({ ...sol, estado: "enviada" }),
  };
}

function lineaPedido(tag: string, p: Pedido): string {
  const partes = [`${tag} ${p.url}`, `${p.ms}ms`];
  if (p.http != null) partes.push(`HTTP ${p.http}`);
  if (p.error) partes.push(`err=${p.error}`);
  if (p.body && "decision" in p.body && p.body.decision) {
    partes.push(`decision=${p.body.decision}`);
  }
  return partes.join(" · ");
}

function armarTecnico(solId: string, lineas: string[]): string {
  return [
    `ts ${new Date().toISOString()}`,
    `modo ${modo()}`,
    `solicitud ${solId}`,
    `sinWifiDemo ${sinWifiDemo()}`,
    ...lineas,
  ].join("\n");
}

/** POST al banco remoto. */
export async function intentarBanco(sol: Solicitud): Promise<{
  ok: true; respuesta: Respuesta; tecnico: string; linea: string;
} | {
  ok: false; linea: string;
}> {
  const a = await pedir(`${urlBanco()}/solicitud`, post(sol, "telefono"), 8000);
  const linea = lineaPedido("banco", a);
  if (esFinal(a.body)) {
    const tecnico = armarTecnico(sol.id, [linea]);
    reportarEnvioSentry({
      ok: true, envio: "banco", tecnico, modo: modo(), nodoHost: hostDe(urlNodo()),
    });
    return { ok: true, respuesta: a.body, tecnico, linea };
  }
  return { ok: false, linea };
}

/** POST al nodo del pueblo (URL ya resuelta). */
export async function intentarPueblo(sol: Solicitud, nodo: string): Promise<Envio> {
  const b = await pedir(`${nodo}/solicitud`, post(sol, "telefono"), 8000);
  const linea = lineaPedido("pueblo", b);
  const tecnico = armarTecnico(sol.id, [
    sinWifiDemo() ? "banco omitido (modo offline)" : "banco sin decisión final",
    linea,
  ]);
  const nodoHost = hostDe(nodo);

  if (esFinal(b.body)) {
    reportarEnvioSentry({
      ok: true, envio: "pueblo", tecnico, modo: modo(), nodoHost,
    });
    return { ok: true, envio: "pueblo", respuesta: b.body, tecnico };
  }
  if (b.body?.decision === "pendiente") {
    const detalle = "En el nodo del pueblo. Él se la lleva al banco.";
    reportarEnvioSentry({
      ok: false, envio: "pueblo", pendiente: true, detalle, tecnico, modo: modo(), nodoHost,
    });
    return { ok: false, envio: "pueblo", pendiente: true, tecnico, detalle };
  }
  const detalle = `Sin red y sin el nodo del pueblo (${nodo}).`;
  reportarEnvioSentry({
    ok: false, envio: null, pendiente: false, detalle, tecnico, modo: modo(), nodoHost,
  });
  return { ok: false, envio: null, pendiente: false, tecnico, detalle };
}

/** Wifi al banco. Si no hay red, el pueblo lo envía. */
export async function enviarSolicitud(sol: Solicitud): Promise<Envio> {
  const lineas: string[] = [];

  if (!sinWifiDemo()) {
    const a = await intentarBanco(sol);
    lineas.push(a.linea);
    if (a.ok) return { ok: true, envio: "banco", respuesta: a.respuesta, tecnico: a.tecnico };
  } else {
    lineas.push("banco omitido (modo offline)");
  }

  const nodo = await asegurarUrlNodo();
  if (!nodo) {
    lineas.push("pueblo sin URL (no hay nodo en esta WiFi)");
    const tecnico = armarTecnico(sol.id, lineas);
    const detalle = "Sin red y sin el nodo del pueblo (no aparece en esta WiFi).";
    reportarEnvioSentry({
      ok: false, envio: null, pendiente: false, detalle, tecnico, modo: modo(), nodoHost: "",
    });
    return { ok: false, envio: null, pendiente: false, tecnico, detalle };
  }
  return intentarPueblo(sol, nodo);
}

/** Misma prioridad: banco remoto, luego pueblo. */
export async function consultarRespuesta(id: string): Promise<Respuesta | null> {
  if (!sinWifiDemo()) {
    const a = await pedir(`${urlBanco()}/respuesta/${id}`, {}, 4000);
    if (esFinal(a.body)) return a.body;
  }
  const nodo = await asegurarUrlNodo();
  if (!nodo) return null;
  const b = await pedir(`${nodo}/respuesta/${id}`, {}, 4000);
  return esFinal(b.body) ? b.body : null;
}
