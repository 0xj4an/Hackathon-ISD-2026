import test from "node:test";
import assert from "node:assert/strict";
import { preCalificar, decidir } from "../../mobile/src/core/credito/motor.ts";

const HOY = new Date("2026-09-10T12:00:00Z");
const SOL = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  monto_solicitado_usd: 920,
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04",
            fecha_expiracion: "2030-01-01", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
};

test("precalificar no promete, estima", () => {
  // PD del modelo para este solicitante: 0.122651, grado C. De ahi salen
  // 17.40% y 84.08. Ojo: no son los mismos numeros que en el test de
  // estructura, que pasa la PD a mano redondeada a 0.123.
  const r = preCalificar(SOL, HOY);
  assert.equal(r.estimado, true);
  assert.equal(r.monto, 920);
  assert.equal(r.meses, 12);
  assert.equal(r.cuota, 84.08);
});

test("decidir aprueba el caso de la demo", () => {
  const r = decidir(SOL, {}, HOY);
  assert.equal(r.decision, "aprobada");
  assert.equal(r.monto_aprobado_usd, 920);
  assert.equal(r.plazo_meses, 12);
  assert.equal(r.tasa_anual_pct, 17.40);
  assert.equal(r.cuota_mensual_usd, 84.08);
  assert.equal(r.grado, "C");
  assert.equal(r.politica_version, "2026-09-10");
  assert.ok(r.factores.length > 0);
});

test("con extracto mejora el grado y baja la tasa", () => {
  const r = decidir({ ...SOL, extracto: { banco: "Caja de Ahorros", saldo_promedio_usd: 208,
                                          meses_cubiertos: 6, confianza: 0.9 } }, {}, HOY);
  assert.equal(r.grado, "A");
  assert.equal(r.tasa_anual_pct, 10.60);
});

test("documento ilegible va a revision, no a rechazo", () => {
  const r = decidir({ ...SOL, cedula: { ...SOL.cedula, confianza: 0.3 } }, {}, HOY);
  assert.equal(r.decision, "revision");
});

test("cedula vencida va a revision", () => {
  const r = decidir({ ...SOL, cedula: { ...SOL.cedula, fecha_expiracion: "2020-01-01" } }, {}, HOY);
  assert.equal(r.decision, "revision");
});

test("sin capacidad, rechaza y dice cuanto puede pagar", () => {
  const r = decidir({ ...SOL, ingresos: { ...SOL.ingresos, ingreso_mensual_usd: 260 },
                      personas_a_cargo: 3 }, {}, HOY);
  assert.equal(r.decision, "rechazada");
  assert.match(r.motivo, /B\/\./);
});

test("la mora en el bureau pesa, y se cita la norma", () => {
  const r = decidir(SOL, { bureau: { peor_mora_dias: 95 } }, HOY);
  assert.equal(r.decision, "rechazada");
  assert.match(r.motivo, /comportamiento de pago/);
});

test("la decision es reproducible", () => {
  const a = decidir(SOL, {}, HOY);
  const b = decidir(SOL, {}, HOY);
  assert.deepEqual({ ...a, ts: null }, { ...b, ts: null });
});
