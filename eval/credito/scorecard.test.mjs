import test from "node:test";
import assert from "node:assert/strict";
import { variablesDe, evaluar } from "../../mobile/src/core/credito/scorecard.ts";

const SOL = {
  monto_solicitado_usd: 920,
  cedula: { fecha_nacimiento: "1990-05-04" },
  ingresos: { ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36 },
  deudas_mensuales_usd: 40,
};

test("las variables salen de la solicitud", () => {
  const v = variablesDe(SOL, new Date("2026-09-10T12:00:00Z"));
  assert.equal(v.tipo, "asalariado");
  assert.equal(v.antiguedad, 36);
  assert.equal(Number(v.deuda_ing.toFixed(4)), 0.0769); // 40 / 520
  assert.equal(Number(v.monto_ing.toFixed(4)), 1.7692); // 920 / 520
  assert.equal(v.meses_extracto, 0);
  assert.equal(v.saldo_ing, 0);
  assert.equal(v.edad, 36);
});

test("el extracto entra cuando existe", () => {
  const v = variablesDe({ ...SOL, extracto: { saldo_promedio_usd: 208, meses_cubiertos: 6 } },
                        new Date("2026-09-10T12:00:00Z"));
  assert.equal(v.meses_extracto, 6);
  assert.equal(Number(v.saldo_ing.toFixed(2)), 0.4);
});

test("el extracto mejora el puntaje", () => {
  // Verificado contra el modelo entrenado: 545 -> 587 puntos, grado C -> A,
  // PD de 12.3% a 3.2%. Es la promesa que PantallaCredito ya le hace a la
  // persona ("si lo tienes, baja la tasa"), ahora cumplida de verdad.
  const hoy = new Date("2026-09-10T12:00:00Z");
  const sin = evaluar(variablesDe(SOL, hoy));
  const con = evaluar(variablesDe({ ...SOL, extracto: { saldo_promedio_usd: 208, meses_cubiertos: 6 } }, hoy));
  assert.equal(sin.grado, "C");
  assert.equal(con.grado, "A");
  assert.ok(con.score > sin.score, "el extracto tiene que sumar puntos");
  assert.ok(con.pd < sin.pd, "y bajar la probabilidad de incumplimiento");
});

test("la edad no puntua", () => {
  const r = evaluar(variablesDe(SOL, new Date("2026-09-10T12:00:00Z")));
  assert.ok(!r.detalle.some(d => d.variable === "edad"),
    "la edad se usa para elegibilidad, nunca para puntuar");
});

test("el detalle explica cada variable", () => {
  const r = evaluar(variablesDe(SOL, new Date("2026-09-10T12:00:00Z")));
  assert.equal(r.detalle.length, 6);
  assert.equal(r.detalle.reduce((a, d) => a + d.puntos, 0), r.score);
  assert.ok(["A", "B", "C", "D", "E"].includes(r.grado));
});
