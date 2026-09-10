import test from "node:test";
import assert from "node:assert/strict";
import { parsearLaboratorio } from "../../mobile/src/core/laboratorio.ts";

test("parsea lecturas de laboratorio y coacciona tipos", () => {
  const r = parsearLaboratorio(JSON.stringify({
    lecturas: [
      { codigo: "glu", nombre: "glicemia", valor: "131", unidad: "mg/dL" },
      { codigo: "HB", nombre: "hemoglobina", valor: 12.5, unidad: "g/dL" },
    ],
    fecha: "2026-09-10",
    confianza: 0.8,
  }));
  assert.equal(r.ok, true);
  assert.equal(r.datos.lecturas[0].codigo, "GLU");
  assert.equal(r.datos.lecturas[0].valor, 131);
  assert.equal(r.datos.lecturas.length, 2);
});

test("limpia fences antes de parsear", () => {
  const r = parsearLaboratorio("```json\n{\"lecturas\":[{\"codigo\":\"TSH\",\"nombre\":\"TSH\",\"valor\":2.1,\"unidad\":\"µUI/mL\"}],\"confianza\":0.7}\n```");
  assert.equal(r.ok, true);
  assert.equal(r.datos.lecturas[0].codigo, "TSH");
});

test("sin JSON, falla sin inventar", () => {
  const r = parsearLaboratorio("nope");
  assert.equal(r.ok, false);
});
