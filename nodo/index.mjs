// Nodo P2P: rol "banco" decide; rol "corregimiento" reenvía (store-and-forward) hacia el banco cuando lo alcanza.
// Transporte: Hyperswarm (Pears). Solo viajan JSON de solicitud/respuesta; nunca imágenes ni datos de salud.
import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { decidir } from "./credito.mjs";

const ROL = process.env.ROL || "banco";
const TOPIC_NAME = process.env.TOPIC || "isd-hackathon-credito-salud-v1";
const topic = crypto.hash(b4a.from(TOPIC_NAME));
const STATE = new URL(`./state/${ROL}/`, import.meta.url).pathname; mkdirSync(STATE, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), `[${ROL}]`, ...a);

const swarm = new Hyperswarm();
const peers = new Set();
swarm.on("connection", (sock, info) => {
  const id = b4a.toString(info.publicKey, "hex").slice(0, 8);
  peers.add(sock); log(`peer conectado ${id}`);
  let buf = "";
  sock.on("data", (d) => { buf += b4a.toString(d); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (line.trim()) onMensaje(JSON.parse(line), sock, id); } });
  sock.on("close", () => { peers.delete(sock); log(`peer cerrado ${id}`); });
  sock.on("error", (e) => log("error peer", e.message));
  if (ROL === "corregimiento") reenviarPendientes(sock);
});
const enviar = (sock, obj) => sock.write(JSON.stringify(obj) + "\n");

function onMensaje(msg, sock, id) {
  if (msg.tipo === "solicitud") {
    log(`solicitud ${msg.data.id} de ${id} (monto ${msg.data.monto_solicitado_usd})`);
    writeFileSync(`${STATE}${msg.data.id}.json`, JSON.stringify(msg.data, null, 2));
    if (ROL === "banco") { const r = decidir(msg.data); writeFileSync(`${STATE}${msg.data.id}.respuesta.json`, JSON.stringify(r, null, 2)); enviar(sock, { tipo: "respuesta", data: r }); log(`respuesta ${r.decision} ${r.monto_aprobado_usd ?? ""}`); }
    else { enviar(sock, { tipo: "ack", solicitud_id: msg.data.id, nota: "recibida en el nodo del corregimiento; se reenviará al banco" }); reenviarPendientes(); }
  } else if (msg.tipo === "respuesta") {
    log(`respuesta del banco para ${msg.data.solicitud_id}: ${msg.data.decision}`);
    writeFileSync(`${STATE}${msg.data.solicitud_id}.respuesta.json`, JSON.stringify(msg.data, null, 2));
    for (const p of peers) if (p !== sock) enviar(p, msg); // devolver al teléfono si sigue conectado
  } else if (msg.tipo === "consulta") {
    const f = `${STATE}${msg.solicitud_id}.respuesta.json`;
    if (existsSync(f)) enviar(sock, { tipo: "respuesta", data: JSON.parse(readFileSync(f, "utf8")) });
  }
}
function reenviarPendientes(sock) {
  if (ROL !== "corregimiento") return;
  for (const f of readdirSync(STATE)) {
    if (!f.endsWith(".json") || f.includes(".respuesta")) continue;
    const id = f.replace(".json", ""); if (existsSync(`${STATE}${id}.respuesta.json`)) continue;
    const data = JSON.parse(readFileSync(`${STATE}${f}`, "utf8"));
    for (const p of sock ? [sock] : peers) enviar(p, { tipo: "solicitud", data });
  }
}

// HTTP local (misma LAN) como transporte alterno para el demo cuando "hay señal".
createServer((req, res) => {
  if (req.method === "POST" && req.url === "/solicitud") { let b = ""; req.on("data", d => b += d); req.on("end", () => { const data = JSON.parse(b); writeFileSync(`${STATE}${data.id}.json`, b); const r = ROL === "banco" ? decidir(data) : { solicitud_id: data.id, decision: "revision", motivo: "en tránsito al banco", ts: new Date().toISOString() }; if (ROL === "banco") writeFileSync(`${STATE}${data.id}.respuesta.json`, JSON.stringify(r)); res.setHeader("content-type", "application/json"); res.end(JSON.stringify(r)); }); return; }
  if (req.method === "GET" && req.url?.startsWith("/respuesta/")) { const f = `${STATE}${req.url.split("/")[2]}.respuesta.json`; res.setHeader("content-type", "application/json"); res.end(existsSync(f) ? readFileSync(f) : JSON.stringify({ decision: "pendiente" })); return; }
  res.statusCode = 404; res.end();
}).listen(Number(process.env.PORT || 8787), "0.0.0.0", () => log(`HTTP en :${process.env.PORT || 8787}`));

await swarm.join(topic, { server: true, client: true }).flushed();
log(`rol=${ROL} topic=${TOPIC_NAME} key=${b4a.toString(swarm.keyPair.publicKey, "hex").slice(0, 16)}… esperando peers`);
