// Aritmetica del prestamo. Sin dependencias: la usan el telefono y el nodo.
//
// OJO: dentro de `credito/` los imports relativos llevan extension `.ts`
// explicita, al reves que el resto de `mobile/src/core/`. Node lo exige para
// importar TypeScript sin build, que es como el nodo consume este motor.

/** Cuota fija de un prestamo frances. */
export function cuota(monto: number, tasaAnualPct: number, meses: number): number {
  const r = tasaAnualPct / 100 / 12;
  if (r === 0) return monto / meses;
  return (monto * r) / (1 - Math.pow(1 + r, -meses));
}

/** Redondeo a centavos. Todo lo que se le muestra a una persona pasa por aqui. */
export function centavos(n: number): number {
  return Math.round(n * 100) / 100;
}
