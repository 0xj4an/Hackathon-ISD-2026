import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatearDiagnosticoExamen, parsearLaboratorio } from "../../mobile/src/core/laboratorio.ts";
import { SYSTEM_EXTRACCION_LABORATORIO } from "../../mobile/src/core/prompts.ts";

/** Texto como el de `examen-nitido.jpg` si el OCR no se come las filas. */
const OCR_EXAMEN = `LABORATORIO CLINICO SAN MARCOS
INFORME DE RESULTADOS
Paciente MARIELA DEL CARMEN QUIROS BATISTA
Fecha 2026-09-08
PRUEBA               RESULTADO    UNIDAD
glicemia en ayunas        168          mg/dL
hemoglobina               13.2         g/dL
plaquetas                 245          x10^3/µL
creatinina                0.9          mg/dL
colesterol total          218          mg/dL
hematocrito               40           %
TSH                       2.1          µUI/mL`;

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

test("el prompt de lab es el que entrenó el LoRA", () => {
  const entrenado = readFileSync(
    new URL("../../spikes/lora-medpsy/system-laboratorio.txt", import.meta.url),
    "utf8",
  ).trim();
  assert.equal(SYSTEM_EXTRACCION_LABORATORIO.trim(), entrenado);
});

test("sin JSON pero con OCR del examen de prueba, saca los marcadores", () => {
  const r = parsearLaboratorio("El informe muestra valores elevados sin JSON.", OCR_EXAMEN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const por = Object.fromEntries(r.datos.lecturas.map(l => [l.codigo, l.valor]));
  assert.equal(por.GLU, 168);
  assert.equal(por.HB, 13.2);
  assert.equal(por.PLQ, 245);
  assert.equal(por.CREA, 0.9);
  assert.equal(por.COL, 218);
  assert.equal(por.HTO, 40);
  assert.equal(por.TSH, 2.1);
  assert.equal(r.datos.lecturas.length, 7);
  assert.equal(r.datos.fecha, "2026-09-08");
});

test("el diagnostico incluye OCR y salida del modelo para pegarlo", () => {
  const t = formatearDiagnosticoExamen({
    motivo: "El modelo no devolvió JSON del examen.",
    lora: "lab-v3",
    ocr: "glicemia 168",
    modelo: "sorry I cannot help",
  });
  assert.match(t, /motivo: El modelo no devolvió JSON/);
  assert.match(t, /lora: lab-v3/);
  assert.match(t, /--- ocr ---/);
  assert.match(t, /glicemia 168/);
  assert.match(t, /--- modelo ---/);
  assert.match(t, /sorry I cannot help/);
});

test("leerExamen pasa el OCR al parser y arma el diagnostico", () => {
  const src = readFileSync(new URL("../../mobile/src/leerExamen.ts", import.meta.url), "utf8");
  assert.match(src, /parsearLaboratorio\(bruto,\s*textoOcr\)/);
  assert.match(src, /formatearDiagnosticoExamen/);
  assert.match(src, /diagnostico/);
});

test("la pantalla de examen tiene collapse de detalle técnico", () => {
  const src = readFileSync(new URL("../../mobile/src/PantallaExamen.tsx", import.meta.url), "utf8");
  assert.match(src, /DetalleTecnico/);
  assert.match(src, /diagnostico/);
});
