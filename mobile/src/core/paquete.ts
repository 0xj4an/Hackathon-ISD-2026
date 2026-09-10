/**
 * El paquete: cuánto cuesta de verdad atender lo que se detectó.
 *
 * Sin esto no se puede ofrecer crédito con seriedad. Una consulta de B/. 15 no
 * se financia: nadie pide un préstamo para eso y ofrecerlo sería ruido. El
 * crédito tiene sentido cuando el costo total pesa, y eso solo se sabe sumando
 * consulta, exámenes, equipo y el tratamiento sostenido en el tiempo.
 *
 * Se cotiza el **límite superior** de cada rango. Para un crédito es lo
 * correcto: si el monto cubre el peor caso, la persona no queda a mitad de
 * camino. Y se cotiza lo privado, que en un centro del MINSA puede costar menos.
 *
 * Sobre los medicamentos: esto **no receta nada**. Estima lo que suele costar el
 * tratamiento habitual de una condición, para que la persona sepa a qué se
 * enfrenta. Qué tomar lo decide un médico, y la pantalla lo dice.
 */
import type { Senal } from "./reglas";

export type LineaCosto = {
  concepto: string;
  /** Balboas. B/. está a la par con el dólar. */
  min: number;
  max: number;
  fuente: string;
  /** true cuando no hay precio publicado que citar y es estimación nuestra. */
  estimado?: boolean;
};

export type Paquete = {
  titulo: string;
  lineas: LineaCosto[];
  total_min: number;
  total_max: number;
  meses: number;
  /** false cuando es tan barato que pedir crédito no tiene sentido. */
  vale_credito: boolean;
  nota: string;
};

/**
 * Cuándo ofrecer crédito. Dos condiciones, y las dos importan:
 *
 * 1. El paquete tiene que pesar. Por debajo de B/. 100 el trámite cuesta más
 *    que el examen y ofrecerlo sería ruido, o algo peor.
 * 2. Tiene que haber tratamiento sostenido. Un cuadro agudo se atiende hoy y se
 *    acaba; financiar una consulta que hay que hacerse ya solo pone un trámite
 *    en medio. El crédito es para lo crónico, que es donde el costo se estira
 *    en meses y de verdad se vuelve una barrera.
 */
const MINIMO_CREDITO = 100;

const AVISO_MINSA = "Precio privado. En un centro del MINSA puede costar menos o nada";
const DECRETO = "Precio tope oficial, Decreto Ejecutivo 36 del 30 sep 2025 (MICI)";
const RANGOS_PA = "Rangos publicados de laboratorios y clínicas en Panamá";

/** Meses de tratamiento que cubre el paquete de una condición crónica. */
const MESES_CRONICO = 3;

const CONSULTA: LineaCosto = {
  concepto: "Consulta de medicina general", min: 8, max: 25,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};
const CONTROL: LineaCosto = {
  concepto: "Consulta de control a los 3 meses", min: 8, max: 25,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};

/**
 * Paquetes por condición. La clave es la señal que los dispara; si un caso
 * dispara varias, se toma el paquete más completo y no se suman dos veces la
 * consulta.
 */
const PAQUETES: Record<string, Omit<Paquete, "total_min" | "total_max" | "vale_credito">> = {
  GLU_ALTA: {
    titulo: "Confirmar y empezar a tratar la diabetes",
    meses: MESES_CRONICO,
    nota: "Cubre confirmar el diagnóstico y los primeros 3 meses. El tratamiento lo decide el médico: esto solo estima lo que suele costar.",
    lineas: [
      CONSULTA,
      { concepto: "Glucosa en ayunas en laboratorio", min: 6, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Hemoglobina glicosilada (HbA1c)", min: 15, max: 30, fuente: "Sin precio publicado que citar. Estimado por comparación con otros exámenes de sangre en Panamá", estimado: true },
      { concepto: "Perfil lipídico", min: 8, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Glucómetro con tiras y lancetas", min: 25, max: 50, fuente: "Kit completo con 25 tiras y 200 lancetas en Panamá" },
      { concepto: "Metformina 850 mg, 2 al día por 3 meses (180 tabletas)", min: 94, max: 94, fuente: `${DECRETO}: B/. 0.52 por tableta` },
      CONTROL,
    ],
  },
  PRES_ALTA: {
    titulo: "Confirmar y controlar la presión",
    meses: MESES_CRONICO,
    nota: "Cubre confirmar el diagnóstico y los primeros 3 meses. El tratamiento lo decide el médico: esto solo estima lo que suele costar.",
    lineas: [
      CONSULTA,
      { concepto: "Electrocardiograma", min: 20, max: 45, fuente: `Clínicas en Panamá. ${AVISO_MINSA}` },
      { concepto: "Perfil lipídico", min: 8, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Creatinina y perfil renal", min: 30, max: 60, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Tensiómetro digital para la casa", min: 25, max: 60, fuente: "Sin precio publicado que citar. Estimado de equipos médicos en Panamá", estimado: true },
      { concepto: "Enalapril 20 mg, 1 al día por 3 meses (90 tabletas)", min: 119, max: 119, fuente: `${DECRETO}: B/. 1.32 por tableta` },
      CONTROL,
    ],
  },
  TAQUI: {
    titulo: "Estudiar el pulso acelerado",
    meses: 0,
    nota: "Cubre el estudio inicial. Si el electrocardiograma sale alterado, el médico decidirá qué sigue.",
    lineas: [
      CONSULTA,
      { concepto: "Electrocardiograma", min: 20, max: 45, fuente: `Clínicas en Panamá. ${AVISO_MINSA}` },
      { concepto: "TSH y hemograma", min: 20, max: 45, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  SAT_BAJA: {
    titulo: "Estudiar la falta de oxígeno",
    meses: 0,
    nota: "Cubre el estudio inicial. Si hace falta radiografía o más, el médico lo indica.",
    lineas: [
      CONSULTA,
      { concepto: "Oxímetro de pulso para la casa", min: 15, max: 35, fuente: "Sin precio publicado que citar. Estimado de equipos médicos en Panamá", estimado: true },
      { concepto: "Radiografía de tórax", min: 25, max: 60, fuente: "Sin precio publicado que citar. Estimado de imagenología en Panamá", estimado: true },
    ],
  },
  FIEBRE: {
    titulo: "Atender la fiebre",
    meses: 0,
    nota: "Cubre la consulta y lo básico. La fiebre suele resolverse sola o con tratamiento corto.",
    lineas: [
      CONSULTA,
      { concepto: "Hemograma completo", min: 8, max: 30, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Medicamentos de venta libre, tratamiento corto", min: 5, max: 20, fuente: "Sin precio publicado que citar. Estimado de farmacia en Panamá", estimado: true },
    ],
  },
  GLU_LIMITE: {
    titulo: "Confirmar la glucosa en el límite",
    meses: 0,
    nota: "Es el caso más barato y el más común. Se confirma con un examen y se maneja con hábitos, no con medicamento.",
    lineas: [
      CONSULTA,
      { concepto: "Glucosa en ayunas en laboratorio", min: 6, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  IMC_SOBREPESO: {
    titulo: "Revisar el peso",
    meses: 0,
    nota: "El manejo del peso es consulta y seguimiento, no medicamento.",
    lineas: [
      CONSULTA,
      { concepto: "Consulta de nutrición", min: 20, max: 45, fuente: "Sin precio publicado que citar. Estimado de consulta especializada en Panamá", estimado: true },
    ],
  },
  IMC_OBESIDAD: {
    titulo: "Estudiar el riesgo metabólico",
    meses: 0,
    nota: "Cubre el estudio inicial. El manejo del peso es sobre todo consulta y seguimiento, no medicamento.",
    lineas: [
      CONSULTA,
      { concepto: "Glucosa en ayunas en laboratorio", min: 6, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Perfil lipídico", min: 8, max: 15, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Consulta de nutrición", min: 20, max: 45, fuente: "Sin precio publicado que citar. Estimado de consulta especializada en Panamá", estimado: true },
    ],
  },
};

/** Orden de prioridad: si un caso dispara varias, gana el paquete más completo. */
const PRIORIDAD = ["GLU_ALTA", "PRES_ALTA", "SAT_BAJA", "TAQUI", "IMC_OBESIDAD", "FIEBRE", "GLU_LIMITE", "IMC_SOBREPESO"];

export function armarPaquete(senales: Senal[]): Paquete | null {
  // Las emergencias no se financian: quien está en emergencia va a urgencias,
  // no llena un formulario de crédito.
  if (senales.some(s => s.urgencia === "Inmediata")) return null;

  const codigos = new Set(senales.map(s => s.codigo));
  const elegido = PRIORIDAD.find(c => codigos.has(c));
  if (!elegido) return null;

  const base = PAQUETES[elegido]!;
  const total_min = Math.round(base.lineas.reduce((a, l) => a + l.min, 0));
  const total_max = Math.round(base.lineas.reduce((a, l) => a + l.max, 0));

  return {
    ...base,
    total_min,
    total_max,
    vale_credito: base.meses > 0 && total_max >= MINIMO_CREDITO,
  };
}

/** Qué decirle a la persona sobre el crédito, según lo que cueste. */
export function mensajeCredito(p: Paquete): string {
  const rango = `Todo junto sale entre B/. ${p.total_min} y B/. ${p.total_max}.`;
  if (p.vale_credito) {
    return `${rango} Si no lo tienes ahora, puedes pedir un crédito de salud por el monto que necesites.`;
  }
  if (p.meses === 0 && p.total_max >= MINIMO_CREDITO) {
    return `${rango} Esto no se financia: hay que atenderlo ahora, no cuando salga un préstamo.`;
  }
  return `${rango} Por ese monto no vale la pena un crédito: sale más barato pagarlo de una.`;
}
