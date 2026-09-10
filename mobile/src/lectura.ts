/**
 * Lo que queda de los documentos una vez leídos y borradas las copias.
 * Es lo que viaja entre captura, revisión y el motor de crédito.
 */
import type { Cedula, Extracto, Ingresos, Solicitud } from "./core/schemas";

export type LecturaCredito = {
  cedula: Cedula;
  ingresos: Ingresos;
  extracto?: Extracto;
  fotosBorradas: number;
};

/** UUID para el id de la solicitud. Hermes no tiene `crypto.randomUUID`. */
function nuevoId(): string {
  const desdeApi = globalThis.crypto?.randomUUID?.();
  if (desdeApi) return desdeApi;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Arma el JSON que sale del teléfono. Solo campos de SolicitudSchema. */
export function solicitudDeLectura(monto: number, lectura: LecturaCredito): Solicitud {
  return {
    id: nuevoId(),
    creada: new Date().toISOString(),
    proposito: "salud",
    monto_solicitado_usd: monto,
    cedula: lectura.cedula,
    ingresos: lectura.ingresos,
    deudas_mensuales_usd: 0,
    personas_a_cargo: 0,
    extracto: lectura.extracto,
    estado: "pendiente",
  };
}
