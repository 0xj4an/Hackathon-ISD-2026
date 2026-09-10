import test from "node:test";
import assert from "node:assert/strict";
import { cuota, centavos } from "../../mobile/src/core/credito/finanzas.ts";
import { POLITICA } from "../../mobile/src/core/credito/politica.ts";

test("la cuota de un prestamo frances sale correcta", () => {
  // 920 a 14.5% anual en 12 meses. Verificado a mano: 82.82
  assert.equal(centavos(cuota(920, 14.5, 12)), 82.82);
});

test("tasa cero reparte el capital en partes iguales", () => {
  assert.equal(centavos(cuota(1200, 0, 12)), 100);
});

test("la politica declara fuente para cada parametro numerico", () => {
  for (const clave of Object.keys(POLITICA.valores)) {
    assert.ok(POLITICA.fuentes[clave], `falta la fuente de ${clave}`);
  }
});
