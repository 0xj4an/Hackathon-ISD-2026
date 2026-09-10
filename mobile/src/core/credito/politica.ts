// Los parametros del modelo de credito, cada uno con su fuente.
//
// Regla: ningun numero de politica vive en el codigo, todos viven aqui. Lo que
// no tiene cifra publicada que citar va marcado en `fuentes` como estimado,
// igual que hace `core/paquete.ts` con los precios sin fuente.

export type TipoIngreso = "asalariado" | "independiente" | "jubilado" | "otro";

export type ValoresPolitica = {
  deduccion_asalariado: number;
  deduccion_independiente: number;
  deduccion_jubilado: number;
  deduccion_otro: number;
  cbfa_per_capita: number;
  factor_no_alimentos: number;
  tope_dti: number;
  exposicion_x_ingreso: number;
  monto_min: number;
  monto_max: number;
  confianza_min: number;
  edad_min: number;
  edad_max: number;
  fondeo: number;
  lgd: number;
  opex_solicitud: number;
  capital_pct: number;
  retorno_exigido: number;
  margen: number;
  tasa_piso: number;
  tasa_techo: number;
  prima_plazo: number;
};

export type Politica = {
  version: string;
  valores: ValoresPolitica;
  plazos: number[];
  plazo_preferente: number;
  fuentes: Record<string, string>;
};

export const POLITICA: Politica = {
  version: "2026-09-10",
  plazos: [6, 12, 18, 24],
  plazo_preferente: 12,
  valores: {
    deduccion_asalariado: 0.11,
    deduccion_independiente: 0.05,
    deduccion_jubilado: 0,
    deduccion_otro: 0.05,
    cbfa_per_capita: 94.95,
    factor_no_alimentos: 1.6,
    tope_dti: 0.30,
    exposicion_x_ingreso: 3,
    monto_min: 25,
    monto_max: 5000,
    confianza_min: 0.5,
    edad_min: 18,
    edad_max: 75,
    fondeo: 0.045,
    lgd: 0.75,
    opex_solicitud: 6,
    capital_pct: 0.10,
    retorno_exigido: 0.15,
    margen: 0.02,
    tasa_piso: 0.095,
    tasa_techo: 0.24,
    prima_plazo: 0.005,
  },
  fuentes: {
    deduccion_asalariado: "CSS 9.75% mas seguro educativo 1.25% sobre el salario",
    deduccion_independiente: "Estimado. Provision de impuesto sobre la renta",
    deduccion_jubilado: "Las pensiones no cotizan a la CSS",
    deduccion_otro: "Estimado. Mismo criterio que independiente",
    cbfa_per_capita:
      "MEF, Canasta Basica Familiar de Alimentos, Resto Urbano del pais, marzo 2026: " +
      "B/. 341.81 para un hogar promedio de 3.6 miembros. 341.81 / 3.6 = 94.95",
    factor_no_alimentos:
      "Estimado. El MEF publica la canasta de alimentos; el gasto no alimentario " +
      "del hogar no tiene cifra mensual citable en la misma fuente",
    tope_dti: "Practica de mercado: regla 28/36, Fannie Mae 36% en suscripcion manual",
    exposicion_x_ingreso:
      "Ley 81 de 2009 de Panama: el limite de una tarjeta no puede pasar de tres " +
      "veces el ingreso mensual demostrado. Adaptado a prestamo personal",
    monto_min: "Politica del producto. Piso fijado en ADR-010",
    monto_max: "Politica del producto",
    confianza_min: "Politica. Debajo de esto la solicitud va a revision humana",
    edad_min: "Mayoria de edad",
    edad_max: "Politica. Edad al vencimiento del credito",
    fondeo: "Costo de depositos en la banca panamena, 2025 a 2026",
    lgd: "Perdida dado el incumplimiento en credito sin garantia",
    opex_solicitud: "Estimado. Originacion digital sin sucursal ni oficial en campo",
    capital_pct: "Ponderacion de capital para cartera de consumo",
    retorno_exigido: "Politica. Retorno sobre el capital asignado",
    margen: "Politica",
    tasa_piso:
      "Politica. Apenas encima del promedio de prestamos personales en Panama " +
      "(8.92%, SBP octubre 2025), porque ese promedio es de creditos con " +
      "descuento directo de planilla y este no lo tiene",
    tasa_techo:
      "Politica. Entre el promedio de tarjetas de credito (22.02%, SBP octubre " +
      "2025) y el maximo observado en el mercado panameno (27.12%)",
    prima_plazo: "Estimado. Recargo por plazo mayor al preferente",
  },
};

/** La deduccion de ley que aplica a cada tipo de ingreso. */
export function deduccionLey(tipo: TipoIngreso, pol: Politica = POLITICA): number {
  const v = pol.valores;
  if (tipo === "asalariado") return v.deduccion_asalariado;
  if (tipo === "independiente") return v.deduccion_independiente;
  if (tipo === "jubilado") return v.deduccion_jubilado;
  return v.deduccion_otro;
}
