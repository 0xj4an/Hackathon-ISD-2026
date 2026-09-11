/**
 * Examen de laboratorio: foto → OCR → MedPsy+LoRA → clasificar().
 *
 * El modelo solo transcribe. Rangos y urgencia salen de `marcadores.ts`.
 */
import { SYSTEM_EXTRACCION_LABORATORIO } from "./core/prompts";
import { formatearDiagnosticoExamen, parsearLaboratorio } from "./core/laboratorio";
import { buscarMarcador, clasificar, type LecturaLab, type Sexo } from "./core/marcadores";
import { completarMedPsy, soltarMedPsy } from "./medpsy";
import { saltarMedPsyLocal } from "./modo";
import { LORA_LAB_VERSION } from "./lora";
import {
  borrarUriFoto,
  leerOcrDeUri,
  mensajeLectura,
  soltarLectores,
  type ProgresoLectura,
} from "./leerDocumento";
import { getAppLogger, recordError } from "./perf/logger";
import { breadcrumbLectura, reportarLoteLecturaSentry } from "./sentry";

export type ResultadoExamen =
  | { ok: true; lecturas: LecturaLab[]; textoOcr: string; lora: string | null }
  | { ok: false; error: string; textoOcr?: string; diagnostico?: string };

const ORDEN = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 } as const;

function fallo(error: string, ocr: string, modelo: string): ResultadoExamen {
  const diagnostico = formatearDiagnosticoExamen({
    motivo: error,
    lora: saltarMedPsyLocal() ? null : LORA_LAB_VERSION,
    ocr,
    modelo,
  });
  getAppLogger().warn(`examen fallo\n${diagnostico}`);
  return { ok: false, error, textoOcr: ocr, diagnostico };
}

export async function leerExamenFoto(
  uri: string,
  sexo: Sexo,
  onProgreso?: (p: ProgresoLectura) => void,
): Promise<ResultadoExamen> {
  const aviso = (p: ProgresoLectura) => onProgreso?.(p);
  const t0 = Date.now();
  let textoOcr = "";
  breadcrumbLectura("lote.start", { n: 1, kind: "lab" });
  try {
    const ocr = await leerOcrDeUri(uri, aviso);
    textoOcr = ocr.texto;
    if (!textoOcr.trim()) {
      reportarLoteLecturaSentry({
        resultados: [{ kind: "lab", ok: false, chars: 0, ms: Date.now() - t0, errorCode: "empty" }],
        msTotal: Date.now() - t0,
      });
      return fallo("No se leyó texto. Más luz o más de frente.", textoOcr, "");
    }
    await soltarLectores();

    aviso({
      paso: "extraccion",
      detalle: saltarMedPsyLocal()
        ? "Delegando al nodo para sacar marcadores"
        : `MedPsy + LoRA sacando marcadores (${LORA_LAB_VERSION})`,
    });
    breadcrumbLectura("extract.start", { kind: "lab", chars: textoOcr.length });
    const bruto = await completarMedPsy({
      system: SYSTEM_EXTRACCION_LABORATORIO,
      user: textoOcr + (typeof ocr.confianza === "number"
        ? `\nOCR confidence (mean): ${ocr.confianza.toFixed(2)}`
        : ""),
      task: "extraccion",
      temp: 0.1,
      predict: 512,
      conLora: true,
      onProgreso: p => aviso({
        paso: "extraccion",
        pct: p.pct,
        detalle: p.detalle.includes("MedPsy") || p.detalle.includes("LoRA")
          ? p.detalle
          : `MedPsy + LoRA · ${p.detalle}`,
      }),
    });
    const parsed = parsearLaboratorio(bruto, textoOcr);
    if (!parsed.ok) {
      reportarLoteLecturaSentry({
        resultados: [{ kind: "lab", ok: false, chars: textoOcr.length, ms: Date.now() - t0, errorCode: "parse" }],
        msTotal: Date.now() - t0,
      });
      return fallo(parsed.error, textoOcr, bruto);
    }

    const lecturas: LecturaLab[] = [];
    for (const l of parsed.datos.lecturas) {
      const m = buscarMarcador(l.codigo) ?? buscarMarcador(l.nombre);
      if (!m) continue;
      lecturas.push(clasificar(m, l.valor, sexo));
    }
    if (lecturas.length === 0) {
      reportarLoteLecturaSentry({
        resultados: [{ kind: "lab", ok: false, chars: textoOcr.length, ms: Date.now() - t0, errorCode: "no_markers" }],
        msTotal: Date.now() - t0,
      });
      return fallo("Leí el papel, pero no reconocí ningún marcador del catálogo.", textoOcr, bruto);
    }

    getAppLogger().info(`examen ${lecturas.length} marcadores lora=${saltarMedPsyLocal() ? "nodo" : LORA_LAB_VERSION}`);
    breadcrumbLectura("extract.ok", { kind: "lab", n: lecturas.length, chars: textoOcr.length });
    reportarLoteLecturaSentry({
      resultados: [{
        kind: "lab",
        ok: true,
        chars: textoOcr.length,
        ms: Date.now() - t0,
        borrada: true,
      }],
      msTotal: Date.now() - t0,
    });
    return {
      ok: true,
      lecturas: lecturas.sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]),
      textoOcr,
      lora: saltarMedPsyLocal() ? null : LORA_LAB_VERSION,
    };
  } catch (err) {
    recordError("examen.foto", err);
    reportarLoteLecturaSentry({
      resultados: [{
        kind: "lab",
        ok: false,
        chars: textoOcr.length,
        ms: Date.now() - t0,
        errorCode: "crash",
      }],
      msTotal: Date.now() - t0,
    });
    return fallo(
      mensajeLectura(err),
      textoOcr,
      err instanceof Error ? (err.stack ?? err.message) : String(err),
    );
  } finally {
    borrarUriFoto(uri);
    await soltarLectores();
    await soltarMedPsy(true);
  }
}
