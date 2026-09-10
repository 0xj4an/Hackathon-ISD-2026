/**
 * La cuota, antes de firmar. Es la pantalla 12 del mapa de diseño.
 *
 * Corre `preCalificar()` aquí mismo, sin señal: todo lo que necesita salió de
 * los documentos que ya se leyeron en este teléfono. Por eso puede poner un
 * número al frente aunque no haya red, que es justo lo que hoy no pasa.
 *
 * Dice ESTIMADO, y lo dice dos veces. El banco decide cuando la solicitud
 * llegue, y puede decidir distinto: él ve el historial de crédito en la APC y
 * este teléfono no tiene forma de consultarlo.
 *
 * Modo denso: la lista de condiciones se come al veredicto, así que el que
 * manda es la cifra de la cuota arriba y la banda negra del total abajo.
 */
import { preCalificar, type Solicitud } from "./core/credito/motor";
import {
  Pantalla, Encabezado, BarraVeredicto, Cifra, FilaRuta, BandaTotal, Franja, Boton, Etiqueta,
} from "./ui/componentes";
import { COLOR } from "./ui/tokens";

export default function PantallaCuota({
  solicitud, onFirmar, onVolver,
}: {
  solicitud: Solicitud;
  onFirmar: () => void;
  onVolver: () => void;
}) {
  const pre = preCalificar(solicitud);
  const techo = `B/. ${pre.capacidad.cuota_max.toFixed(2)}`;

  if (!pre.viable) {
    return (
      <Pantalla>
        <Encabezado meta="Volver" onVolver={onVolver} />
        <BarraVeredicto color={COLOR.prioritaria} texto="Todavía no" />
        <Etiqueta>Por qué</Etiqueta>
        <Franja color={COLOR.prioritaria} simbolo="alerta" texto={pre.motivo} />
        <FilaRuta simbolo="moneda" etiqueta="Puedes pagar hasta" valor={`${techo} al mes`} ultima />
        <Boton texto="Volver" onPress={onVolver} tono="borde" />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.tinta} texto="Tu cuota" derecha={`B/. ${pre.monto}`} />

      <Cifra
        valor={`B/. ${pre.cuota.toFixed(2)}`}
        unidad="al mes"
        nota={`durante ${pre.meses} meses`}
      />

      <Etiqueta>Las condiciones</Etiqueta>
      <FilaRuta simbolo="moneda" etiqueta="Monto" valor={`B/. ${pre.monto}`} />
      <FilaRuta simbolo="listo" etiqueta="Plazo" valor={`${pre.meses} meses`} />
      <FilaRuta simbolo="persona" etiqueta="Tasa anual" valor={`${pre.tasa_anual_pct}%`} />
      <FilaRuta simbolo="salud" etiqueta="Puedes pagar hasta" valor={`${techo} al mes`} ultima />

      <BandaTotal etiqueta="Pagas en total" valor={`B/. ${(pre.cuota * pre.meses).toFixed(2)}`} />

      <Franja
        color={COLOR.tinta}
        simbolo="sinSenal"
        titulo="Esto es un estimado"
        texto={
          "Lo calculó este teléfono con tus documentos, sin conexión. El banco decide " +
          "cuando reciba la solicitud y puede decidir distinto: él ve tu historial de " +
          "crédito y aquí no hay forma de consultarlo."
        }
      />

      <Boton
        texto="Firmar y enviar"
        onPress={onFirmar}
        etiqueta={`Firmar y enviar la solicitud por ${pre.monto} balboas`}
      />
    </Pantalla>
  );
}
