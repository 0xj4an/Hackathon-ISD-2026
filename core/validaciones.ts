/** Validaciones en código ANTES y DESPUÉS del modelo. Nunca confiar en el JSON del LLM sin pasar por aquí. */
export type Problema = { campo: string; mensaje: string };

export function validarCoherencia(s: { cedula?: any; ingresos?: any; extracto?: any; monto_solicitado_usd?: number }): Problema[] {
  const p: Problema[] = [];
  const hoy = new Date();
  if (s.cedula?.fecha_nacimiento) {
    const edad = (hoy.getTime() - new Date(s.cedula.fecha_nacimiento).getTime()) / (365.25 * 24 * 3600e3);
    if (edad < 18) p.push({ campo: "cedula.fecha_nacimiento", mensaje: "menor de edad" });
    if (edad > 100) p.push({ campo: "cedula.fecha_nacimiento", mensaje: "fecha improbable" });
  }
  if (s.cedula?.fecha_expiracion && new Date(s.cedula.fecha_expiracion) < hoy) p.push({ campo: "cedula.fecha_expiracion", mensaje: "cédula vencida" });
  if (s.ingresos?.ingreso_mensual_usd && s.monto_solicitado_usd && s.monto_solicitado_usd > s.ingresos.ingreso_mensual_usd * 6)
    p.push({ campo: "monto_solicitado_usd", mensaje: "monto > 6 veces el ingreso mensual" });
  if (s.extracto?.saldo_promedio_usd != null && s.ingresos?.ingreso_mensual_usd && s.extracto.saldo_promedio_usd > s.ingresos.ingreso_mensual_usd * 24)
    p.push({ campo: "extracto.saldo_promedio_usd", mensaje: "saldo inconsistente con ingresos" });
  for (const k of ["cedula", "ingresos", "extracto"] as const) {
    const c = (s as any)[k]?.confianza;
    if (c != null && c < 0.5) p.push({ campo: `${k}.confianza`, mensaje: "lectura poco legible, repetir foto" });
  }
  return p;
}
