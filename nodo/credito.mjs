// Modelo de crédito DE JUGUETE. Existe solo para demostrar el flujo; no representa ninguna política real.
export function decidir(sol) {
  const ing = sol.ingresos?.ingreso_mensual_usd ?? 0;
  const conf = Math.min(sol.cedula?.confianza ?? 0, sol.ingresos?.confianza ?? 0);
  const pedido = sol.monto_solicitado_usd ?? 0;
  const ts = new Date().toISOString();
  if (conf < 0.5) return { solicitud_id: sol.id, decision: "revision", motivo: "documentos poco legibles; un agente revisará", ts };
  const capacidad = ing * 0.3; // cuota máxima 30% del ingreso
  const tasa_anual_pct = sol.extracto ? 9.5 : 12.5;
  const plazo_meses = pedido <= 300 ? 6 : pedido <= 1000 ? 12 : 24;
  const r = tasa_anual_pct / 100 / 12;
  const cuota = (m) => (m * r) / (1 - Math.pow(1 + r, -plazo_meses));
  let monto = Math.min(pedido, 5000);
  while (monto > 50 && cuota(monto) > capacidad) monto = Math.floor(monto * 0.9);
  if (monto < 50) return { solicitud_id: sol.id, decision: "rechazada", motivo: "capacidad de pago insuficiente para el monto mínimo", ts };
  return { solicitud_id: sol.id, decision: "aprobada", monto_aprobado_usd: Math.round(monto), plazo_meses, tasa_anual_pct,
    cuota_mensual_usd: Math.round(cuota(monto) * 100) / 100, motivo: monto < pedido ? "monto ajustado a capacidad de pago (30% del ingreso)" : "aprobado por capacidad de pago", ts };
}
