import test from "node:test";
import assert from "node:assert/strict";
import { capacidadDePago } from "../../mobile/src/core/credito/capacidad.ts";

const CASO = {
  ingreso_mensual_usd: 520,
  tipo: "asalariado",
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
};

test("el caso de la demo da los numeros esperados", () => {
  const c = capacidadDePago(CASO);
  assert.equal(c.neto, 462.80);          // 520 menos 11% de ley
  assert.equal(c.minimo_vital, 151.92);  // 94.95 por 1 persona por 1.6
  assert.equal(c.disponible, 270.88);    // 462.80 - 40 - 151.92
  assert.equal(c.cuota_max, 138.84);     // manda el techo del 30%, no el residual
  assert.equal(c.monto_max, 1560);       // 3 veces el ingreso
});

test("con ingreso bajo manda el residual y no el ratio", () => {
  // 300 de ingreso: neto 267, minimo vital 151.92, deuda 40 -> disponible 75.08.
  // El techo del 30% seria 80.10, mas alto. Ata el residual.
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 300 });
  assert.equal(c.disponible, 75.08);
  assert.equal(c.cuota_max, 75.08);
  assert.equal(c.ata, "residual");
});

test("con ingreso alto manda el ratio y no el residual", () => {
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 520 });
  assert.equal(c.cuota_max, 138.84);
  assert.equal(c.ata, "ratio");
});

test("las deudas vigentes bajan la capacidad peso por peso", () => {
  const sin = capacidadDePago({ ...CASO, deudas_mensuales_usd: 0 });
  const con = capacidadDePago({ ...CASO, deudas_mensuales_usd: 200 });
  assert.equal(sin.disponible - con.disponible, 200);
});

test("cada persona a cargo sube el minimo vital", () => {
  const solo = capacidadDePago(CASO);
  const con_dos = capacidadDePago({ ...CASO, personas_a_cargo: 2 });
  assert.equal(con_dos.minimo_vital, 455.76); // 94.95 por 3 por 1.6
  assert.ok(con_dos.disponible < solo.disponible);
});

test("la capacidad nunca es negativa", () => {
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 250, personas_a_cargo: 4 });
  assert.equal(c.disponible, 0);
  assert.equal(c.cuota_max, 0);
});

test("el jubilado no paga deducciones de ley", () => {
  const c = capacidadDePago({ ...CASO, tipo: "jubilado" });
  assert.equal(c.neto, 520);
});
