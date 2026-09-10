/**
 * Demo: capacidad × red. Independiente de la vía de salud (historial | examen)
 * y del caso sintético. No son vía A/B de salud ni camino A/B de crédito.
 *
 *   A  corre MedPsy y hay wifi → modelo aquí, crédito al banco
 *   B  corre MedPsy y no hay wifi → modelo aquí, JSON al pueblo o pendiente
 *   C  no corre MedPsy y no hay wifi → texto al pueblo si hay LAN; si no, reglas
 */
import { USUARIOS, type Usuario } from "./usuarios";
import { COLOR } from "./ui/tokens";

export type EscenarioId = "A" | "B" | "C";
export type ViaSalud = "historial" | "examen";

export const ESCENARIOS: {
  id: EscenarioId;
  titulo: string;
  detalle: string;
  franja: string;
  color: string;
}[] = [
  {
    id: "A",
    titulo: "Carga el modelo · hay wifi",
    detalle: "MedPsy en este teléfono. El crédito sale directo al banco.",
    franja: "Modelo aquí y wifi. El banco está al alcance.",
    color: COLOR.rutinaria,
  },
  {
    id: "B",
    titulo: "Carga el modelo · sin wifi",
    detalle: "MedPsy en este teléfono. Sin internet: pueblo o pendiente.",
    franja: "Modelo aquí, sin wifi. El JSON no va a Railway.",
    color: COLOR.prioritaria,
  },
  {
    id: "C",
    titulo: "No carga el modelo · sin wifi",
    detalle: "Este teléfono no corre MedPsy. Texto al pueblo si hay LAN.",
    franja: "Sin modelo en el aparato. Pide el texto al pueblo.",
    color: COLOR.inmediata,
  },
];

export const VIAS_SALUD: {
  id: ViaSalud;
  titulo: string;
  detalle: string;
}[] = [
  {
    id: "historial",
    titulo: "Historial",
    detalle: "Reglas + redacción. De aquí se puede pedir crédito.",
  },
  {
    id: "examen",
    titulo: "Examen",
    detalle: "Foto del papel. Vuelve a la alerta; no pide crédito.",
  },
];

const CASO = "diabetes";

let activo: EscenarioId = "A";
let via: ViaSalud = "historial";

export function escenario(): EscenarioId {
  return activo;
}

export function viaSalud(): ViaSalud {
  return via;
}

export function fijarEscenario(id: EscenarioId) {
  activo = id;
}

export function fijarViaSalud(id: ViaSalud) {
  via = id;
}

export function resetEscenario() {
  activo = "A";
  via = "historial";
}

export function usuarioDelEscenario(): Usuario {
  return USUARIOS.find(u => u.id === CASO) ?? USUARIOS[0];
}

export function saltarMedPsyLocal(): boolean {
  return activo === "C";
}

/** B y C: no hay internet hacia el banco. */
export function sinWifiDemo(): boolean {
  return activo === "B" || activo === "C";
}

export function fichaEscenario(): (typeof ESCENARIOS)[number] {
  return ESCENARIOS.find(e => e.id === activo) ?? ESCENARIOS[0];
}
