// La vista del banco sobre lo que presto: clasificacion y provisiones.
//
// Acuerdo No. 004-2013 de la Superintendencia de Bancos de Panama, que rige la
// gestion del riesgo de credito. Dos articulos:
//
//   Articulo 18, paragrafo 2: los dias de atraso clasifican la cartera. Para
//   prestamos de consumo sin garantia inmueble: normal 0 a 60, mencion especial
//   61 a 90, subnormal 91 a 120, dudoso 121 a 180, irrecuperable mas de 180.
//
//   Articulo 34: la provision especifica es la ponderacion de cada categoria
//   por la base de computo, que es el saldo menos el valor presente de la
//   garantia. Sin garantia, la base es el saldo entero.
//
// Esto no lo consume la app: es la mitad del modelo que mira el banco, y existe
// para poder mostrar que el precio cubre la perdida.

/** Articulo 18, paragrafo 2, columna de consumo. */
export function clasificar(diasMora) {
  if (diasMora <= 60) return "normal";
  if (diasMora <= 90) return "mencion_especial";
  if (diasMora <= 120) return "subnormal";
  if (diasMora <= 180) return "dudoso";
  return "irrecuperable";
}

/** Articulo 34, tabla de ponderaciones. */
export const PONDERACION = {
  normal: 0,
  mencion_especial: 0.20,
  subnormal: 0.50,
  dudoso: 0.80,
  irrecuperable: 1.00,
};

export function provision(saldo, categoria, valorPresenteGarantia = 0) {
  const base = Math.max(0, saldo - valorPresenteGarantia);
  return Math.round(base * PONDERACION[categoria] * 100) / 100;
}

/**
 * Simula 12 meses de comportamiento de la cartera con la misma PD que uso el
 * precio, y compara la perdida realizada contra lo que se cobro por riesgo.
 * Si el precio no cubre la perdida, el modelo no cierra.
 */
export function simular(creditos, semilla = 20260910) {
  let seed = semilla;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const filas = [];
  let perdida = 0, provisionTotal = 0, expuesto = 0;
  for (const c of creditos) {
    const incumple = rnd() < c.pd;
    // Quien incumple lo hace en un mes al azar del ano; el saldo restante es la
    // exposicion. Simplificacion declarada: amortizacion lineal.
    const mes = incumple ? 1 + Math.floor(rnd() * 12) : 0;
    const saldo = incumple ? Math.round(c.monto * (1 - mes / 12) * 100) / 100 : 0;
    const dias = incumple ? 30 * (12 - mes) + 30 : 0;
    const categoria = incumple ? clasificar(dias) : "normal";
    const prov = incumple ? provision(saldo, categoria) : 0;
    // Perdida dado el incumplimiento del 75%, el mismo LGD que uso el precio.
    const perdidaCredito = incumple ? Math.round(saldo * 0.75 * 100) / 100 : 0;
    expuesto += c.monto;
    perdida += perdidaCredito;
    provisionTotal += prov;
    filas.push({ monto: c.monto, pd: c.pd, incumple, dias, categoria, saldo, provision: prov });
  }
  return {
    filas,
    expuesto: Math.round(expuesto * 100) / 100,
    perdida_esperada: Math.round(perdida * 100) / 100,
    provision: Math.round(provisionTotal * 100) / 100,
    perdida_pct: expuesto ? Math.round((perdida / expuesto) * 10000) / 100 : 0,
  };
}
