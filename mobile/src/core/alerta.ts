/**
 * MedPsy redacta la alerta. Las reglas ya decidieron (`ADR-005`).
 *
 * Aquí no hay SDK: se serializa la señal, se limpia el JSON del modelo y se
 * pisan ruta, costo, urgencia y fuente con lo que salió de `reglas.ts`. El
 * único campo que se conserva del modelo es `mensaje`.
 */
import { AlertaSchema, type Alerta } from "./schemas.ts";
import { DISCLAIMER, SYSTEM_ALERTA, limpiarJson, userAlerta } from "./prompts.ts";
import type { Medicion, Senal } from "./reglas.ts";

export type PayloadSenal = {
  senal: string;
  descripcion: string;
  medida: Senal["medida"];
  ruta_tipo: Senal["ruta"]["tipo"];
  ruta_ahora: string | null;
  ruta_examen: string | null;
  ruta_donde: string;
  ruta_especialista: string;
  ruta_vigilar: string | null;
  costo_min_usd: number | null;
  costo_max_usd: number | null;
  costo_nota: string | null;
  urgencia: Senal["urgencia"];
  fuente: string;
  disclaimer: string;
};

export type AlertaOk = { ok: true; alerta: Alerta };
/** `motivo` es lo que lee la persona. `tecnico` es dump para depurar. */
export type AlertaFallo = { ok: false; motivo: string; tecnico: string };
export type AlertaParse = AlertaOk | AlertaFallo;

export type CompletarAlerta = (opts: {
  system: string;
  user: string;
  temp: number;
}) => Promise<string>;

const MAX_TECNICO = 1200;

export function payloadSenal(s: Senal): PayloadSenal {
  return {
    senal: s.titulo,
    descripcion: s.descripcion,
    medida: s.medida,
    ruta_tipo: s.ruta.tipo,
    ruta_ahora: s.ruta.ahora ?? null,
    ruta_examen: s.ruta.examen ?? null,
    ruta_donde: s.ruta.donde,
    ruta_especialista: s.ruta.especialista,
    ruta_vigilar: s.ruta.vigilar ?? null,
    costo_min_usd: s.costo?.min_usd ?? null,
    costo_max_usd: s.costo?.max_usd ?? null,
    costo_nota: s.costo?.fuente ?? null,
    urgencia: s.urgencia,
    fuente: s.fuente,
    disclaimer: DISCLAIMER,
  };
}

export function textoMediciones(m: Medicion[]): string {
  return m.slice(-20).map(x => `${x.ts.slice(0, 10)} ${x.tipo} ${x.valor}`).join("\n");
}

function sinNull<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

function recortar(s: string): string {
  const t = s.trim();
  return t.length <= MAX_TECNICO ? t : `${t.slice(0, MAX_TECNICO)}…`;
}

function fallo(motivo: string, tecnico: string): AlertaFallo {
  return { ok: false, motivo, tecnico: recortar(tecnico) };
}

export function parsearAlerta(bruto: string, senal: Senal): AlertaParse {
  const limpio = limpiarJson(bruto);
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch (err) {
    const porque = err instanceof Error ? err.message : String(err);
    return fallo(
      "MedPsy no devolvió JSON válido.",
      `parse: ${porque}\n--- bruto ---\n${bruto}\n--- limpio ---\n${limpio}`,
    );
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return fallo(
      "MedPsy devolvió algo que no es un objeto JSON.",
      `tipo: ${Array.isArray(json) ? "array" : typeof json}\n--- bruto ---\n${bruto}`,
    );
  }

  const crudo = json as Record<string, unknown>;
  const mensaje = typeof crudo.mensaje === "string" ? crudo.mensaje.trim() : "";
  if (!mensaje) {
    return fallo(
      "MedPsy no escribió el campo mensaje.",
      `claves: ${Object.keys(crudo).join(", ") || "(ninguna)"}\n--- bruto ---\n${bruto}`,
    );
  }

  const p = payloadSenal(senal);
  const parsed = AlertaSchema.safeParse(sinNull({
    ...p,
    mensaje,
  }));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fallo(
      "La alerta no pasó la validación del schema.",
      `zod:\n${issues}\n--- mensaje ---\n${mensaje}\n--- bruto ---\n${bruto}`,
    );
  }
  return { ok: true, alerta: parsed.data };
}

export async function pedirMensaje(
  completar: CompletarAlerta,
  senal: Senal,
  mediciones: Medicion[],
): Promise<AlertaParse> {
  const user = userAlerta(textoMediciones(mediciones), JSON.stringify(payloadSenal(senal)));
  let ultimo: AlertaParse = fallo(
    "No pude redactar. Intenta de nuevo.",
    "sin intentos",
  );
  const intentos: string[] = [];
  for (const temp of [0.1, 0] as const) {
    const bruto = await completar({ system: SYSTEM_ALERTA, user, temp });
    ultimo = parsearAlerta(bruto, senal);
    if (ultimo.ok) return ultimo;
    intentos.push(`temp=${temp}\nmotivo=${ultimo.motivo}\n${ultimo.tecnico}`);
  }
  return fallo(
    ultimo.ok ? "No pude redactar. Intenta de nuevo." : ultimo.motivo,
    `2 intentos (temp 0.1 y 0)\n\n${intentos.join("\n\n====\n\n")}`,
  );
}
