import test from "node:test";
import assert from "node:assert/strict";
import { estructurar } from "../../mobile/src/core/credito/estructura.ts";

const CAPACIDAD = { cuota_max: 138.84, monto_max: 1560 };

test("el paquete anual cae en 12 meses", () => {
  // 920 con PD pasada a mano como 0.123. El motor usa la PD exacta del modelo
  // (0.122651) y da 17.40% y 84.08: la diferencia es el redondeo de la PD, no
  // un error. Aqui se prueba la funcion, no el modelo.
  const r = estructurar(0.123, 920, CAPACIDAD);
  assert.equal(r.monto, 920);
  assert.equal(r.meses, 12);
  assert.equal(r.tasa_anual_pct, 17.43);
  assert.equal(r.cuota, 84.10);
});

test("el extracto baja la cuota del mismo monto", () => {
  const sin = estructurar(0.123, 920, CAPACIDAD);
  const con = estructurar(0.032, 920, CAPACIDAD);
  assert.equal(con.tasa_anual_pct, 10.60);
  assert.equal(con.cuota, 81.14);
  assert.ok(con.cuota < sin.cuota);
});

test("el monto chico toma el plazo mas corto que quepa", () => {
  const r = estructurar(0.123, 170, CAPACIDAD);
  assert.equal(r.meses, 6);
  assert.equal(r.cuota, 30.33);
});

test("cuando no cabe, recorta el monto", () => {
  const r = estructurar(0.123, 920, { cuota_max: 40, monto_max: 1560 });
  assert.ok(r !== null);
  assert.ok(r.monto < 920, "tuvo que recortar");
  assert.ok(r.cuota <= 40);
});

test("si ni el minimo cabe, no hay estructura", () => {
  assert.equal(estructurar(0.123, 920, { cuota_max: 1, monto_max: 1560 }), null);
});

test("nunca pasa del tope de exposicion", () => {
  const r = estructurar(0.032, 5000, { cuota_max: 500, monto_max: 1560 });
  assert.ok(r.monto <= 1560);
});
