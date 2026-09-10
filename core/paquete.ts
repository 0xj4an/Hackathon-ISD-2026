/**
 * El paquete: cuánto cuesta de verdad atender lo que se detectó, durante un año.
 *
 * Sin esto no se puede ofrecer crédito con seriedad: no por el monto, sino
 * porque nadie sabe por cuánto pedirlo. El número solo aparece cotizando el año
 * completo: diagnóstico, equipo, exámenes de seguimiento, consultas de control
 * y el medicamento de todos los días.
 *
 * El medicamento diario es lo que domina el total, y es justo lo que no se ve
 * cuando uno cotiza "una consulta y un examen". Metformina dos veces al día son
 * 730 tabletas en un año.
 *
 * Se cotiza el **límite superior** de cada rango. Para un crédito es lo
 * correcto: si el monto cubre el peor caso, la persona no queda a mitad de
 * camino. Y se cotiza lo privado, que en un centro del MINSA puede costar menos.
 *
 * Sobre los medicamentos: esto **no receta nada**. Estima lo que suele costar el
 * tratamiento habitual de una condición, con la dosis de mantenimiento más
 * común, para que la persona sepa a qué se enfrenta. Qué tomar, en qué dosis y
 * por cuánto tiempo lo decide un médico, y la pantalla lo dice.
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
  /** Horizonte que cubre el paquete. 0 en cuadros agudos, que se acaban. */
  meses: number;
  nota: string;
};

const AVISO_MINSA = "Precio privado. En un centro del MINSA puede costar menos o nada";
const DECRETO = "Precio tope oficial, Decreto Ejecutivo 36 del 30 sep 2025 (MICI)";
const RANGOS_PA = "Rangos publicados de laboratorios y clínicas en Panamá";
const SIN_PRECIO = "Sin precio publicado que citar. Estimado por comparación";

/** Una condición crónica se cotiza a un año: es el ciclo de control completo. */
const ANIO = 12;

const CONSULTA: LineaCosto = {
  concepto: "Consulta de medicina general, para el diagnóstico", min: 8, max: 25,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};
/** Tres controles en el año, uno cada tres meses. */
const CONTROLES: LineaCosto = {
  concepto: "Consultas de control, 3 en el año", min: 24, max: 75,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};
const LIPIDOS: LineaCosto = {
  concepto: "Perfil lipídico, 1 vez al año", min: 8, max: 15,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};
const RENAL: LineaCosto = {
  concepto: "Creatinina y función renal, 1 vez al año", min: 30, max: 60,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};
const GLUCOSA: LineaCosto = {
  concepto: "Glucosa en ayunas en laboratorio", min: 6, max: 15,
  fuente: `${RANGOS_PA}. ${AVISO_MINSA}`,
};

const NOTA_URGENCIA =
  "Primero la atención: ve ya, no esperes a resolver la plata. Esto es lo que " +
  "cuesta esa atención y el año de seguimiento, para que sepas a qué te enfrentas después.";

const NOTA_CRONICA =
  "Cubre el año completo: diagnóstico, equipo, seguimiento y medicamento diario. " +
  "El tratamiento lo decide un médico; esto solo estima lo que suele costar.";

const PAQUETES: Record<string, Omit<Paquete, "total_min" | "total_max">> = {
  GLU_ALTA: {
    titulo: "Diabetes tipo 2: confirmar y tratar un año",
    meses: ANIO,
    nota: NOTA_CRONICA,
    lineas: [
      CONSULTA,
      GLUCOSA,
      { concepto: "Hemoglobina glicosilada (HbA1c), 4 veces en el año", min: 60, max: 120, fuente: `${SIN_PRECIO} con otros exámenes de sangre en Panamá`, estimado: true },
      LIPIDOS,
      RENAL,
      { concepto: "Revisión de fondo de ojo, 1 vez al año", min: 25, max: 60, fuente: `${SIN_PRECIO} con consulta oftalmológica en Panamá`, estimado: true },
      { concepto: "Glucómetro con tiras y lancetas", min: 25, max: 50, fuente: "Kit completo con 25 tiras y 200 lancetas en Panamá" },
      { concepto: "Tiras reactivas para el resto del año", min: 75, max: 120, fuente: `${SIN_PRECIO}: 3 cajas de 50 tiras, midiendo 3 veces por semana`, estimado: true },
      { concepto: "Metformina 850 mg, 2 al día por 12 meses (730 tabletas)", min: 380, max: 380, fuente: `${DECRETO}: B/. 0.52 por tableta` },
      CONTROLES,
    ],
  },
  PRES_ALTA: {
    titulo: "Hipertensión: confirmar y controlar un año",
    meses: ANIO,
    nota: NOTA_CRONICA,
    lineas: [
      CONSULTA,
      { concepto: "Electrocardiograma", min: 20, max: 45, fuente: `Clínicas en Panamá: trazo desde ~B/. 28, informado por cardiología ~B/. 45. ${AVISO_MINSA}` },
      LIPIDOS,
      RENAL,
      { concepto: "Potasio y sodio, 2 veces en el año", min: 20, max: 50, fuente: `${SIN_PRECIO} con otros exámenes de sangre. El control se hace porque el tratamiento habitual los altera`, estimado: true },
      { concepto: "Tensiómetro digital para la casa", min: 25, max: 60, fuente: `${SIN_PRECIO} con equipos médicos en Panamá`, estimado: true },
      { concepto: "Enalapril 20 mg, 1 al día por 12 meses (365 tabletas)", min: 482, max: 482, fuente: `${DECRETO}: B/. 1.32 por tableta` },
      CONTROLES,
    ],
  },
  GLU_MUY_BAJA: {
    titulo: "Azúcar peligrosamente baja: urgencia y seguimiento un año",
    meses: ANIO,
    nota: NOTA_URGENCIA,
    lineas: [
      { concepto: "Atención de urgencia, consulta y observación", min: 30, max: 90, fuente: `${SIN_PRECIO} con consulta de urgencias privada en Panamá`, estimado: true },
      { concepto: "Dextrosa intravenosa y suministros", min: 20, max: 60, fuente: `${SIN_PRECIO} con insumos de sala de urgencias`, estimado: true },
      GLUCOSA,
      { concepto: "Consulta con endocrinología", min: 25, max: 60, fuente: `${SIN_PRECIO} con consulta especializada en Panamá`, estimado: true },
      { concepto: "Hemoglobina glicosilada (HbA1c), 2 veces en el año", min: 30, max: 60, fuente: `${SIN_PRECIO} con otros exámenes de sangre en Panamá`, estimado: true },
      { concepto: "Glucómetro con tiras y lancetas", min: 25, max: 50, fuente: "Kit completo con 25 tiras y 200 lancetas en Panamá" },
      { concepto: "Tiras reactivas para el resto del año", min: 75, max: 120, fuente: `${SIN_PRECIO}: 3 cajas de 50 tiras, midiendo 3 veces por semana`, estimado: true },
      CONTROLES,
    ],
  },
  SAT_CRITICA: {
    titulo: "Oxígeno crítico: urgencia y estudio",
    meses: 0,
    nota: NOTA_URGENCIA,
    lineas: [
      { concepto: "Atención de urgencia con oxígeno", min: 40, max: 120, fuente: `${SIN_PRECIO} con consulta de urgencias privada en Panamá`, estimado: true },
      { concepto: "Radiografía de tórax", min: 25, max: 60, fuente: `${SIN_PRECIO} con imagenología en Panamá`, estimado: true },
      { concepto: "Hemograma y gases en sangre", min: 25, max: 70, fuente: `${SIN_PRECIO} con exámenes de sangre en Panamá`, estimado: true },
      { concepto: "Oxímetro de pulso para la casa", min: 15, max: 35, fuente: `${SIN_PRECIO} con equipos médicos en Panamá`, estimado: true },
      { concepto: "Consulta de control", min: 8, max: 25, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  RESP_MUY_ALTA: {
    titulo: "Respiración muy acelerada: urgencia y estudio",
    meses: 0,
    nota: NOTA_URGENCIA,
    lineas: [
      { concepto: "Atención de urgencia, consulta y observación", min: 30, max: 90, fuente: `${SIN_PRECIO} con consulta de urgencias privada en Panamá`, estimado: true },
      { concepto: "Radiografía de tórax", min: 25, max: 60, fuente: `${SIN_PRECIO} con imagenología en Panamá`, estimado: true },
      { concepto: "Hemograma completo", min: 8, max: 30, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Consulta de control", min: 8, max: 25, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  RESP_ALTA: {
    titulo: "Respiración acelerada: estudio inicial",
    meses: 0,
    nota: "Cubre el estudio inicial. Si la radiografía sale alterada, el médico decidirá qué sigue.",
    lineas: [
      CONSULTA,
      { concepto: "Radiografía de tórax", min: 25, max: 60, fuente: `${SIN_PRECIO} con imagenología en Panamá`, estimado: true },
      { concepto: "Hemograma completo", min: 8, max: 30, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  PESO_BAJA: {
    titulo: "Pérdida de peso: estudio inicial",
    meses: 0,
    nota: "Bajar de peso sin proponérselo tiene muchas causas. Esto cubre el estudio que las descarta.",
    lineas: [
      CONSULTA,
      { concepto: "Hemograma completo", min: 8, max: 30, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      GLUCOSA,
      { concepto: "TSH, función de la tiroides", min: 15, max: 35, fuente: `${SIN_PRECIO} con otros exámenes de sangre en Panamá`, estimado: true },
      { concepto: "Consulta de control", min: 8, max: 25, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  GLU_BAJA: {
    titulo: "Azúcar baja: estudio inicial",
    meses: 0,
    nota: "Cubre el estudio y el equipo para medirse en casa, que es lo que dice si se repite.",
    lineas: [
      CONSULTA,
      GLUCOSA,
      { concepto: "Glucómetro con tiras y lancetas", min: 25, max: 50, fuente: "Kit completo con 25 tiras y 200 lancetas en Panamá" },
    ],
  },
  GLU_LIMITE: {
    titulo: "Prediabetes: seguimiento por un año",
    meses: ANIO,
    nota: "Cubre un año de seguimiento. Es el caso más barato y el más valioso: " +
      "aquí todavía se puede evitar la diabetes, y se maneja con hábitos, no con medicamento.",
    lineas: [
      CONSULTA,
      GLUCOSA,
      { concepto: "Hemoglobina glicosilada (HbA1c), 2 veces en el año", min: 30, max: 60, fuente: `${SIN_PRECIO} con otros exámenes de sangre en Panamá`, estimado: true },
      { concepto: "Consulta de nutrición", min: 20, max: 45, fuente: `${SIN_PRECIO} con consulta especializada en Panamá`, estimado: true },
      { concepto: "Consulta de control a los 6 meses", min: 8, max: 25, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  IMC_OBESIDAD: {
    titulo: "Riesgo metabólico: seguimiento por un año",
    meses: ANIO,
    nota: "Cubre un año de seguimiento. El manejo del peso es consulta y " +
      "acompañamiento sostenido, no medicamento.",
    lineas: [
      CONSULTA,
      GLUCOSA,
      LIPIDOS,
      { concepto: "Consultas de nutrición, 3 en el año", min: 60, max: 135, fuente: `${SIN_PRECIO} con consulta especializada en Panamá`, estimado: true },
      { concepto: "Consulta de control a los 6 meses", min: 8, max: 25, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  SAT_BAJA: {
    titulo: "Falta de oxígeno: estudio inicial",
    meses: 0,
    nota: "Es un cuadro agudo: se atiende ahora y se acaba. Si hace falta más, el médico lo indica.",
    lineas: [
      CONSULTA,
      { concepto: "Oxímetro de pulso para la casa", min: 15, max: 35, fuente: `${SIN_PRECIO} con equipos médicos en Panamá`, estimado: true },
      { concepto: "Radiografía de tórax", min: 25, max: 60, fuente: `${SIN_PRECIO} con imagenología en Panamá`, estimado: true },
    ],
  },
  TAQUI: {
    titulo: "Pulso acelerado: estudio inicial",
    meses: 0,
    nota: "Cubre el estudio inicial. Si el electrocardiograma sale alterado, el médico decidirá qué sigue.",
    lineas: [
      CONSULTA,
      { concepto: "Electrocardiograma", min: 20, max: 45, fuente: `Clínicas en Panamá. ${AVISO_MINSA}` },
      { concepto: "TSH y hemograma", min: 20, max: 45, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
    ],
  },
  FIEBRE: {
    titulo: "Fiebre: atención puntual",
    meses: 0,
    nota: "Es un cuadro agudo: la fiebre suele resolverse sola o con tratamiento corto.",
    lineas: [
      CONSULTA,
      { concepto: "Hemograma completo", min: 8, max: 30, fuente: `${RANGOS_PA}. ${AVISO_MINSA}` },
      { concepto: "Medicamentos de venta libre, tratamiento corto", min: 5, max: 20, fuente: `${SIN_PRECIO} con precios de farmacia en Panamá`, estimado: true },
    ],
  },
  IMC_SOBREPESO: {
    titulo: "Sobrepeso: revisión",
    meses: 0,
    nota: "El manejo del peso es consulta y seguimiento, no medicamento.",
    lineas: [
      CONSULTA,
      { concepto: "Consulta de nutrición", min: 20, max: 45, fuente: `${SIN_PRECIO} con consulta especializada en Panamá`, estimado: true },
    ],
  },
};

/** Orden de prioridad: si un caso dispara varias, gana el paquete más completo. */
const PRIORIDAD = [
  "SAT_CRITICA", "RESP_MUY_ALTA", "GLU_MUY_BAJA",
  "GLU_ALTA", "PRES_ALTA",
  "SAT_BAJA", "RESP_ALTA", "TAQUI", "FIEBRE", "PESO_BAJA", "GLU_BAJA",
  "IMC_OBESIDAD", "GLU_LIMITE", "IMC_SOBREPESO",
];

export function armarPaquete(senales: Senal[]): Paquete | null {
  const codigos = new Set(senales.map(s => s.codigo));
  const elegido = PRIORIDAD.find(c => codigos.has(c));
  if (!elegido) return null;

  const base = PAQUETES[elegido]!;
  const total_min = Math.round(base.lineas.reduce((a, l) => a + l.min, 0));
  const total_max = Math.round(base.lineas.reduce((a, l) => a + l.max, 0));

  return { ...base, total_min, total_max };
}

/**
 * Qué decirle a la persona sobre el crédito.
 *
 * Se ofrece siempre que haya algo que atender, sin importar el monto: quién
 * puede pagar de una y quién no es decisión de la persona, no de un umbral
 * puesto desde aquí. Lo único que la app hace es poner el número al frente.
 */
export function mensajeCredito(p: Paquete): string {
  const cuanto = p.meses > 0 ? "El año completo sale" : "Todo junto sale";
  return `${cuanto} entre B/. ${p.total_min} y B/. ${p.total_max}. ` +
    "Si prefieres no pagarlo de una, puedes pedir un crédito de salud y pagarlo mes a mes.";
}
