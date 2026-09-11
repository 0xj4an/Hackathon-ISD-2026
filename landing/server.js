// Servidor estatico minimo, sin dependencias. Railway lo detecta como Node.
// Ademas sirve /admin: login banco@gmail.com y lista lo que el banco ya decidio.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIR = import.meta.dirname;
const ADMIN = readFileSync(resolve(DIR, "admin.html"));
const ESTATICO = {
  "/favicon.png": ["favicon.png", "image/png"],
  "/icon.png": ["icon.png", "image/png"],
  "/og.png": ["og.png", "image/png"],
  "/splash.png": ["splash.png", "image/png"],
  "/huellas-blanco.png": ["huellas-blanco.png", "image/png"],
  "/huellas-negro.png": ["huellas-negro.png", "image/png"],
};
const PUERTO = Number(process.env.PORT || 3000);
const BANCO_URL = (process.env.BANCO_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const CORREO = (process.env.BANCO_CORREO || "banco@gmail.com").toLowerCase();
const COOKIE = "sesion=banco; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400";

const SEMILLA = [
  {
    id: "demo-aprobada",
    creada: "2026-09-10T14:02:00.000Z",
    recibida: "2026-09-10T14:02:00.400Z",
    canal: "directo",
    nombre: "Ana Pérez",
    cedula: "8-888-888",
    ingreso: 520,
    tipo: "asalariado",
    monto: 920,
    deudas: 40,
    extracto: false,
    respuesta: {
      decision: "aprobada",
      monto_aprobado_usd: 920,
      plazo_meses: 12,
      tasa_anual_pct: 17.4,
      cuota_mensual_usd: 84.08,
      grado: "C",
      motivo: "capacidad de pago suficiente; scorecard sintético grado C",
      ts: "2026-09-10T14:02:01.000Z",
    },
    fuente: "demo",
  },
  {
    id: "demo-extracto",
    creada: "2026-09-10T13:40:00.000Z",
    recibida: "2026-09-10T13:40:00.800Z",
    canal: "pueblo",
    nombre: "Luis Mora",
    cedula: "4-222-111",
    ingreso: 520,
    tipo: "asalariado",
    monto: 920,
    deudas: 40,
    extracto: true,
    respuesta: {
      decision: "aprobada",
      monto_aprobado_usd: 920,
      plazo_meses: 12,
      tasa_anual_pct: 10.6,
      cuota_mensual_usd: 81.12,
      grado: "A",
      motivo: "extracto en regla; scorecard sintético grado A",
      ts: "2026-09-10T13:40:01.000Z",
    },
    fuente: "demo",
  },
  {
    id: "demo-revision",
    creada: "2026-09-10T12:11:00.000Z",
    recibida: "2026-09-10T12:11:01.000Z",
    canal: "demo",
    nombre: "Marta Quintero",
    cedula: "9-111-333",
    ingreso: 280,
    tipo: "independiente",
    monto: 1800,
    deudas: 90,
    extracto: false,
    respuesta: {
      decision: "revision",
      motivo: "documentos poco legibles; un agente los revisará",
      ts: "2026-09-10T12:11:02.000Z",
    },
    fuente: "demo",
  },
];

function html(res, body, extra = {}) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...extra,
  });
  res.end(body);
}

function json(res, code, body, extra = {}) {
  res.writeHead(code, {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...extra,
  });
  res.end(JSON.stringify(body));
}

function cookie(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

const haySesion = (req) => cookie(req, "sesion") === "banco";

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (d) => {
      b += d;
      if (b.length > 4000) {
        req.destroy();
        reject(new Error("demasiado grande"));
      }
    });
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

async function delBanco() {
  const r = await fetch(`${BANCO_URL}/solicitudes`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(String(r.status));
  const filas = await r.json();
  return Array.isArray(filas) ? filas.map((f) => ({ ...f, fuente: "banco" })) : [];
}

createServer(async (req, res) => {
  const url = req.url?.split("?")[0] || "/";

  if (req.method === "GET" && url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }

  if (req.method === "GET" && (url === "/admin" || url === "/admin.html" || url === "/back")) {
    return html(res, ADMIN);
  }

  if (req.method === "POST" && url === "/admin/login") {
    try {
      const body = JSON.parse(await leerCuerpo(req));
      const email = String(body.email || "").trim().toLowerCase();
      if (email !== CORREO) {
        return json(res, 401, { ok: false, motivo: "ese correo no entra" });
      }
      return json(res, 200, { ok: true }, { "set-cookie": COOKIE });
    } catch {
      return json(res, 400, { ok: false, motivo: "pedido inválido" });
    }
  }

  if (req.method === "POST" && url === "/admin/logout") {
    return json(res, 200, { ok: true }, {
      "set-cookie": "sesion=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    });
  }

  if (req.method === "GET" && url === "/admin/sesion") {
    return json(res, 200, { ok: haySesion(req) });
  }

  if (req.method === "GET" && url === "/admin/solicitudes") {
    if (!haySesion(req)) return json(res, 401, { ok: false });
    try {
      const filas = await delBanco();
      return json(res, 200, { origen: "banco", filas });
    } catch {
      return json(res, 200, { origen: "demo", filas: SEMILLA });
    }
  }

  if (req.method === "GET" && ESTATICO[url]) {
    const [archivo, tipo] = ESTATICO[url];
    res.writeHead(200, {
      "content-type": tipo,
      "cache-control": "public, max-age=86400",
    });
    return res.end(readFileSync(resolve(DIR, archivo)));
  }

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    return res.end(readFileSync(resolve(DIR, "index.html")));
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("no");
}).listen(PUERTO, "0.0.0.0", () => console.log(`landing en :${PUERTO}`));
