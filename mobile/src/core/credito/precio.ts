// La tasa no es un numero, es una suma de costos.
//
//   tasa = fondeo + perdida esperada + costo de originar + cargo de capital + margen
//
// El termino de opex es el que ensena la tesis del proyecto: con 920 a 12 meses
// pesa 0.65% anual, con 28 a 6 meses pesa 42.86%. Por eso el microcredito real
// cuesta 20 a 40 por ciento, y por eso originar sin sucursal es lo unico que
// permite cobrar menos.
//
// Cuando el costo real pasa del techo la tasa se acota y el banco absorbe la
// diferencia: el credito pequeno se sostiene con el grande. Es decision de
// producto, y por eso se marca `bajo_costo` en vez de esconderlo.

import { POLITICA, type Politica } from "./politica.ts";
import { centavos } from "./finanzas.ts";

export type Componentes = {
  fondeo: number; riesgo: number; opex: number; capital: number; margen: number;
};

export type Precio = {
  tasa_anual_pct: number;
  bruta_pct: number;
  bajo_costo: boolean;
  componentes: Componentes;
};

export function precio(pd: number, monto: number, meses: number, pol: Politica = POLITICA): Precio {
  const v = pol.valores;
  const anios = meses / 12;
  const riesgo = pd * v.lgd;
  const opex = v.opex_solicitud / (monto * anios);
  const capital = v.capital_pct * (v.retorno_exigido - v.fondeo);
  const extra = meses > pol.plazo_preferente
    ? v.prima_plazo * ((meses - pol.plazo_preferente) / 12)
    : 0;
  const bruta = v.fondeo + riesgo + opex + capital + v.margen + extra;
  const tasa = Math.min(Math.max(bruta, v.tasa_piso), v.tasa_techo);
  return {
    tasa_anual_pct: centavos(tasa * 100),
    bruta_pct: centavos(bruta * 100),
    bajo_costo: bruta > v.tasa_techo,
    componentes: {
      fondeo: centavos(v.fondeo * 100),
      riesgo: centavos(riesgo * 100),
      opex: centavos(opex * 100),
      capital: centavos(capital * 100),
      margen: centavos(v.margen * 100),
    },
  };
}
