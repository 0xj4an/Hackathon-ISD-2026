/**
 * Tres caminos. Dos ejes: WiFi al banco × modelo en el teléfono.
 *
 *   local-wifi     inferencia aquí (MedPsy + LoRA) · solicitudes al banco
 *   local-offline  inferencia aquí (MedPsy + LoRA) · solicitudes por el nodo
 *   nodo-offline   sin modelo aquí · inferencia y solicitudes en el nodo
 */
import { useEffect, useState } from "react";
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
    franja: "WiFi disponible · MedPsy en este teléfono. El banco está al alcance.",
    color: COLOR.rutinaria,
  },
  {
    id: "local-offline",
    wifi: "WiFi no disponible",
    modelo: "Modelo local",
    detalle: "MedPsy en este teléfono. Sin internet: pueblo o pendiente.",
    franja: "WiFi no disponible · MedPsy en este teléfono. El crédito va al pueblo o queda pendiente.",
    color: COLOR.prioritaria,
  },
  {
    id: "nodo-offline",
    wifi: "WiFi no disponible",
    modelo: "Delegar al nodo",
    detalle: "Este teléfono no corre MedPsy. El pedido va al par P2P o al pueblo HTTP.",
    franja: "WiFi no disponible · MedPsy en el nodo del pueblo.",
    color: COLOR.inmediata,
  },
];

export function etiquetaModo(m: Modo): string {
  return `${m.wifi} + ${m.modelo}`;
}

const CASO = "diabetes";
let activo: ModoId = "local-wifi";
const modoListeners = new Set<() => void>();

function avisarModo() {
  for (const l of modoListeners) l();
}

export function subscribeModo(fn: () => void): () => void {
  modoListeners.add(fn);
  return () => { modoListeners.delete(fn); };
}

export function useFichaModo(): Modo & { titulo: string } {
  const [, tick] = useState(0);
  useEffect(() => subscribeModo(() => tick(n => n + 1)), []);
  return fichaModo();
}

export function modo(): ModoId {
  return activo;
}

export function fijarModo(id: ModoId) {
  activo = id;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { marcarRuntimeSentry, breadcrumbApp } = require("./sentry") as typeof import("./sentry");
    marcarRuntimeSentry({ modo: id });
    breadcrumbApp("sesion", "modo", { modo: id });
  } catch {
    /* Sentry opcional en tests */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { marcarVia, demoLog } = require("./demoLog") as typeof import("./demoLog");
    marcarVia({
      via: id === "nodo-offline" ? "p2p" : "local",
      viva: false,
      texto: id === "nodo-offline"
        ? "Sin capacidad aquí · delegando al nodo"
        : "MedPsy en este teléfono",
    });
    demoLog(`sesión ${etiquetaModoCorta(id)}`);
    demoLog(id === "nodo-offline"
      ? "este teléfono no corre MedPsy · el nodo corre MedPsy 1.7B Q8"
      : "MedPsy 1.7B Q8 en este teléfono");
  } catch {
    /* demoLog opcional en tests */
  }
  avisarModo();
}

export function resetModo() {
  activo = "local-wifi";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { marcarVia } = require("./demoLog") as typeof import("./demoLog");
    marcarVia({ via: "local", viva: false, texto: "MedPsy en este teléfono" });
  } catch { /* opcional */ }
  avisarModo();
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

/** Corta, para consola de grabación. */
export function etiquetaModoCorta(id: ModoId = activo): string {
  if (id === "local-wifi") return "WiFi · modelo local";
  if (id === "local-offline") return "sin WiFi · modelo local";
  return "sin WiFi · sin capacidad";
}
