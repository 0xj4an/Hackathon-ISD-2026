/**
 * Rangos de referencia de laboratorio. Orientativos, no son diagnóstico: la pantalla lo dice.
 *
 * Cada umbral sale de una guía citada en `.ai/references/salud.md`. Ninguno es
 * criterio del equipo: nadie aquí es profesional de salud.
 */
export type Sexo = "hombre" | "mujer";

export type Marcador = {
  codigo: string;
  nombre: string;
  unidad: string;
  /** Umbral por defecto. Se usa cuando no se conoce el sexo. */
  min: number;
  max: number;
  /** Umbrales por sexo, solo donde la guía los define distintos. */
  porSexo?: Partial<Record<Sexo, { min: number; max: number }>>;
  hallazgoAlto: string;
  /** Ausente en marcadores sin límite inferior con sentido clínico, como el colesterol. */
  hallazgoBajo?: string;
  pasoAlto: string;
  pasoBajo?: string;
  /** De dónde sale el rango. Va al README y, si aplica, a la pantalla. */
  fuente: string;
};

export const MARCADORES: Marcador[] = [
  { codigo: "GLU", nombre: "glicemia en ayunas", unidad: "mg/dL", min: 70, max: 100, hallazgoAlto: "hiperglicemia", hallazgoBajo: "hipoglicemia", pasoAlto: "repetir en ayunas y solicitar HbA1c", pasoBajo: "evaluar ingesta y repetir", fuente: "ADA, Standards of Care: 100 a 125 glucosa alterada en ayunas, 126 o más criterio de diabetes" },

  // OMS 2024 define anemia por sexo: <12 g/dL en mujeres no embarazadas, <13 en
  // hombres. El defecto anterior usaba 12 para todos, y dejaba pasar como
  // "dentro de rango" a un hombre con 12.5, que la OMS clasifica como anemia.
  // Sin sexo conocido se usa 13, el umbral más sensible, y la pantalla lo dice.
  { codigo: "HB", nombre: "hemoglobina", unidad: "g/dL", min: 13, max: 16,
    porSexo: { mujer: { min: 12, max: 16 }, hombre: { min: 13, max: 16 } },
    hallazgoAlto: "hemoglobina elevada", hallazgoBajo: "anemia", pasoAlto: "evaluar hidratación y repetir", pasoBajo: "solicitar ferritina y hemograma completo",
    fuente: "OMS 2024, umbrales de hemoglobina para definir anemia. No ajustado por altitud ni tabaquismo" },

  // Antes decía "descartar dengue". Las guías OMS 2009 tienen un solo signo de
  // alarma de laboratorio, y es una combinación con tendencia: hematocrito
  // subiendo a la vez que plaquetas cayendo rápido, en alguien con sospecha de
  // dengue. Un valor suelto no lo sugiere. Ver `.ai/references/salud.md`.
  { codigo: "PLQ", nombre: "plaquetas", unidad: "x10^3/µL", min: 150, max: 450, hallazgoAlto: "trombocitosis", hallazgoBajo: "trombocitopenia", pasoAlto: "repetir hemograma", pasoBajo: "repetir hemograma y consultar en centro de salud", fuente: "Rango de referencia estándar de hemograma" },

  { codigo: "CREA", nombre: "creatinina", unidad: "mg/dL", min: 0.6, max: 1.2, hallazgoAlto: "creatinina elevada", hallazgoBajo: "creatinina baja", pasoAlto: "solicitar TFG y control de presión", pasoBajo: "sin acción específica", fuente: "Rango de referencia estándar" },

  // Sin límite inferior: en colesterol total, menos es mejor. Antes tenía
  // min 0 y hallazgoBajo "normal", que es un parche y clasificaba raro.
  { codigo: "COL", nombre: "colesterol total", unidad: "mg/dL", min: 0, max: 200, hallazgoAlto: "hipercolesterolemia", pasoAlto: "perfil lipídico completo", fuente: "Rango de referencia estándar. No tiene límite inferior clínico" },

  // Mismo caso que plaquetas: la mención al dengue sale.
  { codigo: "HTO", nombre: "hematocrito", unidad: "%", min: 36, max: 48, hallazgoAlto: "hemoconcentración", hallazgoBajo: "hematocrito bajo", pasoAlto: "evaluar hidratación y repetir", pasoBajo: "correlacionar con hemoglobina", fuente: "Rango de referencia estándar de hemograma" },

  { codigo: "TSH", nombre: "TSH", unidad: "µUI/mL", min: 0.4, max: 4.0, hallazgoAlto: "hipotiroidismo probable", hallazgoBajo: "hipertiroidismo probable", pasoAlto: "solicitar T4 libre", pasoBajo: "solicitar T4 libre y T3", fuente: "Rango de referencia estándar" },
];

// `linfocitos CD4` se retiró de la tabla: su siguiente paso menciona VIH y
// `docs/BRIEF.md` lo prohíbe en la demo pública.

export type LecturaLab = {
  marcador: string;
  valor: number;
  unidad: string;
  rango: string;
  hallazgo: string;
  urgencia: "Rutinaria" | "Prioritaria" | "Inmediata";
  siguiente_paso: string;
};

export function buscarMarcador(codigoONombre: string): Marcador | undefined {
  const q = codigoONombre.trim().toLowerCase();
  return MARCADORES.find(m => m.codigo.toLowerCase() === q || m.nombre.toLowerCase() === q);
}

/** Rango que aplica a esta persona. Sin sexo conocido, el del marcador. */
export function rangoDe(m: Marcador, sexo?: Sexo): { min: number; max: number } {
  const propio = sexo && m.porSexo?.[sexo];
  return propio ?? { min: m.min, max: m.max };
}

/** Clasifica un valor contra su rango. Las reglas deciden, el modelo solo explica (ADR-005). */
export function clasificar(m: Marcador, valor: number, sexo?: Sexo): LecturaLab {
  const { min, max } = rangoDe(m, sexo);
  // Sin `hallazgoBajo`, no existe el estado "bajo": solo se sale de rango por arriba.
  const dentro = valor <= max && (valor >= min || m.hallazgoBajo === undefined);
  const desvio = valor > max ? valor / max : valor < min ? valor / min : 1;
  const urgencia: LecturaLab["urgencia"] = dentro
    ? "Rutinaria"
    : desvio > 1.8 || desvio < 0.5
      ? "Inmediata"
      : desvio > 1.2 || desvio < 0.85
        ? "Prioritaria"
        : "Rutinaria";
  return {
    marcador: m.nombre,
    valor,
    unidad: m.unidad,
    rango: `${min}-${max}`,
    hallazgo: dentro ? "dentro de rango" : valor > max ? m.hallazgoAlto : (m.hallazgoBajo ?? "dentro de rango"),
    urgencia,
    siguiente_paso: dentro ? "control habitual" : valor > max ? m.pasoAlto : (m.pasoBajo ?? "control habitual"),
  };
}
