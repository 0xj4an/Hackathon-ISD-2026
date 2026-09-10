import test from "node:test";
import assert from "node:assert/strict";
import { precio } from "../../mobile/src/core/credito/precio.ts";

test("el caso bueno de la demo sale en 10.08%", () => {
  // PD 2.5% (grado A), 920 a 12 meses. Verificado a mano.
  const p = precio(0.025, 920, 12);
  assert.equal(p.tasa_anual_pct, 10.08);
  assert.equal(p.bajo_costo, false);
  assert.equal(p.componentes.fondeo, 4.5);
  assert.equal(p.componentes.riesgo, 1.88);
  assert.equal(p.componentes.opex, 0.65);
});

test("el opex se come los montos chicos", () => {
  const grande = precio(0.025, 920, 12);
  const chico = precio(0.025, 28, 6);
  assert.ok(chico.componentes.opex > 40, "28 balboas a 6 meses son mas de 40% solo de opex");
  assert.ok(chico.componentes.opex > grande.componentes.opex * 50);
});

test("la tasa se acota al techo y se marca bajo costo", () => {
  const p = precio(0.231, 920, 12); // grado D
  assert.equal(p.tasa_anual_pct, 24);
  assert.equal(p.bajo_costo, true);
  assert.ok(p.bruta_pct > 24);
});

test("nunca baja del piso", () => {
  const p = precio(0.001, 5000, 24);
  assert.ok(p.tasa_anual_pct >= 9.5);
});

test("el plazo largo cobra prima", () => {
  const corto = precio(0.05, 1000, 12);
  const largo = precio(0.05, 1000, 24);
  assert.ok(largo.bruta_pct > corto.bruta_pct);
});
