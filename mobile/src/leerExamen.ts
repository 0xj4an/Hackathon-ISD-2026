/**
 * Vía B: foto del examen → OCR → MedPsy+LoRA → clasificar().
 *
 * El modelo solo transcribe. Rangos y urgencia salen de `marcadores.ts`.
 */
import { SYSTEM_EXTRACCION_LABORATORIO } from "./core/prompts";
import { parsearLaboratorio } from "./core/laboratorio";
import { buscarMarcador, clasificar, type LecturaLab, type Sexo } from "./core/marcadores";
import { completarMedPsy, soltarMedPsy } from "./medpsy";
import { LORA_LAB_VERSION } from "./lora";
import {
  leerOcrDeUri,
  mensajeLectura,
  soltarLectores,
  type ProgresoLectura,
} from "./leerDocumento";
import { getAppLogger, recordError } from "./perf/logger";

export type ResultadoExamen =
  | { ok: true; lecturas: LecturaLab[]; textoOcr: string; lora: string | null }
  | { ok: false; error: string; textoOcr?: string };

const ORDEN = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 } as const;

export async function leerExamenFoto(
  uri: string,
  sexo: Sexo,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<ResultadoExamen> {
  const aviso = (p: ProgresoLectura) => onProgreso?.(p);
  let textoOcr = "";
  try {
    const ocr = await leerOcrDeUri(uri, aviso);
    textoOcr = ocr.texto;
    if (!textoOcr.trim()) {
      return { ok: false, error: "No se leyó texto. Más luz o más de frente.", textoOcr };
    }
    await soltarLectores();

    aviso({ paso: "extraccion", detalle: `Sacando marcadores (${LORA_LAB_VERSION})` });
    const bruto = await completarMedPsy({
      system: SYSTEM_EXTRACCION_LABORATORIO,
      user: textoOcr + (typeof ocr.confianza === "number"
        ? `\nOCR confidence (mean): ${ocr.confianza.toFixed(2)}`
        : ""),
      task: "extraccion",
      temp: 0.1,
      predict: 512,
      conLora: true,
      onProgreso: p => aviso({ paso: "extraccion", pct: p.pct, detalle: p.detalle }),
    });
    const parsed = parsearLaboratorio(bruto);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, textoOcr };
    }

    const lecturas: LecturaLab[] = [];
    for (const l of parsed.datos.lecturas) {
      const m = buscarMarcador(l.codigo) ?? buscarMarcador(l.nombre);
      if (!m) continue;
      lecturas.push(clasificar(m, l.valor, sexo));
    }
    if (lecturas.length === 0) {
      return {
        ok: false,
        error: "Leí el papel, pero no reconocí ningún marcador del catálogo.",
        textoOcr,
      };
    }

    getAppLogger().info(`examen ${lecturas.length} marcadores lora=${LORA_LAB_VERSION}`);
    return {
      ok: true,
      lecturas: lecturas.sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]),
      textoOcr,
      lora: LORA_LAB_VERSION,
    };
  } catch (err) {
    recordError("examen.foto", err);
    return { ok: false, error: mensajeLectura(err), textoOcr };
  } finally {
    await soltarLectores();
    await soltarMedPsy(true);
  }
}
