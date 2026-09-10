import test from "node:test";
import assert from "node:assert/strict";
import { clasificar, buscarMarcador } from "../../mobile/src/core/marcadores.ts";
import { armarPaqueteDesdeLab } from "../../mobile/src/core/paquete.ts";

function lec(codigo, valor, sexo = "hombre") {
  const m = buscarMarcador(codigo);
  assert.ok(m);
  return clasificar(m, valor, sexo);
}

test("lab en rango → null", () => {
  assert.equal(armarPaqueteDesdeLab([lec("GLU", 90)]), null);
});

test("glicemia 130 → paquete GLU_ALTA", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 130)]);
  assert.ok(p);
  assert.match(p.titulo, /azúcar|diabetes|glucosa/i);
  assert.ok(p.total_max >= p.total_min);
  assert.ok(p.total_max > 100);
});

test("glicemia 110 → paquete límite (GLU_LIMITE)", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 110)]);
  assert.ok(p);
  assert.ok(p.total_max < 400);
});

test("glicemia 50 → GLU_BAJA o MUY_BAJA", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 50)]);
  assert.ok(p);
});

test("TSH alto sin glucosa → LAB_SEGUIMIENTO", () => {
  const p = armarPaqueteDesdeLab([lec("TSH", 8)]);
  assert.ok(p);
  assert.match(p.titulo, /seguimiento|laboratorio|revisión/i);
});

test("varios hallazgos: gana prioridad (GLU_ALTA sobre seguimiento)", () => {
  const p = armarPaqueteDesdeLab([lec("TSH", 8), lec("GLU", 140)]);
  assert.ok(p);
  assert.match(p.titulo, /azúcar|diabetes|glucosa/i);
});
