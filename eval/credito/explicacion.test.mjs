import test from "node:test";
import assert from "node:assert/strict";
import { variablesDe, evaluar } from "../../mobile/src/core/credito/scorecard.ts";
import { factoresDe } from "../../mobile/src/core/credito/explicacion.ts";
import { MODELO } from "../../mobile/src/core/credito/modelo.ts";

const SOL = {
  monto_solicitado_usd: 920,
  cedula: { fecha_nacimiento: "1990-05-04" },
  ingresos: { ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36 },
  deudas_mensuales_usd: 40,
};
const hoy = new Date("2026-09-10T12:00:00Z");

test("devuelve como mucho tres factores", () => {
  const f = factoresDe(evaluar(variablesDe(SOL, hoy)), variablesDe(SOL, hoy), SOL);
  assert.ok(f.length <= 3 && f.length > 0);
});

test("el primer factor es el que mas puntos cuesta", () => {
  // El orden es por puntos PERDIDOS (el maximo de esa variable menos lo que
  // saco), no por puntos crudos: cada variable tiene un maximo distinto, asi
  // que 84 puntos en una puede costar mas que 91 en otra.
  const f = factoresDe(evaluar(variablesDe(SOL, hoy)), variablesDe(SOL, hoy), SOL);
  const perdidos = (x) => Math.max(...MODELO.puntos[x.variable]) - x.puntos;
  for (let i = 1; i < f.length; i++) {
    assert.ok(perdidos(f[i - 1]) >= perdidos(f[i]),
      `${f[i - 1].variable} deberia costar mas que ${f[i].variable}`);
  }
});

test("sin extracto, el extracto sale como factor y dice que hacer", () => {
  const v = variablesDe(SOL, hoy);
  const f = factoresDe(evaluar(v), v, SOL);
  const extracto = f.find(x => x.variable === "meses_extracto" || x.variable === "saldo_ing");
  assert.ok(extracto, "sin extracto ese tiene que ser uno de los factores que mas pesan");
  assert.ok(extracto.que_cambiaria.length > 10);
});

test("cada factor trae una accion concreta", () => {
  const v = variablesDe(SOL, hoy);
  for (const factor of factoresDe(evaluar(v), v, SOL)) {
    assert.ok(factor.que_cambiaria.trim().length > 0, `${factor.variable} sin accion`);
    assert.notEqual(factor.variable, "edad", "la edad no se le reprocha a nadie");
  }
});
