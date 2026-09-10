/**
 * Convierte la salida del modelo (texto sucio) en el JSON de un documento.
 * El OCR y MedPsy viven fuera: aquí solo se limpia, se normaliza y se valida.
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

export function parsearExtraccion(clave: ClaveDocumento, bruto: string): ExtraccionOk | ExtraccionFallo {
  const limpio = limpiarJson(bruto);
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    return { ok: false, clave, crudo: limpio, error: "El modelo no devolvió JSON." };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, clave, crudo: json, error: "El JSON no es un objeto." };
  }

  const normalizado = normalizar(clave, json as Record<string, unknown>);
  const parsed = SCHEMAS[clave].safeParse(normalizado);
  if (!parsed.success) {
    return {
      ok: false,
      clave,
      crudo: normalizado,
      error: parsed.error.issues.map(i => `${i.path.join(".") || "campo"}: ${i.message}`).join("; "),
    };
  }

  const problemas = validarCoherencia({ [clave]: parsed.data });
  return { ok: true, clave, datos: parsed.data, crudo: parsed.data, problemas };
}

function normalizar(clave: ClaveDocumento, raw: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined || v === "") continue;
    o[k] = v;
  }

  if (typeof o.confianza === "string") o.confianza = Number(o.confianza);
  if (typeof o.confianza === "number" && o.confianza > 1 && o.confianza <= 100) {
    o.confianza = o.confianza / 100;
  }

  if (clave === "cedula" && typeof o.numero === "string") {
    o.numero = o.numero.replace(/\s+/g, "").toUpperCase();
  }
  if (clave === "ingresos") {
    if (typeof o.ingreso_mensual_usd === "string") {
      o.ingreso_mensual_usd = Number(String(o.ingreso_mensual_usd).replace(/[^0-9.]/g, ""));
    }
    if (typeof o.tipo === "string") o.tipo = o.tipo.toLowerCase();
  }
  if (clave === "extracto") {
    if (typeof o.saldo_promedio_usd === "string") {
      o.saldo_promedio_usd = Number(String(o.saldo_promedio_usd).replace(/[^0-9.]/g, ""));
    }
    if (typeof o.meses_cubiertos === "string") o.meses_cubiertos = Number(o.meses_cubiertos);
  }
  return o;
}
