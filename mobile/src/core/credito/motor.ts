// El motor de credito. Determinista, auditable, sin modelo de lenguaje.
//
// Dos entradas al mismo codigo:
//   preCalificar(sol)  corre en el telefono, sin senal, con lo que la persona
//                      carga encima. Devuelve un ESTIMADO y lo dice.
//   decidir(sol, ctx)  corre en el nodo del banco y anade lo que la persona no
//                      carga: bureau y costo de fondos. Esa es la que vale.
//
// El corte no es comercial, es de propiedad del dato.

import { POLITICA, type Politica } from "./politica.ts";
import { capacidadDePago, type Capacidad } from "./capacidad.ts";
import { variablesDe, evaluar, edadEn, type EntradaScorecard } from "./scorecard.ts";
import { estructurar } from "./estructura.ts";
import { factoresDe, type Factor } from "./explicacion.ts";
import { MODELO, type Modelo } from "./modelo.ts";
import type { Componentes } from "./precio.ts";

export type Solicitud = EntradaScorecard & {
  id?: string;
  cedula: { fecha_nacimiento: string; fecha_expiracion?: string; confianza?: number };
  ingresos: EntradaScorecard["ingresos"] & { confianza?: number };
  personas_a_cargo?: number;
};

export type Contexto = {
  /** Lo que el telefono no puede saber. En la demo lo simula el nodo. */
  bureau?: { peor_mora_dias: number };
};

export type PreCalificacion = {
  estimado: true;
  viable: boolean;
  monto: number;
  meses: number;
  tasa_anual_pct: number;
  cuota: number;
  capacidad: Capacidad;
  motivo: string;
};

export type Respuesta = {
  solicitud_id: string | undefined;
  decision: "aprobada" | "rechazada" | "revision";
  monto_aprobado_usd?: number;
  plazo_meses?: number;
  tasa_anual_pct?: number;
  cuota_mensual_usd?: number;
  grado?: "A" | "B" | "C" | "D" | "E";
  pd_pct?: number;
  tasa_componentes?: Componentes;
  factores: Factor[];
  politica_version: string;
  motivo: string;
  ts: string;
};

/** Reglas duras. Devuelve el motivo si algo la frena, o null si pasa. */
function elegibilidad(
  sol: Solicitud, hoy: Date, pol: Politica,
): { decision: "revision" | "rechazada"; motivo: string } | null {
  const v = pol.valores;
  const conf = Math.min(sol.cedula.confianza ?? 1, sol.ingresos.confianza ?? 1);
  if (conf < v.confianza_min) {
    return { decision: "revision", motivo: "documentos poco legibles; un agente los revisara" };
  }
  if (sol.cedula.fecha_expiracion && new Date(sol.cedula.fecha_expiracion) < hoy) {
    return { decision: "revision", motivo: "la cedula esta vencida; hay que renovarla o presentar otra" };
  }
  const edad = edadEn(sol.cedula.fecha_nacimiento, hoy);
  if (edad < v.edad_min || edad > v.edad_max) {
    return { decision: "rechazada", motivo: `la política cubre de ${v.edad_min} a ${v.edad_max} años` };
  }
  if (sol.monto_solicitado_usd < v.monto_min || sol.monto_solicitado_usd > v.monto_max) {
    return { decision: "rechazada", motivo: `el monto va de B/. ${v.monto_min} a B/. ${v.monto_max}` };
  }
  return null;
}

function nucleo(sol: Solicitud, hoy: Date, pol: Politica, modelo: Modelo, castigoPd: number) {
  const cap = capacidadDePago({
    ingreso_mensual_usd: sol.ingresos.ingreso_mensual_usd,
    tipo: sol.ingresos.tipo,
    deudas_mensuales_usd: sol.deudas_mensuales_usd ?? 0,
    personas_a_cargo: sol.personas_a_cargo ?? 0,
  }, pol);
  const vars = variablesDe(sol, hoy);
  const punt = evaluar(vars, modelo);
  const pd = Math.min(1, punt.pd + castigoPd);
  const est = estructurar(pd, sol.monto_solicitado_usd, cap, pol);
  return { cap, vars, punt, pd, est };
}

export function preCalificar(
  sol: Solicitud, hoy: Date = new Date(),
  pol: Politica = POLITICA, modelo: Modelo = MODELO,
): PreCalificacion {
  const freno = elegibilidad(sol, hoy, pol);
  const { cap, est } = nucleo(sol, hoy, pol, modelo, 0);
  if (freno || !est) {
    return {
      estimado: true, viable: false, monto: 0, meses: 0, tasa_anual_pct: 0, cuota: 0, capacidad: cap,
      motivo: freno
        ? freno.motivo
        : `con tus ingresos la cuota maxima es B/. ${cap.cuota_max.toFixed(2)} al mes`,
    };
  }
  return {
    estimado: true, viable: true, monto: est.monto, meses: est.meses,
    tasa_anual_pct: est.tasa_anual_pct, cuota: est.cuota, capacidad: cap,
    motivo: "estimado con tus documentos; el banco lo confirma cuando llegue la solicitud",
  };
}

export function decidir(
  sol: Solicitud, ctx: Contexto = {}, hoy: Date = new Date(),
  pol: Politica = POLITICA, modelo: Modelo = MODELO,
): Respuesta {
  const base = {
    solicitud_id: sol.id,
    factores: [] as Factor[],
    politica_version: pol.version,
    ts: hoy.toISOString(),
  };

  const freno = elegibilidad(sol, hoy, pol);
  if (freno) return { ...base, decision: freno.decision, motivo: freno.motivo };

  // Acuerdo 4-2013, articulo 21: hay presuncion de deterioro de la capacidad de
  // pago cuando empeora el comportamiento de pago de la persona en el mercado
  // financiero. Mas de 60 dias es mencion especial o peor (articulo 18).
  const mora = ctx.bureau?.peor_mora_dias ?? 0;
  if (mora > 60) {
    return {
      ...base, decision: "rechazada",
      motivo: `el comportamiento de pago en el sistema financiero muestra ${mora} días de atraso`,
    };
  }
  const castigo = mora > 30 ? 0.05 : 0;

  const { cap, vars, punt, pd, est } = nucleo(sol, hoy, pol, modelo, castigo);
  const factores = factoresDe(punt, vars, sol, modelo);

  if (!est) {
    return {
      ...base, decision: "rechazada", factores,
      motivo: `con tus ingresos la cuota maxima es B/. ${cap.cuota_max.toFixed(2)} al mes, ` +
              `y el monto mínimo de B/. ${pol.valores.monto_min} no cabe`,
    };
  }

  return {
    ...base,
    decision: "aprobada",
    monto_aprobado_usd: est.monto,
    plazo_meses: est.meses,
    tasa_anual_pct: est.tasa_anual_pct,
    cuota_mensual_usd: est.cuota,
    grado: punt.grado,
    pd_pct: Math.round(pd * 1000) / 10,
    tasa_componentes: est.componentes,
    factores,
    motivo: est.recortado
      ? `monto ajustado a tu capacidad de pago: la cuota maxima es B/. ${cap.cuota_max.toFixed(2)}`
      : "aprobado por capacidad de pago",
  };
}
