/**
 * Respuesta del banco. Mock 6 de Señalética.
 *
 * Aquí corre el mismo `decidir()` que el nodo: no hay un segundo motor. El
 * modelo es de juguete y la pantalla lo dice.
 */
import {
  Pantalla, Encabezado, Veredicto, Cifra, FilaRuta, Franja, Boton, Pie,
} from "./ui/componentes";
import { COLOR } from "./ui/tokens";
import type { Respuesta } from "./core/credito/motor";

export default function PantallaBanco({
  respuesta, onAceptar, onVolver,
}: {
  respuesta: Respuesta;
  onAceptar: () => void;
  onVolver: () => void;
}) {
  const ok = respuesta.decision === "aprobada";
  const color = ok ? COLOR.rutinaria
    : respuesta.decision === "revision" ? COLOR.prioritaria
    : COLOR.inmediata;
  const palabra = ok ? "Aprobado"
    : respuesta.decision === "revision" ? "Revisión"
    : "No esta vez";

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <Veredicto
        color={color}
        simbolo={ok ? "listo" : "alerta"}
        palabra={palabra}
        detalle={respuesta.motivo}
      />

      {ok && respuesta.monto_aprobado_usd != null ? (
        <Cifra
          valor={`B/. ${respuesta.monto_aprobado_usd}`}
          unidad="aprobados"
          nota="el año completo, según este nodo"
        />
      ) : null}

      {ok ? (
        <>
          <FilaRuta
            simbolo="moneda"
            etiqueta="Pagas al mes"
            valor={`B/. ${respuesta.cuota_mensual_usd?.toFixed(2)}`}
          />
          <FilaRuta
            simbolo="listo"
            etiqueta="Durante"
            valor={`${respuesta.plazo_meses} meses`}
          />
          <FilaRuta
            simbolo="persona"
            etiqueta="Tasa anual"
            valor={`${respuesta.tasa_anual_pct}%`}
            ultima
          />
        </>
      ) : null}

      <Franja
        color={COLOR.tinta}
        simbolo="alerta"
        titulo="Modelo de juguete"
        texto="El banco vio nombre, cédula, ingreso y monto. Nunca el motivo de salud. Esta decisión no representa ninguna política real."
      />

      {ok ? (
        <Boton texto="Aceptar y firmar" tono="rutinaria" onPress={onAceptar} />
      ) : null}
      <Boton texto="Ahora no" tono="borde" onPress={onVolver} />
      <Pie>
        El modelo de crédito de este nodo es de juguete, hecho para demostrar el flujo.
      </Pie>
    </Pantalla>
  );
}
