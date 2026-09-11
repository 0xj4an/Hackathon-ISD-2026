/**
 * Buffer de logs para la consola de demo (video).
 * En el celular y, si hay pueblo en LAN, espejo a http://…:8788/consola.
 * Sin fotos ni cédula completa.
 */
import { urlNodo } from "./nodoUrl";

type Listener = (lines: string[]) => void;

const MAX = 80;
const lines: string[] = [];
const listeners = new Set<Listener>();

function stamp(msg: string): string {
  return `${new Date().toISOString().slice(11, 19)} ${msg}`;
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
    body: JSON.stringify({ linea, origen: "cel" }),
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
