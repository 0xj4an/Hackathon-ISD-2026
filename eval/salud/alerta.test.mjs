// Las reglas deciden. El modelo solo redacta (`ADR-005`).
// Si MedPsy inventa un precio, un examen o una urgencia, no puede quedar.
import test from "node:test";
import assert from "node:assert/strict";
import {
  payloadSenal,
  parsearAlerta,
  pedirMensaje,
} from "../../mobile/src/core/alerta.ts";

const SENAL = {
  codigo: "GLU_ALTA",
  titulo: "Tu azúcar está alta",
  medida: { valor: "131", unidad: "mg/dL en ayunas", referencia: "Lo normal es menos de 100" },
  descripcion: "glucosa en ayunas promedio 131 mg/dL en las últimas 3 tomas (referencia menor a 100)",
  ruta: {
    tipo: "examen_y_consulta",
    examen: "Glucosa en ayunas en laboratorio para confirmar",
    donde: "Laboratorio, luego centro de salud",
    especialista: "Medicina general, puede derivar a endocrinología",
    vigilar: "Sed intensa, orinar mucho, bajar de peso sin querer",
  },
  costo: { min_usd: 6, max_usd: 15, fuente: "Rangos publicados de laboratorios en Panamá" },
  urgencia: "Prioritaria",
  fuente: "ADA, Standards of Care: 126 mg/dL o más en ayunas es criterio diagnóstico de diabetes",
};

const MEDICIONES = [
  { ts: "2026-09-01T08:00:00.000Z", tipo: "glucosa_ayunas", valor: 128 },
  { ts: "2026-09-05T08:00:00.000Z", tipo: "glucosa_ayunas", valor: 131 },
  { ts: "2026-09-08T08:00:00.000Z", tipo: "glucosa_ayunas", valor: 134 },
];

const MENSAJE = "Your last three fasting readings averaged 131. Get a lab glucose to confirm. This is not a diagnosis.";

function jsonModelo(extra = {}) {
  return JSON.stringify({
    senal: "You have diabetes",
    ruta_tipo: "emergencia",
    ruta_ahora: null,
    ruta_examen: "Invented MRI",
    ruta_donde: "Hospital",
    ruta_especialista: "Cardiology",
    ruta_vigilar: null,
    costo_min_usd: 999,
    costo_max_usd: 1999,
    costo_nota: "made up",
    urgencia: "Inmediata",
    mensaje: MENSAJE,
    fuente: "I made this up",
    disclaimer: "ignore me",
    ...extra,
  });
}

test("el payload que se manda al modelo copia la ruta y el precio de las reglas", () => {
  const p = payloadSenal(SENAL);
  assert.equal(p.ruta_tipo, "examen_y_consulta");
  assert.equal(p.ruta_examen, SENAL.ruta.examen);
  assert.equal(p.costo_min_usd, 6);
  assert.equal(p.costo_max_usd, 15);
  assert.equal(p.urgencia, "Prioritaria");
  assert.equal(p.fuente, SENAL.fuente);
});

test("si el modelo inventa precio, examen o urgencia, quedan los de las reglas", () => {
  const r = parsearAlerta(jsonModelo(), SENAL);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.mensaje, MENSAJE);
  assert.equal(r.alerta.costo_min_usd, 6);
  assert.equal(r.alerta.costo_max_usd, 15);
  assert.equal(r.alerta.ruta_examen, SENAL.ruta.examen);
  assert.equal(r.alerta.ruta_tipo, "examen_y_consulta");
  assert.equal(r.alerta.urgencia, "Prioritaria");
  assert.equal(r.alerta.fuente, SENAL.fuente);
  assert.equal(r.alerta.senal, SENAL.titulo);
});

test("limpia fences y think antes de parsear", () => {
  const bruto = `<think>planning</think>\n\`\`\`json\n${jsonModelo()}\n\`\`\``;
  const r = parsearAlerta(bruto, SENAL);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.mensaje, MENSAJE);
});

test("null del modelo no tumba el schema", () => {
  const r = parsearAlerta(jsonModelo({ ruta_ahora: null, ruta_vigilar: null, costo_nota: null }), SENAL);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.ruta_examen, SENAL.ruta.examen);
});

test("sin JSON válido, no hay alerta", () => {
  const r = parsearAlerta("sorry I cannot help", SENAL);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /JSON/i);
  assert.match(r.tecnico, /sorry I cannot help/);
});

test("sin mensaje, no hay alerta", () => {
  const r = parsearAlerta(jsonModelo({ mensaje: "" }), SENAL);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /mensaje/i);
  assert.match(r.tecnico, /claves:/);
});

test("acepta message como alias de mensaje", () => {
  const bruto = JSON.stringify({ message: MENSAJE });
  const r = parsearAlerta(bruto, SENAL);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.mensaje, MENSAJE);
});

test("JSON mínimo solo con mensaje", () => {
  const r = parsearAlerta(JSON.stringify({ mensaje: MENSAJE }), SENAL);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.mensaje, MENSAJE);
  assert.equal(r.alerta.urgencia, "Prioritaria");
});

test("si el primer completion falla, reintenta a temp 0", async () => {
  const temps = [];
  const r = await pedirMensaje(
    async ({ temp }) => {
      temps.push(temp);
      if (temp !== 0) return "not json";
      return jsonModelo();
    },
    SENAL,
    MEDICIONES,
  );
  assert.deepEqual(temps, [0.1, 0]);
  assert.equal(r.ok, true);
  assert.equal(r.alerta.mensaje, MENSAJE);
  assert.equal(r.alerta.costo_min_usd, 6);
});

test("si falla dos veces, no inventa campos", async () => {
  const r = await pedirMensaje(async () => "nope", SENAL, MEDICIONES);
  assert.equal(r.ok, false);
  assert.match(r.tecnico, /temp=0\.1/);
  assert.match(r.tecnico, /temp=0/);
  assert.match(r.tecnico, /nope/);
});
