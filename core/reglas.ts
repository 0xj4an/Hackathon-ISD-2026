/**
 * Reglas de detección sobre el historial de mediciones (vía A).
 *
 * El LLM NO decide la señal, solo la explica (`ADR-005`). Cada umbral y cada
 * precio de este archivo sale de una fuente citada en `.ai/references/salud.md`.
 * Ninguno es criterio del equipo: nadie aquí es profesional de salud.
 */

/** Tipos que Health Connect expone y que sabemos interpretar. */
export type TipoMedicion =
  | "glucosa_ayunas"   // BloodGlucoseRecord con relationToMeal = ayunas
  | "presion_sist"     // BloodPressureRecord.systolic
  | "presion_diast"    // BloodPressureRecord.diastolic
  | "pulso_reposo"     // RestingHeartRateRecord
  | "saturacion_o2"    // OxygenSaturationRecord
  | "temperatura"      // BodyTemperatureRecord
  | "peso";            // WeightRecord

export type Medicion = { ts: string; tipo: TipoMedicion; valor: number };

/** Precio orientativo de un examen. Sin fuente no se pone número. */
export type CostoEstimado = { min_usd: number; max_usd: number; fuente: string };

export type Senal = {
  codigo: string;
  descripcion: string;
  examen: string;
  /** Ausente cuando no hay un precio publicado que citar. */
  costo?: CostoEstimado;
  urgencia: "Rutinaria" | "Prioritaria" | "Inmediata";
  /** De dónde sale el umbral que disparó esta señal. */
  fuente: string;
};

// Precios de laboratorio en Panamá. Rangos publicados, no precios de un
// laboratorio concreto: varían por sede, promoción y paquete.
const PRECIO_GLUCOSA: CostoEstimado = {
  min_usd: 6, max_usd: 15,
  fuente: "Rangos publicados de laboratorios en Panamá (chequeandome.com.pa). Aproximado, varía por laboratorio",
};
const PRECIO_ECG: CostoEstimado = {
  min_usd: 20, max_usd: 45,
  fuente: "Clínicas en Panamá: trazo desde ~$28, informado por cardiología ~$45. Aproximado",
};

const ultimos = (m: Medicion[], tipo: TipoMedicion, n: number) =>
  m.filter(x => x.tipo === tipo).slice(-n).map(x => x.valor);

const promedio = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export function detectarSenales(m: Medicion[]): Senal[] {
  const out: Senal[] = [];

  // --- Glucosa en ayunas. ADA: 100 a 125 alterada, 126 o más criterio de diabetes.
  const glu = ultimos(m, "glucosa_ayunas", 3);
  if (glu.length >= 3) {
    const prom = promedio(glu);
    if (prom >= 126) {
      out.push({
        codigo: "GLU_ALTA",
        descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL en las últimas 3 tomas (referencia menor a 100)`,
        examen: "Glucosa en ayunas en laboratorio para confirmar. El médico puede añadir hemoglobina glicosilada (HbA1c)",
        costo: PRECIO_GLUCOSA,
        urgencia: "Prioritaria",
        fuente: "ADA, Standards of Care: 126 mg/dL o más en ayunas es criterio diagnóstico de diabetes",
      });
    } else if (prom >= 100) {
      out.push({
        codigo: "GLU_LIMITE",
        descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL (referencia menor a 100)`,
        examen: "Glucosa en ayunas en laboratorio",
        costo: PRECIO_GLUCOSA,
        urgencia: "Rutinaria",
        fuente: "ADA, Standards of Care: 100 a 125 mg/dL en ayunas es glucosa alterada en ayunas",
      });
    }
  }

  // --- Presión arterial. La OMS define hipertensión por sistólica O diastólica.
  // Antes solo se miraba la sistólica: alguien con 130/95 no se detectaba.
  const sist = ultimos(m, "presion_sist", 3);
  const diast = ultimos(m, "presion_diast", 3);
  const sistAlta = sist.length >= 3 && sist.every(v => v >= 140);
  const diastAlta = diast.length >= 3 && diast.every(v => v >= 90);
  if (sistAlta || diastAlta) {
    const cual = sistAlta && diastAlta ? "sistólica y diastólica"
      : sistAlta ? "sistólica" : "diastólica";
    const cifras = sistAlta && diastAlta ? `${promedio(sist).toFixed(0)}/${promedio(diast).toFixed(0)}`
      : sistAlta ? `${promedio(sist).toFixed(0)} de sistólica`
      : `${promedio(diast).toFixed(0)} de diastólica`;
    out.push({
      codigo: "PRES_ALTA",
      descripcion: `presión ${cual} alta en 3 tomas: ${cifras} mmHg (referencia menor a 140/90)`,
      examen: "Toma de presión en un centro de salud, en días distintos, para confirmar",
      urgencia: "Prioritaria",
      fuente: "OMS: hipertensión es 140/90 mmHg o más, medida en dos días diferentes",
    });
  }

  // --- Pulso en reposo. Taquicardia por encima de 100 lpm sostenido.
  const pulso = ultimos(m, "pulso_reposo", 5);
  if (pulso.length >= 5 && pulso.every(v => v > 100)) {
    out.push({
      codigo: "TAQUI",
      descripcion: "pulso en reposo por encima de 100 durante 5 días",
      examen: "Electrocardiograma y consulta general",
      costo: PRECIO_ECG,
      urgencia: "Prioritaria",
      fuente: "Rango normal de pulso en reposo en adultos: 60 a 100 lpm. Por encima de 100 es taquicardia",
    });
  }

  // --- Saturación de oxígeno. Un valor por debajo de 90 no espera tendencia.
  const sat = m.filter(x => x.tipo === "saturacion_o2").map(x => x.valor);
  const satCritica = sat.slice(-3).find(v => v < 90);
  if (satCritica !== undefined) {
    out.push({
      codigo: "SAT_CRITICA",
      descripcion: `saturación de oxígeno en ${satCritica.toFixed(0)}% (por debajo de 90%)`,
      examen: "Acudir a un centro de salud ahora",
      urgencia: "Inmediata",
      fuente: "Por debajo de 90% de saturación se considera que requiere atención médica inmediata",
    });
  } else {
    const sat3 = sat.slice(-3);
    if (sat3.length >= 3 && sat3.every(v => v < 95)) {
      out.push({
        codigo: "SAT_BAJA",
        descripcion: `saturación de oxígeno por debajo de 95% en 3 mediciones (promedio ${promedio(sat3).toFixed(0)}%)`,
        examen: "Consulta general y medición con oxímetro en el centro de salud",
        urgencia: "Prioritaria",
        fuente: "Saturación normal en adultos: 95 a 100%. Por debajo de 95% se considera anormal",
      });
    }
  }

  // --- Temperatura. Fiebre a partir de 38 grados.
  // No se infiere ninguna enfermedad a partir de la fiebre sola.
  const temp = m.filter(x => x.tipo === "temperatura").map(x => x.valor);
  const fiebre = temp.slice(-3).find(v => v >= 38);
  if (fiebre !== undefined) {
    out.push({
      codigo: "FIEBRE",
      descripcion: `temperatura de ${fiebre.toFixed(1)} grados (fiebre a partir de 38)`,
      examen: "Consulta general. Si aparece dolor abdominal intenso, vómito persistente o sangrado, acudir de inmediato",
      urgencia: "Prioritaria",
      fuente: "38 grados o más se considera fiebre. Los signos de alarma citados son los de la OMS para dengue grave",
    });
  }

  return out;
}
