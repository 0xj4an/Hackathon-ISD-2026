/**
 * Demo: capacidad × red. Independiente del tronco de producto
 * (historial → resultado → crédito/examen).
 *
 *   local-wifi     MedPsy aquí + envío al banco
 *   local-offline  MedPsy aquí + pueblo/pendiente
 *   nodo-offline   texto a /inferir + pueblo/pendiente
 */
import { USUARIOS, type Usuario } from "./usuarios";
import { COLOR } from "./ui/tokens";

export type ModoId = "local-wifi" | "local-offline" | "nodo-offline";

export const MODOS: {
  id: ModoId;
  titulo: string;
  detalle: string;
  franja: string;
  color: string;
}[] = [
  {
    id: "local-wifi",
    titulo: "Modelo aquí · hay wifi",
    detalle: "MedPsy en este teléfono. El crédito sale directo al banco.",
    franja: "Modelo aquí y wifi. El banco está al alcance.",
    color: COLOR.rutinaria,
  },
  {
    id: "local-offline",
    titulo: "Modelo aquí · sin wifi",
    detalle: "MedPsy en este teléfono. Sin internet: pueblo o pendiente.",
    franja: "Modelo aquí, sin wifi. El JSON no va a Railway.",
    color: COLOR.prioritaria,
  },
  {
    id: "nodo-offline",
    titulo: "Modelo en el nodo · sin wifi",
    detalle: "Este teléfono no corre MedPsy. Texto al pueblo si hay LAN.",
    franja: "Sin modelo en el aparato. Pide el texto al pueblo.",
    color: COLOR.inmediata,
  },
];

const CASO = "diabetes";
let activo: ModoId = "local-wifi";

export function modo(): ModoId {
  return activo;
}

export function fijarModo(id: ModoId) {
  activo = id;
}

export function resetModo() {
  activo = "local-wifi";
}

export function usuarioDelModo(): Usuario {
  return USUARIOS.find(u => u.id === CASO) ?? USUARIOS[0];
}

export function saltarMedPsyLocal(): boolean {
  return activo === "nodo-offline";
}

/** Offline hacia el banco remoto. */
export function sinWifiDemo(): boolean {
  return activo === "local-offline" || activo === "nodo-offline";
}

export function fichaModo(): (typeof MODOS)[number] {
  return MODOS.find(e => e.id === activo) ?? MODOS[0];
}
