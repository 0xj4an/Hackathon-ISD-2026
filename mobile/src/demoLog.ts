/**
 * Buffer de logs para la consola de demo (video).
 * Sin fotos ni cédula completa: solo lo que el jurado debe ver en cámara.
 */
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
}

export function demoLog(msg: string) {
  lines.push(stamp(msg));
  if (lines.length > MAX) lines.splice(0, lines.length - MAX);
  notify();
  if (__DEV__) console.log(`[demo] ${msg}`);
}

/** Acorta UUID para que quepa en el video. */
export function idCorto(id: string | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? id.slice(0, 8) : id;
}
