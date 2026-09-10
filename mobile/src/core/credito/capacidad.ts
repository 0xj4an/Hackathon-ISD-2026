// Capacidad de pago: cuanto puede pagar al mes esta persona.
//
// El Acuerdo 4-2013 de la Superintendencia de Bancos de Panama la define en su
// articulo 2 numeral 4 como "el resultado de la medicion objetiva que realiza
// el banco para cada deudor de las fuentes de recursos de que dispone para el
// pago de sus obligaciones". Objetiva y por deudor: por eso no es un porcentaje
// del ingreso puesto a dedo.
//
// Se mide de dos formas y manda la mas restrictiva:
//   1. Ingreso residual: lo que sobra despues de deudas y del minimo vital.
//   2. Ratio de servicio de deuda: un techo sobre el ingreso neto.
// Con ingresos bajos el ratio miente y el residual es el que ata. Con ingresos
// altos pasa al reves.

import { POLITICA, deduccionLey, type Politica, type TipoIngreso } from "./politica.ts";
import { centavos } from "./finanzas.ts";

export type EntradaCapacidad = {
  ingreso_mensual_usd: number;
  tipo: TipoIngreso;
  /** Suma de las cuotas mensuales que la persona ya paga. Back-end, no front-end. */
  deudas_mensuales_usd: number;
  personas_a_cargo: number;
};

export type Capacidad = {
  neto: number;
  minimo_vital: number;
  disponible: number;
  cuota_max: number;
  monto_max: number;
  /** Cual de las dos medidas ato la cuota. Va en la explicacion del rechazo. */
  ata: "residual" | "ratio";
};

export function capacidadDePago(e: EntradaCapacidad, pol: Politica = POLITICA): Capacidad {
  const v = pol.valores;
  const neto = centavos(e.ingreso_mensual_usd * (1 - deduccionLey(e.tipo, pol)));
  const minimo_vital = centavos(
    v.cbfa_per_capita * (1 + e.personas_a_cargo) * v.factor_no_alimentos,
  );
  const disponible = Math.max(0, centavos(neto - e.deudas_mensuales_usd - minimo_vital));
  const techo_ratio = centavos(neto * v.tope_dti);
  const cuota_max = Math.min(disponible, techo_ratio);
  const monto_max = Math.min(v.exposicion_x_ingreso * e.ingreso_mensual_usd, v.monto_max);
  return {
    neto,
    minimo_vital,
    disponible,
    cuota_max: centavos(cuota_max),
    monto_max,
    ata: disponible <= techo_ratio ? "residual" : "ratio",
  };
}
