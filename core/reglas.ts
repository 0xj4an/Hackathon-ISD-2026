/** Reglas de detección sobre mediciones sintéticas. El LLM NO decide la señal; solo la explica. */
export type Medicion = { ts: string; tipo: "glucosa_ayunas" | "pulso_reposo" | "peso" | "presion_sist"; valor: number };

export type Senal = { codigo: string; descripcion: string; examen: string; costo_usd: number; urgencia: "Rutinaria" | "Prioritaria" | "Inmediata" };

export function detectarSenales(m: Medicion[]): Senal[] {
  const out: Senal[] = [];
  const glu = m.filter(x => x.tipo === "glucosa_ayunas").map(x => x.valor);
  if (glu.length >= 3) {
    const ult = glu.slice(-3);
    const prom = ult.reduce((a, b) => a + b, 0) / ult.length;
    if (prom >= 126) out.push({ codigo: "GLU_ALTA", descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL en las últimas 3 tomas (referencia < 100)`, examen: "Hemoglobina glicosilada (HbA1c) y glucosa en laboratorio", costo_usd: 25, urgencia: "Prioritaria" });
    else if (prom >= 100) out.push({ codigo: "GLU_LIMITE", descripcion: `glucosa en ayunas promedio ${prom.toFixed(0)} mg/dL (referencia < 100)`, examen: "Glucosa en ayunas en laboratorio", costo_usd: 8, urgencia: "Rutinaria" });
  }
  const pulso = m.filter(x => x.tipo === "pulso_reposo").map(x => x.valor);
  if (pulso.length >= 5 && pulso.slice(-5).every(v => v > 100)) out.push({ codigo: "TAQUI", descripcion: "pulso en reposo por encima de 100 durante 5 días", examen: "Electrocardiograma y consulta general", costo_usd: 40, urgencia: "Prioritaria" });
  const pres = m.filter(x => x.tipo === "presion_sist").map(x => x.valor);
  if (pres.length >= 3 && pres.slice(-3).every(v => v >= 140)) out.push({ codigo: "PRES_ALTA", descripcion: "presión sistólica ≥ 140 en 3 tomas seguidas", examen: "Toma de presión en centro de salud y perfil básico", costo_usd: 15, urgencia: "Prioritaria" });
  return out;
}
