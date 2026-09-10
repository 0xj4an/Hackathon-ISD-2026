/**
 * Cola offline de la solicitud de crédito.
 *
 * Sin red la app guarda el JSON aquí (SQLite en el teléfono, memoria en tests).
 * Una sola pendiente a la vez: la demo no apila solicitudes. Al responder el
 * banco se borra. Nunca guarda fotos ni motivo de salud.
 */
import type { Solicitud } from "./core/schemas";

export type PendienteCredito = {
  solicitud: Solicitud;
  detalle: string;
  /** Para reabrir el caso de demo tras matar la app. */
  usuario_correo: string;
  costo_min: number;
  costo_max: number;
};

export type ColaStore = {
  guardar(p: PendienteCredito): Promise<void>;
  leer(): Promise<PendienteCredito | null>;
  /** Solo borra si el id coincide con la pendiente guardada. */
  borrar(id: string): Promise<void>;
};

export type Cola = {
  guardar(p: PendienteCredito): Promise<void>;
  leer(): Promise<PendienteCredito | null>;
  borrar(id: string): Promise<void>;
};

export function crearCola(store: ColaStore): Cola {
  return {
    guardar: p => store.guardar(p),
    leer: () => store.leer(),
    borrar: id => store.borrar(id),
  };
}

/** Store en RAM para eval. No es durable: eso lo prueba el de SQLite en el teléfono. */
export function memoriaStore(): ColaStore {
  let fila: PendienteCredito | null = null;
  return {
    async guardar(p) {
      fila = structuredClone(p);
    },
    async leer() {
      return fila ? structuredClone(fila) : null;
    },
    async borrar(id) {
      if (fila?.solicitud.id === id) fila = null;
    },
  };
}

let activa: Cola | null = null;

/** Tests y arranque: fija el store activo. */
export function usarCola(store: ColaStore): Cola {
  activa = crearCola(store);
  return activa;
}

export function colaActiva(): Cola | null {
  return activa;
}

export async function guardarPendiente(p: PendienteCredito): Promise<void> {
  if (!activa) return;
  await activa.guardar(p);
}

export async function leerPendiente(): Promise<PendienteCredito | null> {
  return activa ? activa.leer() : null;
}

export async function borrarPendiente(id: string): Promise<void> {
  if (!activa) return;
  await activa.borrar(id);
}
