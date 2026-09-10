// Monto y plazo. El plazo NO se escalona por monto: sale de la cuota que cabe.
//
// El modelo viejo hacia lo contrario (<=300 seis meses, <=1000 doce, arriba
// veinticuatro), que es poner la causa despues del efecto.
//
// La tasa depende del monto y del plazo, y la PD tambien depende del monto
// porque `monto_sobre_ingreso` es variable del scorecard. No hace falta punto
// fijo: se recorren candidatos de monto en orden descendente y, dentro de cada
// uno, plazos en orden ascendente, recalculando todo. El primero que cabe gana,
// que ademas es el plazo mas corto y por tanto el que menos intereses paga.

import { POLITICA, type Politica } from "./politica.ts";
import { cuota as cuotaDe, centavos } from "./finanzas.ts";
import { precio, type Componentes } from "./precio.ts";

export type Estructura = {
  monto: number;
  meses: number;
  tasa_anual_pct: number;
  cuota: number;
  bajo_costo: boolean;
  componentes: Componentes;
  recortado: boolean;
};

export function estructurar(
  pd: number,
  pedido: number,
  cap: { cuota_max: number; monto_max: number },
  pol: Politica = POLITICA,
): Estructura | null {
  const inicial = Math.min(pedido, cap.monto_max);
  let monto = inicial;
  while (monto >= pol.valores.monto_min) {
    for (const meses of pol.plazos) {
      const p = precio(pd, monto, meses, pol);
      const c = centavos(cuotaDe(monto, p.tasa_anual_pct, meses));
      if (c <= cap.cuota_max) {
        return {
          monto: Math.round(monto),
          meses,
          tasa_anual_pct: p.tasa_anual_pct,
          cuota: c,
          bajo_costo: p.bajo_costo,
          componentes: p.componentes,
          recortado: Math.round(monto) < Math.round(pedido),
        };
      }
    }
    monto = Math.floor(monto * 0.9);
  }
  return null;
}
