/** Final feliz de la demo: simula el desembolso tras firmar. No mueve plata real. */
import type { Respuesta } from "./core/credito/motor";
import {
  Pantalla, Encabezado, Veredicto, Cifra, FilaRuta, Franja, Boton, Pie,
} from "./ui/componentes";
import { COLOR } from "./ui/tokens";

export default function PantallaDesembolso({
  respuesta, destino, onListo,
}: {
  respuesta: Respuesta;
  destino: string;
  onListo: () => void;
}) {
  const monto = respuesta.monto_aprobado_usd ?? 0;

  return (
    <Pantalla>
      <Encabezado />
      <Veredicto
        color={COLOR.rutinaria}
        simbolo="listo"
        palabra={"Desembol\nsado"}
        detalle={`B/. ${monto} ya están en camino a tu cuenta.`}
      />

      <Cifra
        valor={`B/. ${monto}`}
        unidad="desembolsados"
        nota="simulación de la demo"
      />

      <FilaRuta simbolo="moneda" etiqueta="Destino" valor={destino} />
      {respuesta.plazo_meses != null ? (
        <FilaRuta
          simbolo="calendario"
          etiqueta="Plazo"
          valor={`${respuesta.plazo_meses} meses`}
        />
      ) : null}
      {respuesta.cuota_mensual_usd != null ? (
        <FilaRuta
          simbolo="porcentaje"
          etiqueta="Cuota"
          valor={`B/. ${respuesta.cuota_mensual_usd.toFixed(2)}`}
          ultima
        />
      ) : (
        <FilaRuta simbolo="listo" etiqueta="Estado" valor="Aceptado" ultima />
      )}

      <Franja
        color={COLOR.tinta}
        simbolo="alerta"
        titulo="Demostración"
        texto="No hubo un traslado bancario real. Esta pantalla cierra el flujo de la demo."
      />

      <Boton texto="Listo" tono="rutinaria" onPress={onListo} />
      <Pie>Crédito de salud aceptado. Fin del camino en el teléfono.</Pie>
    </Pantalla>
  );
}
