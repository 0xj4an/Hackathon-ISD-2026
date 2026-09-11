/**
 * Pantalla del nodo del pueblo (laptop): SSE + HTML para grabar al lado del teléfono.
 * El celular espeja líneas con POST /consola/linea.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MAX = 200;
const lineas = [];
/** @type {Set<import("node:http").ServerResponse>} */
const clientes = new Set();

const HTML = join(dirname(fileURLToPath(import.meta.url)), "consola.html");

function horaPanama(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Panama",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function stamp(msg) {
  return `${horaPanama()} ${msg}`;
}

function emitir(evento, dato) {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(dato)}\n\n`;
  for (const res of clientes) {
    try {
      res.write(payload);
    } catch {
      clientes.delete(res);
    }
  }
}

/** Añade una línea (ya con hora o cruda). */
export function feed(msg, { origen = "nodo", conHora = true, modo = null } = {}) {
  const linea = conHora ? stamp(msg) : String(msg);
  const item = { linea, origen, modo: typeof modo === "string" && modo ? modo : null };
  lineas.push(item);
  if (lineas.length > MAX) lineas.splice(0, lineas.length - MAX);
  emitir("linea", item);
  return item;
}

export function borrar() {
  lineas.length = 0;
  emitir("borrar", {});
}

export function snapshot() {
  return lineas.slice();
}

export function paginaHtml() {
  return readFileSync(HTML, "utf8");
}

/** Engancha SSE. */
export function suscribir(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "access-control-allow-origin": "*",
  });
  res.write(`event: snapshot\ndata: ${JSON.stringify(lineas)}\n\n`);
  clientes.add(res);
  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(ping);
      clientes.delete(res);
    }
  }, 15000);
  res.on("close", () => {
    clearInterval(ping);
    clientes.delete(res);
  });
}
