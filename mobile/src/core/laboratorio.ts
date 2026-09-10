/**
 * MedPsy + LoRA de lab. Parsea el JSON; clasificar() decide rangos (`ADR-005`).
 * Si el modelo no suelta JSON, se intenta el OCR (como en documentos).
 */
import { LaboratorioSchema, type Laboratorio } from "./schemas.ts";
import { limpiarJson } from "./prompts.ts";
import { MARCADORES } from "./marcadores.ts";

export type LabOk = { ok: true; datos: Laboratorio; crudo: unknown };
export type LabFallo = { ok: false; error: string; crudo: unknown };
export type LabParse = LabOk | LabFallo;

type CodigoLab = Laboratorio["lecturas"][number]["codigo"];
const CODIGOS = new Set<string>(["GLU", "HB", "PLQ", "CREA", "COL", "HTO", "TSH"]);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function tope(s: string, n = 3000): string {
  return s.length <= n ? s : `${s.slice(0, n)}\n…(${s.length} chars)`;
}

/** Bloque para pegar cuando el examen falla: OCR + lo que dijo el modelo. */
export function formatearDiagnosticoExamen(d: {
  motivo: string;
  lora: string | null;
  ocr: string;
  modelo: string;
}): string {
  return [
    "inaigar examen",
    `motivo: ${d.motivo}`,
    `lora: ${d.lora ?? "no"}`,
    `ocr_chars: ${d.ocr.length}`,
    `modelo_chars: ${d.modelo.length}`,
    "--- ocr ---",
    tope(d.ocr) || "(vacio)",
    "--- modelo ---",
    tope(d.modelo) || "(vacio)",
  ].join("\n");
}

export function lecturasDesdeOcr(ocr: string): Laboratorio["lecturas"] {
  const t = fold(ocr);
  const out: Laboratorio["lecturas"] = [];
  for (const m of MARCADORES) {
    if (!CODIGOS.has(m.codigo)) continue;
    const nombre = fold(m.nombre);
    const i = t.indexOf(nombre);
    if (i < 0) continue;
    const cola = t.slice(i + nombre.length, i + nombre.length + 80);
    const num = cola.match(/(\d+(?:[.,]\d+)?)/);
    if (!num) continue;
    const valor = Number(num[1].replace(",", "."));
    if (!Number.isFinite(valor)) continue;
    out.push({
      codigo: m.codigo as CodigoLab,
      nombre: m.nombre,
      valor,
      unidad: m.unidad,
    });
  }
  return out;
}

function fechaDesdeOcr(ocr: string): string | undefined {
  const iso = ocr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dmy = ocr.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/);
  if (!dmy) return undefined;
  return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
}

function desdeOcr(ocr: string | undefined, crudo: unknown, error: string): LabParse {
  if (!ocr?.trim()) return { ok: false, error, crudo };
  const lecturas = lecturasDesdeOcr(ocr);
  if (lecturas.length === 0) return { ok: false, error, crudo };
  return {
    ok: true,
    datos: { lecturas, fecha: fechaDesdeOcr(ocr), confianza: 0.5 },
    crudo: lecturas,
  };
}

export function parsearLaboratorio(bruto: string, textoOcr?: string): LabParse {
  const limpio = limpiarJson(bruto);
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    return desdeOcr(textoOcr, limpio, "El modelo no devolvió JSON del examen.");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return desdeOcr(textoOcr, json, "El JSON del examen no es un objeto.");
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
    return desdeOcr(textoOcr, o, "No se pudieron leer los marcadores del examen.");
  }
  return { ok: true, datos: parsed.data, crudo: parsed.data };
}
