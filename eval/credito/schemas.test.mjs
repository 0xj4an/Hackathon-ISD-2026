import test from "node:test";
import assert from "node:assert/strict";
import { SolicitudSchema, RespuestaBancoSchema } from "../../mobile/src/core/schemas.ts";

const BASE = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  creada: "2026-09-10T12:00:00.000Z",
  proposito: "salud",
  monto_solicitado_usd: 920,
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
  estado: "pendiente",
};

test("la solicitud acepta los tres campos nuevos", () => {
  const s = SolicitudSchema.parse(BASE);
  assert.equal(s.deudas_mensuales_usd, 40);
  assert.equal(s.personas_a_cargo, 0);
  assert.equal(s.ingresos.antiguedad_meses, 36);
});

test("las deudas y las personas a cargo tienen valor por defecto", () => {
  const sin = { ...BASE };
  delete sin.deudas_mensuales_usd;
  delete sin.personas_a_cargo;
  const s = SolicitudSchema.parse(sin);
  assert.equal(s.deudas_mensuales_usd, 0);
  assert.equal(s.personas_a_cargo, 0);
});

test("la respuesta del banco acepta grado, componentes y factores", () => {
  const r = RespuestaBancoSchema.parse({
    solicitud_id: BASE.id, decision: "aprobada", monto_aprobado_usd: 920,
    plazo_meses: 12, tasa_anual_pct: 10.08, cuota_mensual_usd: 80.92,
    grado: "A", pd_pct: 2.5,
    tasa_componentes: { fondeo: 4.5, riesgo: 1.88, opex: 0.65, capital: 1.05, margen: 2 },
    factores: [{ variable: "saldo_sobre_ingreso", valor: 0.4, puntos: 12,
                 que_cambiaria: "Mantener saldo en la cuenta sube tu puntaje" }],
    politica_version: "2026-09-10",
    motivo: "aprobado por capacidad de pago", ts: "2026-09-10T12:00:01.000Z",
  });
  assert.equal(r.grado, "A");
  assert.equal(r.factores.length, 1);
});
