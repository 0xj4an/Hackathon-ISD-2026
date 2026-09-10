/**
 * Convierte la salida del modelo (texto sucio) en el JSON de un documento.
 * El OCR y MedPsy viven fuera: aquí se limpia, se normalizan claves y fechas,
 * y si el modelo omitió un campo se intenta completar con el texto OCR.
 */
import { z } from "zod";
import { CedulaSchema, ExtractoSchema, IngresosSchema } from "./schemas";
import { limpiarJson } from "./prompts";
import { validarCoherencia, type Problema } from "./validaciones";

export type ClaveDocumento = "cedula" | "ingresos" | "extracto";

export type DatosDocumento =
  | { clave: "cedula"; datos: z.infer<typeof CedulaSchema> }
  | { clave: "ingresos"; datos: z.infer<typeof IngresosSchema> }
  | { clave: "extracto"; datos: z.infer<typeof ExtractoSchema> };

const SCHEMAS = {
  cedula: CedulaSchema,
  ingresos: IngresosSchema,
  extracto: ExtractoSchema,
} as const;

export type ExtraccionOk = {
  ok: true;
  clave: ClaveDocumento;
  datos: DatosDocumento["datos"];
  crudo: unknown;
  problemas: Problema[];
};

export type ExtraccionFallo = {
  ok: false;
  clave: ClaveDocumento;
  crudo: unknown;
  error: string;
};

const CEDULA_RE = /\b((?:\d{1,2}|PE|E|N|\d{1,2}(?:AV|PI))-\d{1,4}-\d{1,6})\b/i;

const MESES: Record<string, string> = {
  ene: "01", enero: "01", jan: "01", january: "01",
  feb: "02", febrero: "02", february: "02",
  mar: "03", marzo: "03", march: "03",
  abr: "04", abril: "04", apr: "04", april: "04",
  may: "05", mayo: "05",
  jun: "06", junio: "06", june: "06",
  jul: "07", julio: "07", july: "07",
  ago: "08", agosto: "08", aug: "08", august: "08",
  sep: "09", sept: "09", septiembre: "09", september: "09",
  oct: "10", octubre: "10", october: "10",
  nov: "11", noviembre: "11", november: "11",
  dic: "12", diciembre: "12", dec: "12", december: "12",
};

const CAMPO_ES: Record<string, string> = {
  nombre: "el nombre",
  numero: "el número de cédula",
  fecha_nacimiento: "la fecha de nacimiento",
  fecha_expiracion: "la fecha de vencimiento",
  empleador_o_actividad: "el empleador",
  ingreso_mensual_usd: "el ingreso",
  tipo: "el tipo de ingreso",
  banco: "el banco",
  saldo_promedio_usd: "el saldo",
  meses_cubiertos: "los meses cubiertos",
  confianza: "la confianza de la lectura",
};

export function parsearExtraccion(
  clave: ClaveDocumento,
  bruto: string,
  textoOcr?: string,
): ExtraccionOk | ExtraccionFallo {
  const limpio = limpiarJson(bruto);
  let json: unknown = {};
  try {
    json = JSON.parse(limpio);
  } catch {
    if (!textoOcr) return { ok: false, clave, crudo: limpio, error: "El modelo no devolvió JSON." };
    json = {};
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    if (!textoOcr) return { ok: false, clave, crudo: json, error: "El JSON no es un objeto." };
    json = {};
  }

  const normalizado = normalizar(clave, json as Record<string, unknown>, textoOcr);
  const parsed = SCHEMAS[clave].safeParse(normalizado);
  if (!parsed.success) {
    const campos = [...new Set(parsed.error.issues.map(i => {
      const k = String(i.path[0] ?? "campo");
      return CAMPO_ES[k] ?? k;
    }))];
    return {
      ok: false,
      clave,
      crudo: normalizado,
      error: `No se pudo leer ${campos.join(", ")}. Prueba con otra foto.`,
    };
  }

  const problemas = validarCoherencia({ [clave]: parsed.data });
  return { ok: true, clave, datos: parsed.data, crudo: parsed.data, problemas };
}

function plano(raw: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined || v === "") continue;
    o[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
  }
  return o;
}

function tomar(o: Record<string, unknown>, claves: string[]): unknown {
  for (const k of claves) {
    const v = o[k];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return undefined;
}

function mesDe(s: string): string | undefined {
  const k = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\./g, "");
  return MESES[k] ?? MESES[k.slice(0, 3)];
}

/** Deja fechas en YYYY-MM-DD. Acepta lo que imprime una cédula panameña. */
export function aIso(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let m = s.match(/^(\d{1,2})[/\-. ]+([A-Za-zÁÉÍÓÚáéíóúÜü.]{3,})[/\-. ]+(\d{4})$/);
  if (m) {
    const mes = mesDe(m[2]);
    if (mes) return `${m[3]}-${mes}-${m[1].padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})$/i);
  if (m) {
    const mes = mesDe(m[2]);
    if (mes) return `${m[3]}-${mes}-${m[1].padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  return undefined;
}

function aNumero(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return undefined;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function despuesDe(lineas: string[], etiqueta: RegExp): string | undefined {
  const i = lineas.findIndex(l => etiqueta.test(l));
  if (i < 0) return undefined;
  const misma = lineas[i].replace(etiqueta, "").replace(/^[:.\-–—]\s*/, "").trim();
  if (misma.length >= 2) return misma;
  return lineas[i + 1];
}

function rellenarDesdeOcr(clave: ClaveDocumento, o: Record<string, unknown>, ocr: string) {
  const lineas = ocr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (clave === "cedula") {
    const n = despuesDe(lineas, /^nombres?\b[:.\s]*/i);
    const a = despuesDe(lineas, /^apellidos?\b[:.\s]*/i);
    if (n && a) o.nombre = `${n} ${a}`;
    else if (!o.nombre && n) o.nombre = n;
    else if (!o.nombre && a) o.nombre = a;
    if (!o.numero) {
      const m = ocr.match(CEDULA_RE);
      if (m) o.numero = m[1];
    }
    if (!aIso(o.fecha_nacimiento)) {
      const iso = aIso(despuesDe(lineas, /fecha\s*de\s*nacimiento\b[:.\s]*/i));
      if (iso) o.fecha_nacimiento = iso;
    }
    if (!aIso(o.fecha_expiracion)) {
      const iso = aIso(despuesDe(lineas, /expir[ae]\b[:.\s]*/i) ?? despuesDe(lineas, /vence\b[:.\s]*/i));
      if (iso) o.fecha_expiracion = iso;
    }
  }

  if (clave === "ingresos") {
    if (o.ingreso_mensual_usd == null) {
      const m = ocr.match(/B\/\.?\s*([\d.,]+)/i) ?? ocr.match(/\$\s*([\d.,]+)/);
      if (m) o.ingreso_mensual_usd = aNumero(m[1].replace(",", ""));
    }
    if (!o.empleador_o_actividad && lineas[0] && lineas[0].length >= 3) {
      o.empleador_o_actividad = lineas[0];
    }
    if (!o.tipo && /salario|labora|contrato|emplead/i.test(ocr)) o.tipo = "asalariado";
    if (!aIso(o.fecha_documento)) {
      const m = ocr.match(/(\d{1,2}\s+de\s+[A-Za-zÁÉÍÓÚáéíóú]+\s+de\s+\d{4})/);
      const iso = aIso(m?.[1]);
      if (iso) o.fecha_documento = iso;
    }
  }

  if (clave === "extracto") {
    if (!o.banco && lineas[0]) o.banco = lineas[0];
    if (o.saldo_promedio_usd == null) {
      const m = ocr.match(/B\/\.?\s*([\d.,]+)/i);
      if (m) o.saldo_promedio_usd = aNumero(m[1].replace(",", ""));
    }
  }
}

function normalizar(
  clave: ClaveDocumento,
  raw: Record<string, unknown>,
  textoOcr?: string,
): Record<string, unknown> {
  const o = plano(raw);

  const conf = tomar(o, ["confianza", "confidence"]);
  if (typeof conf === "string") o.confianza = Number(conf);
  if (typeof o.confianza === "number" && o.confianza > 1 && o.confianza <= 100) {
    o.confianza = o.confianza / 100;
  }
  if (typeof o.confianza !== "number" || !Number.isFinite(o.confianza)) o.confianza = 0.7;

  if (clave === "cedula") {
    const numero = tomar(o, ["numero", "cedula", "numero_cedula", "id"]);
    if (typeof numero === "string") {
      o.numero = numero.replace(/[–—]/g, "-").replace(/\s+/g, "").replace(/\./g, "").toUpperCase();
    }
    const nombres = tomar(o, ["nombre", "nombres", "name", "full_name", "nombre_completo"]);
    const apellidos = tomar(o, ["apellidos", "apellido", "surnames", "surname"]);
    if (typeof nombres === "string" && typeof apellidos === "string") {
      o.nombre = `${nombres} ${apellidos}`.replace(/\s+/g, " ").trim();
    } else if (typeof nombres === "string") {
      o.nombre = nombres.trim();
    } else if (typeof apellidos === "string") {
      o.nombre = apellidos.trim();
    }
    const nac = aIso(tomar(o, ["fecha_nacimiento", "nacimiento", "date_of_birth", "dob"]));
    if (nac) o.fecha_nacimiento = nac;
    else delete o.fecha_nacimiento;
    const exp = aIso(tomar(o, ["fecha_expiracion", "expiracion", "vence", "expiry", "expiration"]));
    if (exp) o.fecha_expiracion = exp;
    else delete o.fecha_expiracion;
  }

  if (clave === "ingresos") {
    const emp = tomar(o, ["empleador_o_actividad", "empleador", "actividad", "employer", "empresa"]);
    if (typeof emp === "string") o.empleador_o_actividad = emp.trim();
    const ingreso = aNumero(tomar(o, ["ingreso_mensual_usd", "ingreso", "salario", "salary", "sueldo"]));
    if (ingreso != null) o.ingreso_mensual_usd = ingreso;
    const tipo = tomar(o, ["tipo", "type"]);
    if (typeof tipo === "string") {
      const t = tipo.toLowerCase();
      o.tipo = t.includes("indepen") || t.includes("self") ? "independiente"
        : t.includes("jubil") || t.includes("retir") ? "jubilado"
        : t.includes("asal") || t.includes("emple") ? "asalariado"
        : ["asalariado", "independiente", "jubilado", "otro"].includes(t) ? t
        : "otro";
    }
    const fecha = aIso(tomar(o, ["fecha_documento", "fecha"]));
    if (fecha) o.fecha_documento = fecha;
    else delete o.fecha_documento;
    const antig = aNumero(tomar(o, ["antiguedad_meses", "antiguedad"]));
    if (antig != null) o.antiguedad_meses = Math.round(antig);
  }

  if (clave === "extracto") {
    const banco = tomar(o, ["banco", "bank"]);
    if (typeof banco === "string") o.banco = banco.trim();
    const saldo = aNumero(tomar(o, ["saldo_promedio_usd", "saldo", "balance"]));
    if (saldo != null) o.saldo_promedio_usd = saldo;
    const meses = aNumero(tomar(o, ["meses_cubiertos", "meses"]));
    if (meses != null) o.meses_cubiertos = Math.round(meses);
  }

  if (textoOcr) rellenarDesdeOcr(clave, o, textoOcr);
  return o;
}
