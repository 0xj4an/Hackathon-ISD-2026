/**
 * Pasa la señal ya decidida por MedPsy y valida el JSON.
 *
 * Si el teléfono y el pueblo fallan, no se inventa nada: la pantalla sigue
 * mostrando las reglas (`ADR-005`, `ADR-007`).
 */
import { pedirMensaje, type AlertaParse } from "./core/alerta";
import type { Medicion, Senal } from "./core/reglas";
import { completarMedPsy, soltarMedPsy } from "./medpsy";
import { recordError } from "./perf/logger";
import { reportarAlertaSentry } from "./sentry";

function motivoDe(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const t = raw.toLowerCase();
  if (t.includes("download") || t.includes("bajando") || t.includes("asset")) {
    return "No se pudo bajar o abrir MedPsy en este teléfono.";
  }
  if (t.includes("loadmodel") || t.includes("load model") || t.includes("cargando")) {
    return "MedPsy no cargó en memoria.";
  }
  if (t.includes("worker") || t.includes("bare")) {
    return "El motor de QVAC no arrancó.";
  }
  if (t.includes("oom") || t.includes("memory") || t.includes("alloc")) {
    return "El teléfono se quedó sin memoria al correr MedPsy.";
  }
  return raw.trim() || "No pude redactar.";
}

export async function redactarAlerta(
  senal: Senal,
  mediciones: Medicion[],
  onProgreso?: (detalle: string) => void,
): Promise<AlertaParse> {
  const t0 = Date.now();
  try {
    const r = await pedirMensaje(
      ({ system, user, temp }) => completarMedPsy({
        system,
        user,
        temp,
        task: "alerta",
        // Solo {"mensaje":"…"} — 220 tokens invitaba a basura y JSON cortado (Sentry parse).
        predict: 120,
        onProgreso: p => onProgreso?.(p.detalle),
      }),
      senal,
      mediciones,
    );
    reportarAlertaSentry({ ok: r.ok, ms: Date.now() - t0, motivoCode: r.ok ? undefined : "parse" });
    return r;
  } catch (err) {
    recordError("alerta", err);
    const stack = err instanceof Error ? err.stack : undefined;
    const msg = err instanceof Error ? err.message : String(err);
    reportarAlertaSentry({ ok: false, ms: Date.now() - t0, motivoCode: "crash" });
    return {
      ok: false,
      motivo: motivoDe(err),
      tecnico: stack ?? msg ?? "sin detalle",
    };
  } finally {
    await soltarMedPsy();
  }
}
