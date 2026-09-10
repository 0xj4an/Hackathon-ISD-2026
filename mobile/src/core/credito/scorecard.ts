// Aplica el scorecard entrenado. No entrena nada: lee `modelo.ts`.
//
// Un scorecard es una suma de enteros. Eso lo hace explicable de un vistazo y
// es la razon por la que cumple `ADR-005` mientras que un modelo de lenguaje
// decidiendo credito no lo cumpliria.

import { MODELO, type Modelo, type DefinicionBin } from "./modelo.ts";
import type { TipoIngreso } from "./politica.ts";

export type Variables = {
  tipo: TipoIngreso;
  antiguedad: number;
  deuda_ing: number;
  monto_ing: number;
  meses_extracto: number;
  saldo_ing: number;
  edad: number;
};

export type DetalleVariable = {
  variable: string;
  valor: number | string;
  bin: number;
  puntos: number;
  woe: number;
};

export type Puntuacion = {
  score: number;
  pd: number;
  grado: "A" | "B" | "C" | "D" | "E";
  detalle: DetalleVariable[];
};

/** Solo lo que el scorecard necesita de una solicitud. */
export type EntradaScorecard = {
  monto_solicitado_usd: number;
  deudas_mensuales_usd?: number;
  cedula: { fecha_nacimiento: string };
  ingresos: { ingreso_mensual_usd: number; tipo: TipoIngreso; antiguedad_meses?: number };
  extracto?: { saldo_promedio_usd: number; meses_cubiertos: number };
};

export function edadEn(fechaNacimiento: string, hoy: Date): number {
  const n = new Date(fechaNacimiento);
  let edad = hoy.getUTCFullYear() - n.getUTCFullYear();
  const mes = hoy.getUTCMonth() - n.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < n.getUTCDate())) edad--;
  return edad;
}

export function variablesDe(sol: EntradaScorecard, hoy: Date = new Date()): Variables {
  const ingreso = sol.ingresos.ingreso_mensual_usd;
  return {
    tipo: sol.ingresos.tipo,
    antiguedad: sol.ingresos.antiguedad_meses ?? 0,
    deuda_ing: (sol.deudas_mensuales_usd ?? 0) / ingreso,
    monto_ing: sol.monto_solicitado_usd / ingreso,
    meses_extracto: sol.extracto?.meses_cubiertos ?? 0,
    saldo_ing: sol.extracto ? sol.extracto.saldo_promedio_usd / ingreso : 0,
    edad: edadEn(sol.cedula.fecha_nacimiento, hoy),
  };
}

function indiceBin(valor: number | string, d: DefinicionBin): number {
  if (d.clase === "categorica") {
    const i = d.valores.indexOf(String(valor));
    return i < 0 ? d.valores.length - 1 : i;
  }
  let i = 0;
  for (const c of d.cortes) if (Number(valor) >= c) i++;
  return i;
}

export function evaluar(v: Variables, modelo: Modelo = MODELO): Puntuacion {
  const detalle: DetalleVariable[] = [];
  let z = modelo.intercepto;
  let score = 0;
  for (const nombre of modelo.variables) {
    const valor = v[nombre as keyof Variables];
    const bin = indiceBin(valor, modelo.bins[nombre]);
    const woe = modelo.woe[nombre][bin];
    const puntos = modelo.puntos[nombre][bin];
    z += modelo.coeficientes[nombre] * woe;
    score += puntos;
    detalle.push({ variable: nombre, valor, bin, puntos, woe });
  }
  const pd = 1 / (1 + Math.exp(-z));
  const bd = modelo.bandas;
  const grado = score >= bd.A ? "A" : score >= bd.B ? "B" : score >= bd.C ? "C" : score >= bd.D ? "D" : "E";
  return { score, pd, grado, detalle };
}
