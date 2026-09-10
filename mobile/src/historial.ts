/**
 * Cifras del historial cargado. Las pantallas nombran lo que hay en el JSON;
 * no escriben un 65 ni un “8 meses” a mano.
 */
import type { Medicion, TipoMedicion } from "./core/reglas";

const MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

export const NOMBRE_VARIABLE: Record<TipoMedicion, string> = {
  glucosa_ayunas: "glucosa en ayunas",
  presion_sist: "presión alta",
  presion_diast: "presión baja",
  pulso_reposo: "pulso en reposo",
  saturacion_o2: "oxígeno en la sangre",
  temperatura: "temperatura",
  frecuencia_respiratoria: "respiración",
  peso: "peso",
  estatura: "estatura",
};

export type VariableLeida = { tipo: TipoMedicion; lecturas: number };

export type ResumenHistorial = {
  mediciones: number;
  variables: number;
  meses: number;
  porVariable: VariableLeida[];
  /** "enero, febrero, marzo y abril" */
  mesesLista: string[];
  /** "enero a septiembre de 2026" */
  rango: string;
  anio: string;
};

function diaDe(m: Medicion) {
  const d = m.ts.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export function yLista(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function lecturasPorVariable(mediciones: Medicion[]): VariableLeida[] {
  const cuenta = new Map<TipoMedicion, number>();
  for (const m of mediciones) cuenta.set(m.tipo, (cuenta.get(m.tipo) ?? 0) + 1);
  return [...cuenta.entries()]
    .map(([tipo, lecturas]) => ({ tipo, lecturas }))
    .sort((a, b) => b.lecturas - a.lecturas || a.tipo.localeCompare(b.tipo));
}

function mesesDe(dias: string[]) {
  const keys = [...new Set(dias.map(d => d.slice(0, 7)))].sort();
  const anios = new Set(keys.map(k => k.slice(0, 4)));
  const mesesLista = keys.map(k => {
    const nombre = MES[Number(k.slice(5, 7)) - 1];
    return anios.size === 1 ? nombre : `${nombre} de ${k.slice(0, 4)}`;
  });
  const anio = anios.size === 1 ? [...anios][0] ?? "" : [...anios].sort().join("–");
  const rango = (() => {
    if (keys.length === 0) return "";
    if (anios.size === 1) {
      if (mesesLista.length === 1) return `${mesesLista[0]} de ${anio}`;
      return `${mesesLista[0]} a ${mesesLista[mesesLista.length - 1]} de ${anio}`;
    }
    return `${mesesLista[0]} a ${mesesLista[mesesLista.length - 1]}`;
  })();
  return { mesesLista, meses: keys.length, rango, anio };
}

export function resumenHistorial(mediciones: Medicion[]): ResumenHistorial {
  const porVariable = lecturasPorVariable(mediciones);
  const dias = mediciones.map(diaDe).filter((d): d is string => d != null).sort();
  return {
    mediciones: mediciones.length,
    variables: porVariable.length,
    porVariable,
    ...mesesDe(dias),
  };
}

export function fraseLecturas(r: ResumenHistorial) {
  const med = r.mediciones === 1 ? "lectura" : "lecturas";
  if (r.porVariable.length === 0) return `0 ${med}`;
  const top = r.porVariable[0];
  const nombre = NOMBRE_VARIABLE[top.tipo] ?? top.tipo;
  return `${r.mediciones} ${med} en total. Lo que más se midió: ${nombre} (${top.lecturas}).`;
}

export function fraseMeses(r: ResumenHistorial) {
  if (r.mesesLista.length === 0) return "Sin fechas";
  const lista = yLista(r.mesesLista);
  const t = lista[0].toUpperCase() + lista.slice(1);
  return r.anio.includes("–") ? t : `${t} de ${r.anio}`;
}
