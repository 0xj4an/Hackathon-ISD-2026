import test from "node:test";
import assert from "node:assert/strict";
import { clasificar, provision, simular } from "../../nodo/cartera.mjs";

test("clasifica consumo por dias de mora, Acuerdo 4-2013 articulo 18", () => {
  assert.equal(clasificar(0), "normal");
  assert.equal(clasificar(60), "normal");
  assert.equal(clasificar(61), "mencion_especial");
  assert.equal(clasificar(90), "mencion_especial");
  assert.equal(clasificar(91), "subnormal");
  assert.equal(clasificar(120), "subnormal");
  assert.equal(clasificar(121), "dudoso");
  assert.equal(clasificar(180), "dudoso");
  assert.equal(clasificar(181), "irrecuperable");
});

test("provisiona segun el articulo 34", () => {
  assert.equal(provision(1000, "normal"), 0);
  assert.equal(provision(1000, "mencion_especial"), 200);
  assert.equal(provision(1000, "subnormal"), 500);
  assert.equal(provision(1000, "dudoso"), 800);
  assert.equal(provision(1000, "irrecuperable"), 1000);
});

test("la garantia baja la base de computo y nunca la vuelve negativa", () => {
  assert.equal(provision(1000, "irrecuperable", 400), 600);
  assert.equal(provision(1000, "irrecuperable", 5000), 0);
});

test("la simulacion es reproducible y devuelve perdida y provision", () => {
  const creditos = [{ monto: 920, pd: 0.123 }, { monto: 170, pd: 0.123 }];
  const a = simular(creditos, 12345);
  const b = simular(creditos, 12345);
  assert.deepEqual(a, b);
  assert.ok(a.perdida_esperada >= 0);
  assert.ok(a.provision >= 0);
});
