/**
 * MedPsy + LoRA de lab. Parsea el JSON; clasificar() decide rangos (`ADR-005`).
 */
import { LaboratorioSchema, type Laboratorio } from "./schemas.ts";
import { limpiarJson } from "./prompts.ts";

export type LabOk = { ok: true; datos: Laboratorio; crudo: unknown };
export type LabFallo = { ok: false; error: string; crudo: unknown };
export type LabParse = LabOk | LabFallo;

export function parsearLaboratorio(bruto: string): LabParse {
  const limpio = limpiarJson(bruto);
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    return { ok: false, error: "El modelo no devolvió JSON del examen.", crudo: limpio };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "El JSON del examen no es un objeto.", crudo: json };
  }

  const o = json as Record<string, unknown>;
  if (typeof o.confianza === "string") o.confianza = Number(o.confianza);
  if (typeof o.confianza === "number" && o.confianza > 1 && o.confianza <= 100) {
    o.confianza = o.confianza / 100;
  }
  if (typeof o.confianza !== "number" || !Number.isFinite(o.confianza)) o.confianza = 0.7;

  if (Array.isArray(o.lecturas)) {
    o.lecturas = o.lecturas.map((l) => {
      if (!l || typeof l !== "object") return l;
      const x = { ...(l as Record<string, unknown>) };
      if (typeof x.codigo === "string") x.codigo = x.codigo.toUpperCase();
      if (typeof x.valor === "string") {
        const n = Number(String(x.valor).replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(n)) x.valor = n;
      }
      return x;
    });
  }

  const parsed = LaboratorioSchema.safeParse(o);
  if (!parsed.success) {
    return { ok: false, error: "No se pudieron leer los marcadores del examen.", crudo: o };
  }
  return { ok: true, datos: parsed.data, crudo: parsed.data };
}
