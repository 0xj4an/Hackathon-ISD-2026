/**
 * Cola offline de crédito. Sin teléfono: store en memoria.
 * Si no sobrevive un "kill" simulado (nueva instancia del store vacío
 * vs rehidratación desde el mismo store), C8 es teatro.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  crearCola,
  memoriaStore,
} from "../../mobile/src/cola.ts";

const SOL = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  creada: "2026-09-10T12:00:00.000Z",
  proposito: "salud",
  monto_solicitado_usd: 920,
  cedula: {
    numero: "8-123-4567",
    nombre: "Ana Perez",
    fecha_nacimiento: "1990-05-04",
    confianza: 0.9,
  },
  ingresos: {
    empleador_o_actividad: "Finca La Union",
    ingreso_mensual_usd: 520,
    tipo: "asalariado",
    antiguedad_meses: 36,
    confianza: 0.9,
  },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
  estado: "pendiente",
};

const META = {
  usuario_correo: "insulina@gmail.com",
  costo_min: 641,
  costo_max: 920,
  detalle: "Sin red y sin el nodo del pueblo. La solicitud queda pendiente.",
};

test("guardar y leer sobreviven en el store", async () => {
  const store = memoriaStore();
  const cola = crearCola(store);
  assert.equal(await cola.leer(), null);

  await cola.guardar({ solicitud: SOL, ...META });
  const p = await cola.leer();
  assert.ok(p);
  assert.equal(p.solicitud.id, SOL.id);
  assert.equal(p.usuario_correo, "insulina@gmail.com");
  assert.equal(p.detalle.includes("pendiente"), true);
});

test("una sola pendiente: la nueva reemplaza la anterior", async () => {
  const cola = crearCola(memoriaStore());
  await cola.guardar({ solicitud: SOL, ...META });
  const otra = {
    ...SOL,
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    monto_solicitado_usd: 170,
  };
  await cola.guardar({
    solicitud: otra,
    ...META,
    detalle: "En el nodo del pueblo.",
  });
  const p = await cola.leer();
  assert.equal(p.solicitud.id, otra.id);
  assert.equal(p.solicitud.monto_solicitado_usd, 170);
});

test("borrar quita la pendiente (respuesta del banco)", async () => {
  const cola = crearCola(memoriaStore());
  await cola.guardar({ solicitud: SOL, ...META });
  await cola.borrar(SOL.id);
  assert.equal(await cola.leer(), null);
});

test("borrar un id que no es el guardado no borra otro", async () => {
  const cola = crearCola(memoriaStore());
  await cola.guardar({ solicitud: SOL, ...META });
  await cola.borrar("ffffffff-ffff-4fff-8fff-ffffffffffff");
  assert.equal((await cola.leer()).solicitud.id, SOL.id);
});

test("App importa y usa la cola", async () => {
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../../mobile/App.tsx", import.meta.url), "utf8");
  assert.match(app, /from ["'].*\/cola/);
  assert.match(app, /guardarPendiente/);
  assert.match(app, /borrarPendiente/);
  assert.match(app, /iniciarColaSqlite/);
});
