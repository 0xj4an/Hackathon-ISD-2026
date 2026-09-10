/**
 * Lo que queda de los documentos una vez leídos y borradas las copias.
 * Es lo que viaja entre captura, revisión y el motor de crédito.
 */
import type { Cedula, Ingresos, Extracto } from "./core/schemas";
import type { Solicitud } from "./core/credito/motor";

export type LecturaCredito = {
  cedula: Cedula;
  ingresos: Ingresos;
  extracto?: Extracto;
  fotosBorradas: number;
};

export function solicitudDeLectura(monto: number, lectura: LecturaCredito): Solicitud {
  return {
    id: crypto.randomUUID(),
    monto_solicitado_usd: monto,
    deudas_mensuales_usd: 0,
    personas_a_cargo: 0,
    cedula: {
      fecha_nacimiento: lectura.cedula.fecha_nacimiento,
      fecha_expiracion: lectura.cedula.fecha_expiracion,
      confianza: lectura.cedula.confianza,
    },
    ingresos: {
      ingreso_mensual_usd: lectura.ingresos.ingreso_mensual_usd,
      tipo: lectura.ingresos.tipo,
      antiguedad_meses: lectura.ingresos.antiguedad_meses,
      confianza: lectura.ingresos.confianza,
    },
    extracto: lectura.extracto
      ? {
          saldo_promedio_usd: lectura.extracto.saldo_promedio_usd,
          meses_cubiertos: lectura.extracto.meses_cubiertos,
        }
      : undefined,
  };
}
