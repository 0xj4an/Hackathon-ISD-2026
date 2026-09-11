/**
 * Buffer de logs para la consola de demo (video).
 * En el celular y, si hay pueblo en LAN, espejo a http://…:8788/consola.
 * Sin fotos ni cédula completa.
 */
import { useEffect, useState } from "react";
import { urlNodo } from "./nodoUrl";
import { modo } from "./modo";

type Listener = (lines: string[]) => void;

const MAX = 80;
const lines: string[] = [];
const listeners = new Set<Listener>();

export type ViaMed = "local" | "p2p" | "pueblo" | null;
export type EstadoVia = {
  via: ViaMed;
  viva: boolean;
  texto: string;
};

const VIA_INICIAL: EstadoVia = { via: null, viva: false, texto: "MedPsy" };
let via = VIA_INICIAL;
const viaListeners = new Set<(e: EstadoVia) => void>();

export function viaActual(): EstadoVia {
  return via;
}

export function marcarVia(next: EstadoVia) {
  via = next;
  for (const l of viaListeners) l(via);
}

export function subscribeVia(listener: (e: EstadoVia) => void): () => void {
  viaListeners.add(listener);
  listener(via);
  return () => { viaListeners.delete(listener); };
}

export function useViaMed(): EstadoVia {
  const [e, setE] = useState(via);
  useEffect(() => subscribeVia(setE), []);
  return e;
}

function stamp(msg: string): string {
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Panama",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return `${hora} ${msg}`;
}

function notify() {
  const snap = lines.slice();
  for (const l of listeners) l(snap);
}

/** Espejo best-effort a la consola de la laptop (no bloquea la UI). */
function espejo(linea: string) {
  const base = urlNodo();
  if (!base) return;
  void fetch(`${base}/consola/linea`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ linea, origen: "cel", modo: modo() }),
  }).catch(() => {});
}

export function subscribeDemoLog(listener: Listener): () => void {
  listeners.add(listener);
  listener(lines.slice());
  return () => {
    listeners.delete(listener);
  };
}

export function clearDemoLog() {
  lines.length = 0;
  notify();
  const base = urlNodo();
  if (base) {
    void fetch(`${base}/consola/borrar`, { method: "POST" }).catch(() => {});
  }
}

export function demoLog(msg: string) {
  const linea = stamp(msg);
  lines.push(linea);
  if (lines.length > MAX) lines.splice(0, lines.length - MAX);
  notify();
  espejo(linea);
  if (__DEV__) console.log(`[demo] ${msg}`);
}

/** Acorta UUID para que quepa en el video. */
export function idCorto(id: string | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? id.slice(0, 8) : id;
}
