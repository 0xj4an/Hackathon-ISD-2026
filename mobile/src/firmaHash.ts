/** Hash corto del trazo de firma (demo). No sale al banco de nuevo. */
export type PuntoFirma = { x: number; y: number };

export function hashTrazo(trazos: PuntoFirma[][]): string {
  let h = 2166136261;
  for (const t of trazos) {
    for (const p of t) {
      h ^= Math.round(p.x * 10) + Math.round(p.y * 10) * 1000;
      h = Math.imul(h, 16777619);
    }
    h ^= 0xff;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
