/**
 * Respuesta del banco. Mock 6 de Señalética.
 *
 * La decisión la tomó el banco remoto. Este teléfono solo la muestra.
 * Si aprueba, sigue a la firma con trazo y al desembolso simulado.
 */
import {
  Pantalla, Encabezado, Veredicto, Cifra, FilaRuta, Franja, Boton, Pie,
} from "./ui/componentes";
import { COLOR } from "./ui/tokens";
import type { Respuesta } from "./core/credito/motor";

export default function PantallaBanco({
  respuesta, onContinuar, onVolver,
}: {
  respuesta: Respuesta;
  onContinuar: () => void;
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
          nota="el año completo, según el banco"
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
            simbolo="calendario"
            etiqueta="Durante"
            valor={`${respuesta.plazo_meses} meses`}
          />
          <FilaRuta
            simbolo="porcentaje"
            etiqueta="Tasa anual"
            valor={`${respuesta.tasa_anual_pct}%`}
            ultima
          />
        </>
      ) : null}

      <Franja
        color={COLOR.tinta}
        simbolo="alerta"
        titulo="Demostración"
        texto="El banco vio nombre, cédula, ingreso y monto. Nunca el motivo de salud. El scorecard es sintético: no es la política de un banco real."
      />

      {ok ? (
        <>
          <Boton
            texto="Firmar para aceptar"
            tono="rutinaria"
            onPress={onContinuar}
            etiqueta="Continuar a firmar con el dedo"
          />
          <Boton texto="Ahora no" tono="borde" onPress={onVolver} />
          <Pie>El siguiente paso es tu trazo. No es una firma electrónica legal.</Pie>
        </>
      ) : (
        <>
          <Boton texto="Volver" tono="borde" onPress={onVolver} />
          <Pie>Decisión del banco. Cartera sintética, para demostrar el flujo.</Pie>
        </>
      )}
    </Pantalla>
  );
}
