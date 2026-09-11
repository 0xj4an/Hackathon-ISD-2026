/**
 * Helpers visuales del envío: pausas y barras aunque el HTTP sea instantáneo.
 * Tiempos pensados para el video (legibles), no para latencia real.
 */

/** Duraciones mínimas por fase (ms). */
export const ENVIO_MS = {
  avisoOffline: 2800,
  avisoFallback: 2000,
  buscandoNodo: 3400,
  conectando: 1800,
  subiendoBanco: 3200,
  subiendoPueblo: 3000,
  recibiendoBanco: 2800,
  recibiendoPueblo: 2600,
  cierre: 700,
  barraColaMin: 500,
} as const;

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Anima pct de `desde` a `hasta` en `ms`, llamando `onPct` en cada tick. */
export async function animarPct(
  desde: number,
  hasta: number,
  ms: number,
  onPct: (n: number) => void,
  vivo?: () => boolean,
): Promise<void> {
  const pasos = Math.max(12, Math.round(ms / 50));
  const dt = ms / pasos;
  for (let i = 1; i <= pasos; i++) {
    if (vivo && !vivo()) return;
    onPct(desde + ((hasta - desde) * i) / pasos);
    await sleep(dt);
  }
}

/**
 * Corre `trabajo` en paralelo con una barra mínima `msMin`.
 * La barra llega a `pctFin` cuando termina el más lento de los dos.
 */
export async function conBarraMinima<T>(
  trabajo: Promise<T>,
  msMin: number,
  pctIni: number,
  pctFin: number,
  onPct: (n: number) => void,
  vivo?: () => boolean,
): Promise<T> {
  const t0 = Date.now();
  const mitad = pctIni + (pctFin - pctIni) * 0.65;
  const barra = animarPct(pctIni, mitad, Math.min(msMin * 0.7, msMin), onPct, vivo);
  const resultado = await Promise.all([trabajo, barra]).then(([v]) => v);

  const restante = Math.max(0, msMin - (Date.now() - t0));
  await animarPct(mitad, pctFin, Math.max(ENVIO_MS.barraColaMin, restante), onPct, vivo);
  return resultado;
}
