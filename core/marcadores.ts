/** Rangos de referencia de laboratorio. Orientativos, no son diagnóstico: la pantalla lo dice. */
export type Marcador = {
  codigo: string;
  nombre: string;
  unidad: string;
  min: number;
  max: number;
  hallazgoAlto: string;
  hallazgoBajo: string;
  pasoAlto: string;
  pasoBajo: string;
};

export const MARCADORES: Marcador[] = [
  { codigo: "GLU", nombre: "glicemia en ayunas", unidad: "mg/dL", min: 70, max: 100, hallazgoAlto: "hiperglicemia", hallazgoBajo: "hipoglicemia", pasoAlto: "repetir en ayunas y solicitar HbA1c", pasoBajo: "evaluar ingesta y repetir" },
  { codigo: "HB", nombre: "hemoglobina", unidad: "g/dL", min: 12, max: 16, hallazgoAlto: "hemoglobina elevada", hallazgoBajo: "anemia", pasoAlto: "evaluar hidratación y repetir", pasoBajo: "solicitar ferritina y hemograma completo" },
  { codigo: "PLQ", nombre: "plaquetas", unidad: "x10^3/µL", min: 150, max: 450, hallazgoAlto: "trombocitosis", hallazgoBajo: "trombocitopenia", pasoAlto: "repetir hemograma", pasoBajo: "descartar dengue, repetir en 24 h" },
  { codigo: "CREA", nombre: "creatinina", unidad: "mg/dL", min: 0.6, max: 1.2, hallazgoAlto: "creatinina elevada", hallazgoBajo: "creatinina baja", pasoAlto: "solicitar TFG y control de presión", pasoBajo: "sin acción específica" },
  { codigo: "CD4", nombre: "linfocitos CD4", unidad: "cél/µL", min: 500, max: 1500, hallazgoAlto: "CD4 elevado", hallazgoBajo: "inmunosupresión", pasoAlto: "sin acción específica", pasoBajo: "referir a programa de VIH para confirmación" },
  { codigo: "COL", nombre: "colesterol total", unidad: "mg/dL", min: 0, max: 200, hallazgoAlto: "hipercolesterolemia", hallazgoBajo: "normal", pasoAlto: "perfil lipídico completo", pasoBajo: "sin acción específica" },
  { codigo: "HTO", nombre: "hematocrito", unidad: "%", min: 36, max: 48, hallazgoAlto: "hemoconcentración", hallazgoBajo: "hematocrito bajo", pasoAlto: "descartar dengue con signos de alarma", pasoBajo: "correlacionar con hemoglobina" },
  { codigo: "TSH", nombre: "TSH", unidad: "µUI/mL", min: 0.4, max: 4.0, hallazgoAlto: "hipotiroidismo probable", hallazgoBajo: "hipertiroidismo probable", pasoAlto: "solicitar T4 libre", pasoBajo: "solicitar T4 libre y T3" },
];

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

/** Clasifica un valor contra su rango. Las reglas deciden, el modelo solo explica (ADR-005). */
export function clasificar(m: Marcador, valor: number): LecturaLab {
  const dentro = valor >= m.min && valor <= m.max;
  const desvio = valor > m.max ? valor / m.max : valor < m.min ? valor / m.min : 1;
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
    rango: `${m.min}-${m.max}`,
    hallazgo: dentro ? "dentro de rango" : valor > m.max ? m.hallazgoAlto : m.hallazgoBajo,
    urgencia,
    siguiente_paso: dentro ? "control habitual" : valor > m.max ? m.pasoAlto : m.pasoBajo,
  };
}
