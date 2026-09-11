/**
 * Llave pública del startQVACProvider (laptop). El teléfono hace
 * dht.connect(llave); no hay topic. Vacío = solo HTTP /inferir.
 *
 * Orden: pegada a mano → /salud del pueblo → EXPO_PUBLIC_P2P_PROVEEDOR.
 */
import {
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
} from "expo-file-system/legacy";

const ARCHIVO = "p2p-proveedor.txt";

let manual: string | null | undefined;
let pueblo: string | null = null;

export type OrigenP2p = "manual" | "pueblo" | "env" | "ninguno";

export function normalizarClave(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(t) ? t : null;
}

function envClave(): string {
  return (process.env.EXPO_PUBLIC_P2P_PROVEEDOR ?? "").trim().toLowerCase();
}

export function claveProveedor(): string {
  return (manual || pueblo || envClave() || "").trim();
}

export function origenClave(): OrigenP2p {
  if (manual) return "manual";
  if (pueblo) return "pueblo";
  if (envClave()) return "env";
  return "ninguno";
}

export function etiquetaOrigenP2p(o: OrigenP2p): string {
  if (o === "manual") return "pegada";
  if (o === "pueblo") return "del pueblo";
  if (o === "env") return "env";
  return "sin par";
}

export function claveCorta(k = claveProveedor()): string {
  return k ? `${k.slice(0, 8)}…` : "—";
}

export async function cargarClaveP2p(): Promise<void> {
  try {
    if (!documentDirectory) { manual = null; return; }
    manual = normalizarClave(await readAsStringAsync(`${documentDirectory}${ARCHIVO}`));
  } catch {
    manual = null;
  }
}

export async function fijarClaveP2p(raw: string): Promise<string | null> {
  const n = normalizarClave(raw);
  if (!n) return null;
  manual = n;
  if (documentDirectory) await writeAsStringAsync(`${documentDirectory}${ARCHIVO}`, n);
  return n;
}

export async function limpiarClaveP2p(): Promise<void> {
  manual = null;
  if (!documentDirectory) return;
  try { await deleteAsync(`${documentDirectory}${ARCHIVO}`, { idempotent: true }); } catch { /* ignore */ }
}

/** El pueblo anunció la llave en /salud. No pisa una pegada a mano. */
export function tomarClavePueblo(raw: string | undefined): void {
  const n = raw ? normalizarClave(raw) : null;
  pueblo = n;
}
