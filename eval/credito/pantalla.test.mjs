// El contrato de la pantalla 11 con el motor.
//
// `PantallaDatos` arma un objeto a mano y se lo pasa a `preCalificar()`. Si esa
// forma se desalinea, la app muestra un error en vez de una cuota y solo se
// descubre con el telefono en la mano. Esto lo descubre en segundos.
import test from "node:test";
import assert from "node:assert/strict";
import { preCalificar, decidir } from "../../mobile/src/core/credito/motor.ts";

/** Identico a lo que construye `continuar()` en PantallaDatos.tsx. */
const armaPantalla = ({ anio, ingreso, tipo, antiguedad, deudas, aCargo, extracto }) => ({
  id: undefined,
  monto_solicitado_usd: 920,
  cedula: { fecha_nacimiento: `${anio}-01-01`, confianza: 1 },
  ingresos: {
    ingreso_mensual_usd: ingreso, tipo,
    antiguedad_meses: antiguedad, confianza: 1,
  },
  deudas_mensuales_usd: deudas,
  personas_a_cargo: aCargo,
  extracto,
});

const HOY = new Date("2026-09-10T12:00:00Z");
const BASE = { anio: 1990, ingreso: 520, tipo: "asalariado", antiguedad: 36, deudas: 40, aCargo: 0 };

test("lo que arma la pantalla produce una cuota", () => {
  const pre = preCalificar(armaPantalla(BASE), HOY);
  assert.equal(pre.viable, true);
  assert.equal(pre.estimado, true);
  assert.equal(pre.monto, 920);
  assert.equal(pre.cuota, 84.08);
});

test("el extracto de la pantalla baja la cuota", () => {
  const con = preCalificar(armaPantalla({
    ...BASE,
    extracto: { banco: "Banco declarado por la persona", saldo_promedio_usd: 208, meses_cubiertos: 6, confianza: 1 },
  }), HOY);
  assert.ok(con.cuota < 84.08, "con extracto tiene que costar menos");
});

test("sin id, el nodo igual decide", () => {
  // La cola le pone `id`, `creada` y `estado` justo antes de enviar. El motor no
  // los necesita para decidir, y no puede romperse si todavia no estan.
  const r = decidir(armaPantalla(BASE), {}, HOY);
  assert.equal(r.decision, "aprobada");
  assert.equal(r.solicitud_id, undefined);
});

test("un ingreso que no alcanza no revienta, explica", () => {
  const pre = preCalificar(armaPantalla({ ...BASE, ingreso: 260, aCargo: 3 }), HOY);
  assert.equal(pre.viable, false);
  assert.match(pre.motivo, /cuota maxima/);
  assert.equal(pre.capacidad.cuota_max, 0);
});

const LECTURA_DEMO = {
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04",
            fecha_expiracion: "2030-01-01", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  fotosBorradas: 2,
};

test("lo que arma la lectura es una solicitud que el banco acepta", async () => {
  const { solicitudDeLectura } = await import("../../mobile/src/lectura.ts");
  const { SolicitudSchema } = await import("../../mobile/src/core/schemas.ts");
  const sol = solicitudDeLectura(920, LECTURA_DEMO);
  assert.equal(sol.proposito, "salud");
  assert.doesNotThrow(() => SolicitudSchema.parse(sol));
  assert.equal("motivo_de_salud" in sol, false);
});

// Hermes en el teléfono no expone `crypto`; Sentry ISD-HACKATHON-MOBILE-4.
test("sin crypto global sigue armando una solicitud con uuid", async () => {
  const { solicitudDeLectura } = await import("../../mobile/src/lectura.ts");
  const { SolicitudSchema } = await import("../../mobile/src/core/schemas.ts");
  const previo = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true, writable: true });
  try {
    const sol = solicitudDeLectura(920, LECTURA_DEMO);
    assert.match(sol.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.doesNotThrow(() => SolicitudSchema.parse(sol));
  } finally {
    Object.defineProperty(globalThis, "crypto", { value: previo, configurable: true, writable: true });
  }
});
