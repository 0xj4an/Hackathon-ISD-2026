// El contrato entre el nodo y el telefono, verificado contra la salida REAL del
// nodo y no contra un objeto escrito a mano. Es el `[~]` que quedaba abierto en
// el CHECKLIST: que `RespuestaBancoSchema` valide lo que el banco devuelve.
import test from "node:test";
import assert from "node:assert/strict";
import { decidir, recibir } from "../../nodo/credito.mjs";
import { SolicitudSchema, RespuestaBancoSchema } from "../../mobile/src/core/schemas.ts";

const SOLICITUD = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  creada: "2026-09-10T12:00:00.000Z",
  proposito: "salud",
  monto_solicitado_usd: 920,
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04",
            fecha_expiracion: "2030-01-01", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
  estado: "pendiente",
};

test("la solicitud de la demo valida contra su schema", () => {
  assert.doesNotThrow(() => SolicitudSchema.parse(SOLICITUD));
});

test("lo que el nodo devuelve valida contra RespuestaBancoSchema", () => {
  const r = decidir(SolicitudSchema.parse(SOLICITUD));
  assert.doesNotThrow(() => RespuestaBancoSchema.parse(r),
    "el nodo devuelve algo que el telefono no sabria leer");
});

test("valida tambien cuando rechaza y cuando manda a revision", () => {
  const pobre = SolicitudSchema.parse({
    ...SOLICITUD,
    ingresos: { ...SOLICITUD.ingresos, ingreso_mensual_usd: 260 },
    personas_a_cargo: 3,
  });
  const ilegible = SolicitudSchema.parse({
    ...SOLICITUD, cedula: { ...SOLICITUD.cedula, confianza: 0.3 },
  });
  const rechazo = decidir(pobre);
  const revision = decidir(ilegible);
  assert.equal(rechazo.decision, "rechazada");
  assert.equal(revision.decision, "revision");
  assert.doesNotThrow(() => RespuestaBancoSchema.parse(rechazo));
  assert.doesNotThrow(() => RespuestaBancoSchema.parse(revision));
});

test("recibir valida y decide en un paso", () => {
  const { sol, respuesta } = recibir(SOLICITUD);
  assert.equal(sol.proposito, "salud");
  assert.equal(respuesta.decision, "aprobada");
  assert.doesNotThrow(() => RespuestaBancoSchema.parse(respuesta));
});

test("recibir rechaza motivo de salud y foto", () => {
  assert.throws(() => recibir({ ...SOLICITUD, motivo_de_salud: "diabetes tipo 2" }));
  assert.throws(() => recibir({ ...SOLICITUD, foto_cedula_b64: "xxxx" }));
});
