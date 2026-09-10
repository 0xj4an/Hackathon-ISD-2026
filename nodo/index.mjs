// Dos roles, el mismo binario. El motor corre solo con ROL=banco.
//
//   banco:  telefono --wifi/HTTPS--> banco remoto (Railway). Este proceso
//           no interviene cuando hay salida. El telefono no necesita al pueblo.
//   pueblo: telefono --LAN :8788--> este proceso (ROL=corregimiento)
//           --HTTP--> banco remoto, cuando el pueblo tiene salida.
//   inferir: el telefono corre MedPsy; si no puede, POST /inferir (texto).
//            Solo ROL=corregimiento. Las fotos no viajan.
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { aceptar, recibir } from "./credito.mjs";

const ROL = process.env.ROL || "banco";
const PORT = Number(process.env.PORT || (ROL === "corregimiento" ? 8788 : 8787));
const BANCO_URL = (process.env.BANCO_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
// Demo = HTTP. P2P solo si alguien lo pide explícito (ENABLE_P2P=1).
const SKIP_P2P = process.env.ENABLE_P2P !== "1"
  || process.env.SKIP_P2P === "1"
  || Boolean(process.env.RAILWAY_ENVIRONMENT);
const NODO_TOKEN = process.env.NODO_TOKEN || "";
const TOPIC_NAME = process.env.TOPIC || "isd-hackathon-credito-salud-v1";
// En Railway: Volume montado en /data + STATE_DIR=/data para no perder solicitudes al redeploy.
const STATE_ROOT = process.env.STATE_DIR
  || join(fileURLToPath(new URL(".", import.meta.url)), "state");
const STATE = join(STATE_ROOT, ROL) + "/";
mkdirSync(STATE, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), `[${ROL}]`, ...a);

const LIMITE = 32_000;
const peers = new Set();
const enviarPeer = (sock, obj) => sock.write(JSON.stringify(obj) + "\n");

function cors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, x-nodo-token");
}

function json(res, code, body) {
  cors(res);
  res.statusCode = code;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

/** Si NODO_TOKEN está definido, exige header x-nodo-token. Sin token = LAN abierta (demo). */
function autorizado(req) {
  if (!NODO_TOKEN) return true;
  return req.headers["x-nodo-token"] === NODO_TOKEN;
}

function leerCuerpo(req, max = LIMITE) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (d) => {
      b += d;
      if (b.length > max) {
        req.destroy();
        reject(Object.assign(new Error("demasiado grande"), { code: 413 }));
      }
    });
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

function guardar(id, nombre, dato) {
  writeFileSync(`${STATE}${id}${nombre}`, JSON.stringify(dato, null, 2));
}

function leerRespuesta(id) {
  const f = `${STATE}${id}.respuesta.json`;
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

function pendientes() {
  return readdirSync(STATE)
    .filter((f) => f.endsWith(".json") && !f.includes(".respuesta") && !f.includes(".meta"))
    .map((f) => f.replace(".json", ""))
    .filter((id) => !existsSync(`${STATE}${id}.respuesta.json`))
    .map((id) => JSON.parse(readFileSync(`${STATE}${id}.json`, "utf8")));
}

function leerMeta(id) {
  const f = `${STATE}${id}.meta.json`;
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

/** Lo que ve el back office. Sin cédula ni nombre completos. */
function listar() {
  return readdirSync(STATE)
    .filter((f) => f.endsWith(".json") && !f.includes(".respuesta") && !f.includes(".meta"))
    .map((f) => {
      const id = f.replace(".json", "");
      const sol = JSON.parse(readFileSync(`${STATE}${id}.json`, "utf8"));
      const meta = leerMeta(id);
      const ced = String(sol.cedula?.numero ?? "");
      return {
        id,
        creada: sol.creada,
        recibida: meta?.recibida,
        canal: meta?.canal ?? "desconocido",
        desde: meta?.desde,
        // Redactado: solo iniciales / últimos dígitos para el mock admin.
        nombre: iniciales(sol.cedula?.nombre),
        cedula: ced ? `***${ced.slice(-4)}` : undefined,
        ingreso: sol.ingresos?.ingreso_mensual_usd,
        tipo: sol.ingresos?.tipo,
        monto: sol.monto_solicitado_usd,
        deudas: sol.deudas_mensuales_usd ?? 0,
        extracto: Boolean(sol.extracto),
        respuesta: leerRespuesta(id),
      };
    })
    .sort((a, b) => String(b.recibida ?? b.creada ?? "").localeCompare(String(a.recibida ?? a.creada ?? "")));
}

function iniciales(nombre) {
  if (!nombre || typeof nombre !== "string") return undefined;
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}.`)
    .join(" ");
}

function transito(sol) {
  return {
    solicitud_id: sol.id,
    decision: "pendiente",
    motivo: "en el nodo del pueblo; él se la lleva al banco",
    ts: new Date().toISOString(),
  };
}

function sellarMeta(id, meta) {
  if (leerMeta(id)) return;
  guardar(id, ".meta.json", {
    recibida: new Date().toISOString(),
    canal: meta.canal || "directo",
    ...(meta.desde ? { desde: meta.desde } : {}),
  });
}

function canalDesdeReq(req) {
  const via = String(req?.headers?.["x-via"] || "").toLowerCase();
  if (via === "pueblo") return "pueblo";
  return "directo";
}

function comoBanco(raw, meta = {}) {
  const { sol, respuesta } = recibir(JSON.parse(raw));
  guardar(sol.id, ".json", sol);
  guardar(sol.id, ".respuesta.json", respuesta);
  sellarMeta(sol.id, meta);
  log(`decidida ${sol.id} ${respuesta.decision} ${respuesta.monto_aprobado_usd ?? ""} canal=${meta.canal || "directo"}`);
  return { sol, respuesta };
}

async function comoCartero(raw) {
  const sol = aceptar(JSON.parse(raw));
  guardar(sol.id, ".json", sol);
  log(`recibida ${sol.id} monto ${sol.monto_solicitado_usd}`);
  for (const p of peers) enviarPeer(p, { tipo: "solicitud", data: sol });
  try {
    await empujarHttp(sol);
  } catch (e) {
    log(`banco HTTP no alcanzó ${sol.id}: ${e.message}`);
  }
  return { sol, respuesta: leerRespuesta(sol.id) ?? transito(sol) };
}

async function empujarHttp(sol) {
  const r = await fetch(`${BANCO_URL}/solicitud`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-via": "pueblo",
    },
    body: JSON.stringify(sol),
    signal: AbortSignal.timeout(Number(process.env.BANCO_TIMEOUT_MS || 12000)),
  });
  const data = await r.json();
  if (!data?.decision || data.decision === "pendiente") return;
  guardar(sol.id, ".respuesta.json", data);
  log(`respuesta HTTP ${sol.id} ${data.decision}`);
  for (const p of peers) enviarPeer(p, { tipo: "respuesta", data });
}

async function reenviarPendientes(sock) {
  if (ROL !== "corregimiento") return;
  for (const sol of pendientes()) {
    const dest = sock ? [sock] : [...peers];
    for (const p of dest) enviarPeer(p, { tipo: "solicitud", data: sol });
    try {
      await empujarHttp(sol);
    } catch (e) {
      log(`banco HTTP no alcanzó ${sol.id}: ${e.message}`);
    }
  }
}

async function onMensaje(msg, sock, id) {
  if (msg.tipo === "solicitud") {
    try {
      if (ROL === "banco") {
        const { respuesta } = comoBanco(JSON.stringify(msg.data), { canal: "pueblo", desde: "p2p" });
        enviarPeer(sock, { tipo: "respuesta", data: respuesta });
      } else {
        const { sol, respuesta } = await comoCartero(JSON.stringify(msg.data));
        enviarPeer(sock, { tipo: "ack", solicitud_id: sol.id, data: respuesta });
      }
    } catch (e) {
      log(`p2p rechazo de ${id}: ${e.message}`);
      enviarPeer(sock, { tipo: "respuesta", data: { decision: "revision", motivo: "solicitud invalida" } });
    }
  } else if (msg.tipo === "respuesta") {
    const sid = msg.data?.solicitud_id;
    if (!sid) return;
    guardar(sid, ".respuesta.json", msg.data);
    log(`respuesta P2P ${sid} ${msg.data.decision}`);
    for (const p of peers) if (p !== sock) enviarPeer(p, msg);
  } else if (msg.tipo === "consulta") {
    const r = leerRespuesta(msg.solicitud_id);
    if (r) enviarPeer(sock, { tipo: "respuesta", data: r });
  }
}

async function arrancarP2P() {
  if (SKIP_P2P) {
    log("p2p omitido (banco remoto por HTTP)");
    return;
  }
  const [{ default: Hyperswarm }, crypto, { default: b4a }] = await Promise.all([
    import("hyperswarm"),
    import("hypercore-crypto"),
    import("b4a"),
  ]);
  const swarm = new Hyperswarm();
  const topic = crypto.hash(b4a.from(TOPIC_NAME));
  swarm.on("connection", (sock, info) => {
    const id = b4a.toString(info.publicKey, "hex").slice(0, 8);
    peers.add(sock);
    log(`peer conectado ${id}`);
    let buf = "";
    sock.on("data", (d) => {
      buf += b4a.toString(d);
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line.trim()) void onMensaje(JSON.parse(line), sock, id);
      }
    });
    sock.on("close", () => { peers.delete(sock); log(`peer cerrado ${id}`); });
    sock.on("error", (e) => log("error peer", e.message));
    if (ROL === "corregimiento") void reenviarPendientes(sock);
  });
  await swarm.join(topic, { server: true, client: true }).flushed();
  log(`p2p topic=${TOPIC_NAME} key=${b4a.toString(swarm.keyPair.publicKey, "hex").slice(0, 16)}…`);
}

createServer(async (req, res) => {
  const desde = req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "?";
  log(`HTTP ${req.method} ${req.url} ← ${desde}`);
  cors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

  if (req.method === "GET" && (req.url === "/" || req.url === "/salud")) {
    json(res, 200, {
      ok: true,
      rol: ROL,
      /** La app busca esto en la LAN para hallar el pueblo sin IP fija. */
      servicio: ROL === "corregimiento" ? "inaigar-pueblo" : undefined,
      peers: peers.size,
      inferir: ROL === "corregimiento",
      p2p: !SKIP_P2P,
      auth: Boolean(NODO_TOKEN),
    });
    return;
  }

  if (req.method === "GET" && req.url === "/solicitudes") {
    if (!autorizado(req)) {
      json(res, 401, { motivo: "token requerido" });
      return;
    }
    json(res, 200, listar());
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/respuesta/")) {
    const id = req.url.split("/")[2];
    json(res, 200, leerRespuesta(id) ?? { decision: "pendiente" });
    return;
  }

  if (req.method === "POST" && req.url === "/solicitud") {
    if (!autorizado(req)) {
      json(res, 401, { motivo: "token requerido" });
      return;
    }
    try {
      const raw = await leerCuerpo(req);
      const meta = {
        canal: canalDesdeReq(req),
        desde: req.socket?.remoteAddress,
      };
      const { respuesta } = ROL === "banco" ? comoBanco(raw, meta) : await comoCartero(raw);
      json(res, 200, respuesta);
    } catch (e) {
      const code = e.code === 413 ? 413 : e?.name === "ZodError" || e instanceof SyntaxError ? 400 : 500;
      log(`rechazo ${code} ${e.message ?? e}`);
      json(res, code, { decision: "revision", motivo: "solicitud invalida" });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/inferir") {
    if (ROL !== "corregimiento") {
      json(res, 404, { motivo: "solo el pueblo infiere" });
      return;
    }
    if (!autorizado(req)) {
      json(res, 401, { motivo: "token requerido" });
      return;
    }
    try {
      const raw = await leerCuerpo(req, 200_000);
      const { inferir } = await import("./inferir.mjs");
      const out = await inferir(JSON.parse(raw || "{}"));
      json(res, 200, out);
    } catch (e) {
      const code = e.code === 413 ? 413 : e instanceof SyntaxError || /foto|imagen|system|user|pedido/i.test(e.message ?? "") ? 400 : 503;
      log(`inferir ${code} ${e.message ?? e}`);
      json(res, code, { motivo: e.message ?? "no pude inferir" });
    }
    return;
  }

  res.statusCode = 404;
  res.end();
}).listen(PORT, "0.0.0.0", () => {
  log(`HTTP en :${PORT} p2p=${SKIP_P2P ? "off" : "on"} state=${STATE}`);
  if (ROL === "corregimiento") anunciarBonjour();
});

if (ROL === "corregimiento") setInterval(() => { void reenviarPendientes(); }, 4000);

arrancarP2P().catch((e) => log("p2p", e.message));

/** mDNS: el teléfono (u otras apps) puede hallar el pueblo en la misma WiFi. */
function anunciarBonjour() {
  void import("bonjour-service").then(({ Bonjour }) => {
    const bonjour = new Bonjour();
    bonjour.publish({
      name: "Ina Igar Pueblo",
      type: "inaigar-pueblo",
      protocol: "tcp",
      port: PORT,
      txt: { servicio: "inaigar-pueblo", path: "/salud" },
    });
    log(`bonjour _inaigar-pueblo._tcp :${PORT}`);
    const apagar = () => {
      try { bonjour.unpublishAll(() => bonjour.destroy()); } catch { /* ignore */ }
    };
    process.on("SIGINT", apagar);
    process.on("SIGTERM", apagar);
  }).catch((e) => log(`bonjour omitido: ${e.message}`));
}
