// Por que salio esta decision, en algo que la persona pueda hacer.
//
// Un banco llama a esto adverse action: no basta decir "capacidad de pago
// insuficiente", hay que decir que factor peso y que tendria que cambiar. El
// EU AI Act lo exige para sistemas de credito desde agosto de 2026, y aunque
// Panama no lo aplique, decir "no" sin decir "por que" es inutil para quien
// esta del otro lado de la pantalla.
//
// Solo entran variables ACCIONABLES: cosas que la persona puede cambiar. Por
// eso la edad no esta en el scorecard.

import { MODELO, type Modelo } from "./modelo.ts";
import type { Puntuacion, Variables } from "./scorecard.ts";

export type Factor = {
  variable: string;
  valor: number;
  puntos: number;
  que_cambiaria: string;
};

type Contexto = { ingresos: { ingreso_mensual_usd: number } };

function accion(variable: string, gana: number, ctx: Contexto, modelo: Modelo): string {
  const ingreso = ctx.ingresos.ingreso_mensual_usd;
  const def = modelo.bins[variable];
  const corte = def.clase === "numerica" ? def.cortes : [];
  const puntos = `sumaria ${gana} puntos`;
  switch (variable) {
    case "meses_extracto":
      return `Adjuntar un extracto bancario de al menos ${corte[2] ?? 6} meses ${puntos}`;
    case "saldo_ing":
      return `Mantener un saldo promedio de B/. ${Math.ceil((corte[1] ?? 0.5) * ingreso)} en la cuenta ${puntos}`;
    case "deuda_ing":
      return `Bajar tus cuotas de otras deudas a menos de B/. ${Math.floor((corte[0] ?? 0.05) * ingreso)} al mes ${puntos}`;
    case "monto_ing":
      return `Pedir menos de B/. ${Math.floor((corte[1] ?? 0.8) * ingreso)} ${puntos}`;
    case "antiguedad":
      return `Cumplir ${corte[1] ?? 60} meses en la misma actividad ${puntos}`;
    case "tipo":
      return `Un ingreso con carta laboral verificable ${puntos}`;
    default:
      return "";
  }
}

export function factoresDe(
  p: Puntuacion,
  v: Variables,
  ctx: Contexto,
  modelo: Modelo = MODELO,
): Factor[] {
  return p.detalle
    .map((d) => {
      const posibles = modelo.puntos[d.variable];
      const mejor = Math.max(...posibles);
      const gana = mejor - d.puntos;
      return {
        variable: d.variable,
        valor: typeof d.valor === "number" ? Number(d.valor.toFixed(4)) : 0,
        puntos: d.puntos,
        perdidos: gana,
        que_cambiaria: gana > 0 ? accion(d.variable, gana, ctx, modelo) : "",
      };
    })
    .filter((f) => f.que_cambiaria !== "")
    .sort((a, b) => b.perdidos - a.perdidos)
    .slice(0, 3)
    .map(({ variable, valor, puntos, que_cambiaria }) => ({ variable, valor, puntos, que_cambiaria }));
}
