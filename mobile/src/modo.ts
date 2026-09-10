/**
 * Demo: capacidad × red. Independiente del tronco de producto
 * (historial → resultado → crédito/examen).
 *
 *   local-wifi     MedPsy local + envío al banco
 *   local-offline  MedPsy local + pueblo/pendiente
 *   nodo-offline   delegar al nodo (/inferir) + pueblo/pendiente
 */
import { USUARIOS, type Usuario } from "./usuarios";
import { COLOR } from "./ui/tokens";

export type ModoId = "local-wifi" | "local-offline" | "nodo-offline";

export type Modo = {
  id: ModoId;
  wifi: string;
  modelo: string;
  detalle: string;
  franja: string;
  color: string;
};

export const MODOS: Modo[] = [
  {
    id: "local-wifi",
    wifi: "WiFi disponible",
    modelo: "Modelo local",
    detalle: "MedPsy en este teléfono. El crédito sale directo al banco.",
    franja: "WiFi disponible · modelo local. El banco está al alcance.",
    color: COLOR.rutinaria,
  },
  {
    id: "local-offline",
    wifi: "WiFi no disponible",
    modelo: "Modelo local",
    detalle: "MedPsy en este teléfono. Sin internet: pueblo o pendiente.",
    franja: "WiFi no disponible · modelo local. El crédito va al pueblo o queda pendiente.",
    color: COLOR.prioritaria,
  },
  {
    id: "nodo-offline",
    wifi: "WiFi no disponible",
    modelo: "Delegar al nodo",
    detalle: "MedPsy no corre aquí. La inferencia se delega al nodo si hay LAN.",
    franja: "WiFi no disponible · delegar al nodo.",
    color: COLOR.inmediata,
  },
];

export function etiquetaModo(m: Modo): string {
  return `${m.wifi} + ${m.modelo}`;
}

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

export function fichaModo(): Modo & { titulo: string } {
  const m = MODOS.find(e => e.id === activo) ?? MODOS[0];
  return { ...m, titulo: etiquetaModo(m) };
}
