/**
 * Reglas de detección sobre el historial de mediciones.
 *
 * El LLM NO decide la señal, solo la explica (`ADR-005`). Cada umbral y cada
 * precio de este archivo sale de una fuente citada en `.ai/references/salud.md`.
 * Ninguno es criterio del equipo: nadie aquí es profesional de salud.
 */

/** Tipos que Health Connect expone y que sabemos interpretar. */
export type TipoMedicion =
  | "glucosa_ayunas"          // BloodGlucoseRecord con relationToMeal = ayunas
  | "presion_sist"            // BloodPressureRecord.systolic
  | "presion_diast"           // BloodPressureRecord.diastolic
  | "pulso_reposo"            // RestingHeartRateRecord
  | "saturacion_o2"           // OxygenSaturationRecord
  | "temperatura"             // BodyTemperatureRecord
  | "frecuencia_respiratoria" // RespiratoryRateRecord
  | "peso"                    // WeightRecord
  | "estatura";               // HeightRecord, en metros

export type Medicion = { ts: string; tipo: TipoMedicion; valor: number };

/** Precio orientativo de un examen. Sin fuente no se pone número. */
export type CostoEstimado = { min_usd: number; max_usd: number; fuente: string };

/**
 * Qué tiene que hacer la persona. Es lo único que de verdad le importa: no el
 * número, sino si sale ahora, se hace un examen, o lo menciona en su próxima
 * consulta.
 */
export type TipoRuta =
  | "emergencia"          // salir hacia un centro de salud ahora
  | "autocuidado"         // algo que hace la persona en el momento
  | "consulta"            // que la vea alguien
  | "examen"              // hacerse un examen
  | "examen_y_consulta";  // examen primero, después que se lo lean

export type Ruta = {
  tipo: TipoRuta;
  /** Qué hacer en este momento, antes de moverse. Ausente si no aplica. */
  ahora?: string;
  /** Qué examen, si la ruta lo incluye. */
  examen?: string;
  /** Dónde se resuelve: casa, centro de salud, laboratorio. */
  donde: string;
  /**
   * A quién le corresponde. En Panamá la puerta de entrada es medicina general
   * en el centro de salud; el especialista es a dónde suele derivar, no a dónde
   * ir directo. Decidir la derivación es acto médico, no nuestro.
   */
  especialista: string;
  /** Síntomas que obligan a ir de inmediato aunque la ruta diga otra cosa. */
  vigilar?: string;
};

export type Senal = {
  codigo: string;
  /**
   * El hallazgo dicho como se lo dirías a la persona, en segunda persona y en
   * tres o cuatro palabras. `descripcion` es preciso y clínico, y sirve para
   * auditar; esto es lo que se lee primero en pantalla. Los dos hacen falta.
   */
  titulo: string;
  /** La cifra que disparó la regla, separada para poder enseñarla grande. */
  medida: { valor: string; unidad: string; referencia: string };
  descripcion: string;
  /** Qué hacer. Reemplaza al texto libre que había antes. */
  ruta: Ruta;
  /** Ausente cuando no hay un precio publicado que citar. */
  costo?: CostoEstimado;
  urgencia: "Rutinaria" | "Prioritaria" | "Inmediata";
  /** De dónde sale el umbral que disparó esta señal. */
  fuente: string;
};

// Destinos y responsables, para no repetirlos en cada señal.
const CENTRO = "Centro de salud";
const LAB = "Laboratorio";
const CASA = "En casa";
const GENERAL = "Medicina general";
const URGENCIAS = "Urgencias";

// Precios en Panamá, en balboas (B/.), que está a la par con el dólar.
//
// Son rangos de laboratorios y clínicas PRIVADAS. Se cotiza lo privado a
// propósito: es el peor caso para el bolsillo. En un centro de salud del MINSA
// puede costar menos o nada, y entonces la persona queda mejor de lo que la app
// dijo, nunca peor. No encontramos tarifa publicada del MINSA para citarla.
const AVISO_MINSA = "Precio de laboratorio o clínica privada. En un centro de salud del MINSA puede costar menos o nada";

const PRECIO_GLUCOSA: CostoEstimado = {
  min_usd: 6, max_usd: 15,
  fuente: `Rangos publicados de laboratorios en Panamá (chequeandome.com.pa). ${AVISO_MINSA}`,
};
const PRECIO_ECG: CostoEstimado = {
  min_usd: 20, max_usd: 45,
  fuente: `Clínicas en Panamá: trazo desde ~B/. 28, informado por cardiología ~B/. 45. ${AVISO_MINSA}`,
};
const PRECIO_CONSULTA: CostoEstimado = {
  min_usd: 8, max_usd: 25,
  fuente: `Consulta de medicina general en Panamá, la mayoría entre B/. 12 y 15 (chequeandome.com.pa). ${AVISO_MINSA}`,
};

const ultimos = (m: Medicion[], tipo: TipoMedicion, n: number) =>
  m.filter(x => x.tipo === tipo).slice(-n).map(x => x.valor);

const promedio = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export function detectarSenales(m: Medicion[]): Senal[] {
  const out: Senal[] = [];

  // --- Hipoglucemia. Es aguda: una sola lectura basta, no se espera tendencia.
  // ADA: nivel 1 entre 54 y 70 (valor de alerta), nivel 2 por debajo de 54
  // (hipoglucemia clínicamente significativa, requiere acción inmediata).
  const gluTodas = m.filter(x => x.tipo === "glucosa_ayunas").map(x => x.valor);
  const gluBaja = gluTodas.slice(-3).find(v => v < 70);
  if (gluBaja !== undefined) {
    const grave = gluBaja < 54;
    out.push({
      codigo: grave ? "GLU_MUY_BAJA" : "GLU_BAJA",
      titulo: grave ? "Tu azúcar está muy baja" : "Tu azúcar está baja",
      medida: { valor: gluBaja.toFixed(0), unidad: "mg/dL", referencia: "Lo normal es 70 o más" },
      descripcion: `glucosa en ${gluBaja.toFixed(0)} mg/dL (por debajo de ${grave ? 54 : 70})`,
      ruta: grave
        ? { tipo: "emergencia", ahora: "Tomar azúcar de absorción rápida ahora mismo", donde: `${CENTRO}, ahora`, especialista: URGENCIAS, vigilar: "Confusión, temblor, sudor frío o desmayo" }
        : { tipo: "autocuidado", ahora: "Tomar azúcar de absorción rápida", donde: `${CASA}. Consulta si se repite`, especialista: GENERAL, vigilar: "Si vuelve a bajar o aparece confusión" },
      urgencia: grave ? "Inmediata" : "Prioritaria",
      fuente: grave
        ? "ADA: por debajo de 54 mg/dL es hipoglucemia clínicamente significativa, requiere acción inmediata"
        : "ADA: entre 54 y 70 mg/dL es valor de alerta de hipoglucemia, requiere carbohidrato de acción rápida",
    });
  }

  // --- Glucosa en ayunas alta. ADA: 100 a 125 alterada, 126 o más criterio de diabetes.
  const glu = ultimos(m, "glucosa_ayunas", 3);
  if (glu.length >= 3) {
    const prom = promedio(glu);
    if (prom >= 126) {
      out.push({
        codigo: "GLU_ALTA",
        titulo: "Tu azúcar está alta",
        medida: { valor: prom.toFixed(0), unidad: "mg/dL en ayunas", referencia: "Lo normal es menos de 100" },
        descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL en las últimas 3 tomas (referencia menor a 100)`,
        ruta: { tipo: "examen_y_consulta", examen: "Glucosa en ayunas en laboratorio para confirmar", donde: `${LAB}, luego ${CENTRO.toLowerCase()}`, especialista: `${GENERAL}, puede derivar a endocrinología`, vigilar: "Sed intensa, orinar mucho, bajar de peso sin querer" },
        costo: PRECIO_GLUCOSA,
        urgencia: "Prioritaria",
        fuente: "ADA, Standards of Care: 126 mg/dL o más en ayunas es criterio diagnóstico de diabetes",
      });
    } else if (prom >= 100) {
      out.push({
        codigo: "GLU_LIMITE",
        titulo: "Tu azúcar está en el límite",
        medida: { valor: prom.toFixed(0), unidad: "mg/dL en ayunas", referencia: "Lo normal es menos de 100" },
        descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL (referencia menor a 100)`,
        ruta: { tipo: "examen", examen: "Glucosa en ayunas en laboratorio", donde: LAB, especialista: GENERAL },
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
    // La cifra y su unidad van sueltas: la pantalla la enseña grande y no
    // puede partir una frase. "la alta" y "la baja" es como se dice.
    const cifra = sistAlta && diastAlta ? `${promedio(sist).toFixed(0)}/${promedio(diast).toFixed(0)}`
      : sistAlta ? promedio(sist).toFixed(0) : promedio(diast).toFixed(0);
    const unidadPresion = sistAlta && diastAlta ? "mmHg"
      : sistAlta ? "mmHg, la alta" : "mmHg, la baja";
    out.push({
      codigo: "PRES_ALTA",
      titulo: "Tu presión está alta",
      medida: { valor: cifra, unidad: unidadPresion, referencia: "Lo normal es menos de 140/90" },
      descripcion: `presión ${cual} alta en 3 tomas: ${cifras} mmHg (referencia menor a 140/90)`,
      ruta: { tipo: "consulta", examen: "Toma de presión en días distintos para confirmar", donde: CENTRO, especialista: `${GENERAL}, puede derivar a cardiología`, vigilar: "Dolor de cabeza fuerte, visión borrosa o dolor en el pecho" },
      costo: PRECIO_CONSULTA,
      urgencia: "Prioritaria",
      fuente: "OMS: hipertensión es 140/90 mmHg o más, medida en dos días diferentes",
    });
  }

  // --- Pulso en reposo. Taquicardia por encima de 100 lpm sostenido.
  const pulso = ultimos(m, "pulso_reposo", 5);
  if (pulso.length >= 5 && pulso.every(v => v > 100)) {
    out.push({
      codigo: "TAQUI",
      titulo: "Tu pulso está acelerado",
      medida: { valor: promedio(pulso).toFixed(0), unidad: "por minuto en reposo", referencia: "Lo normal es entre 60 y 100" },
      descripcion: "pulso en reposo por encima de 100 durante 5 días",
      ruta: { tipo: "examen_y_consulta", examen: "Electrocardiograma", donde: CENTRO, especialista: `${GENERAL}, puede derivar a cardiología`, vigilar: "Dolor en el pecho, desmayo o falta de aire" },
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
      titulo: "Tu oxígeno está muy bajo",
      medida: { valor: satCritica.toFixed(0), unidad: "% de oxígeno", referencia: "Lo normal es 95 o más" },
      descripcion: `saturación de oxígeno en ${satCritica.toFixed(0)}% (por debajo de 90%)`,
      ruta: { tipo: "emergencia", donde: `${CENTRO}, ahora`, especialista: URGENCIAS, vigilar: "Falta de aire en reposo o labios azulados" },
      urgencia: "Inmediata",
      fuente: "Por debajo de 90% de saturación se considera que requiere atención médica inmediata",
    });
  } else {
    const sat3 = sat.slice(-3);
    if (sat3.length >= 3 && sat3.every(v => v < 95)) {
      out.push({
        codigo: "SAT_BAJA",
        titulo: "Tu oxígeno está bajo",
        medida: { valor: promedio(sat3).toFixed(0), unidad: "% de oxígeno", referencia: "Lo normal es 95 o más" },
        descripcion: `saturación de oxígeno por debajo de 95% en 3 mediciones (promedio ${promedio(sat3).toFixed(0)}%)`,
        ruta: { tipo: "consulta", examen: "Medición con oxímetro en el centro de salud", donde: CENTRO, especialista: `${GENERAL}, puede derivar a neumología`, vigilar: "Falta de aire en reposo o labios azulados" },
        costo: PRECIO_CONSULTA,
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
      titulo: "Tienes fiebre",
      medida: { valor: fiebre.toFixed(1), unidad: "grados", referencia: "Hay fiebre desde 38" },
      descripcion: `temperatura de ${fiebre.toFixed(1)} grados (fiebre a partir de 38)`,
      ruta: { tipo: "consulta", ahora: "Hidratarse y reposo", donde: CENTRO, especialista: GENERAL, vigilar: "Dolor abdominal intenso, vómito persistente, sangrado de encías o nariz. Con cualquiera de estos, acudir de inmediato" },
      costo: PRECIO_CONSULTA,
      urgencia: "Prioritaria",
      fuente: "38 grados o más se considera fiebre. Los signos de alarma citados son los de la OMS para dengue grave",
    });
  }

  // --- Frecuencia respiratoria. Normal en adultos: 12 a 20 por minuto.
  const resp = m.filter(x => x.tipo === "frecuencia_respiratoria").map(x => x.valor);
  const respUlt = resp.slice(-3);
  const respAlta = respUlt.find(v => v > 25);
  if (respAlta !== undefined) {
    out.push({
      codigo: "RESP_MUY_ALTA",
      titulo: "Respiras muy rápido",
      medida: { valor: respAlta.toFixed(0), unidad: "respiraciones por minuto", referencia: "Lo normal es entre 12 y 20" },
      descripcion: `frecuencia respiratoria de ${respAlta.toFixed(0)} por minuto (normal 12 a 20)`,
      ruta: { tipo: "emergencia", donde: `${CENTRO}, ahora`, especialista: URGENCIAS, vigilar: "Falta de aire o dolor en el pecho" },
      urgencia: "Inmediata",
      fuente: "Por encima de 25 respiraciones por minuto en adultos se considera señal de alarma",
    });
  } else if (respUlt.length >= 3 && respUlt.every(v => v > 20)) {
    out.push({
      codigo: "RESP_ALTA",
      titulo: "Respiras rápido",
      medida: { valor: promedio(respUlt).toFixed(0), unidad: "respiraciones por minuto", referencia: "Lo normal es entre 12 y 20" },
      descripcion: `frecuencia respiratoria por encima de 20 por minuto en 3 mediciones (promedio ${promedio(respUlt).toFixed(0)})`,
      ruta: { tipo: "consulta", donde: CENTRO, especialista: GENERAL, vigilar: "Falta de aire o dolor en el pecho" },
      costo: PRECIO_CONSULTA,
      urgencia: "Prioritaria",
      fuente: "Taquipnea en adultos es más de 20 respiraciones por minuto. Normal: 12 a 20",
    });
  }

  // --- Índice de masa corporal. Necesita peso y estatura.
  const pesos = m.filter(x => x.tipo === "peso");
  const estatura = m.filter(x => x.tipo === "estatura").slice(-1)[0]?.valor;
  const pesoUlt = pesos.slice(-1)[0]?.valor;
  if (pesoUlt !== undefined && estatura !== undefined && estatura > 0.5 && estatura < 2.6) {
    const imc = pesoUlt / (estatura * estatura);
    if (imc >= 30) {
      out.push({
        codigo: "IMC_OBESIDAD",
        titulo: "Tu peso está muy alto para tu estatura",
        medida: { valor: imc.toFixed(1), unidad: "de masa corporal", referencia: "Lo normal es menos de 25" },
        descripcion: `índice de masa corporal de ${imc.toFixed(1)} (obesidad a partir de 30)`,
        ruta: { tipo: "examen_y_consulta", examen: "Glucosa en ayunas y perfil lipídico", donde: `${LAB}, luego ${CENTRO.toLowerCase()}`, especialista: `${GENERAL}, puede derivar a nutrición` },
        costo: PRECIO_GLUCOSA,
        urgencia: "Rutinaria",
        fuente: "OMS: en adultos, IMC de 30 o más es obesidad. El IMC es un indicador aproximado de grasa corporal",
      });
    } else if (imc >= 25) {
      out.push({
        codigo: "IMC_SOBREPESO",
        titulo: "Tu peso está alto para tu estatura",
        medida: { valor: imc.toFixed(1), unidad: "de masa corporal", referencia: "Lo normal es menos de 25" },
        descripcion: `índice de masa corporal de ${imc.toFixed(1)} (sobrepeso a partir de 25)`,
        ruta: { tipo: "consulta", donde: CENTRO, especialista: `${GENERAL} o nutrición` },
        costo: PRECIO_CONSULTA,
        urgencia: "Rutinaria",
        fuente: "OMS: en adultos, IMC de 25 o más es sobrepeso. El IMC es un indicador aproximado de grasa corporal",
      });
    }
  }

  // --- Pérdida de peso involuntaria. Más del 5% en 6 meses amerita estudio.
  if (pesos.length >= 2) {
    const primero = pesos[0], ultimo = pesos[pesos.length - 1];
    const dias = (Date.parse(ultimo.ts) - Date.parse(primero.ts)) / 86400000;
    const caida = (primero.valor - ultimo.valor) / primero.valor;
    if (Number.isFinite(dias) && dias >= 60 && dias <= 400 && caida > 0.05) {
      out.push({
        codigo: "PESO_BAJA",
        titulo: "Estás bajando de peso",
        medida: { valor: `${(caida * 100).toFixed(0)}%`, unidad: "de tu peso", referencia: `De ${primero.valor.toFixed(1)} a ${ultimo.valor.toFixed(1)} kg` },
        descripcion: `pérdida de ${(caida * 100).toFixed(0)}% del peso en ${Math.round(dias)} días, de ${primero.valor.toFixed(1)} a ${ultimo.valor.toFixed(1)} kg`,
        ruta: { tipo: "consulta", donde: CENTRO, especialista: GENERAL, vigilar: "Si la pérdida no fue intencional, amerita estudio" },
        costo: PRECIO_CONSULTA,
        urgencia: "Prioritaria",
        fuente: "Perder más del 5% del peso corporal en 6 a 12 meses sin proponérselo amerita evaluación médica",
      });
    }
  }

  return out;
}
