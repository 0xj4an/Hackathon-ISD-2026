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
import { Share } from "react-native";
import { preCalificar, type Solicitud } from "./core/credito/motor";
import { sinWifiDemo } from "./modo";
import {
  Pantalla, Encabezado, BarraVeredicto, Cifra, FilaRuta, BandaTotal, Franja, Boton, Etiqueta,
  DetalleTecnico,
} from "./ui/componentes";
import { COLOR } from "./ui/tokens";

export default function PantallaCuota({
  solicitud, onFirmar, onVolver, enviando, pendiente, aviso, tecnico,
}: {
  solicitud: Solicitud;
  onFirmar: () => void;
  onVolver: () => void;
  enviando?: boolean;
  pendiente?: boolean;
  aviso?: string;
  /** Log de envío (modo, URLs, HTTP, errores) para pegar al depurar. */
  tecnico?: string;
}) {
  const pre = preCalificar(solicitud);
  const techo = `B/. ${pre.capacidad.cuota_max.toFixed(2)}`;
  const offline = sinWifiDemo();

  const enviarDetalle = () => {
    if (!tecnico) return;
    void Share.share({ message: tecnico, title: "Detalle envío Ina Igar" }).catch(() => {});
  };

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

  const franjaIdle = offline
    ? {
        titulo: "Cálculo inicial en el teléfono",
        texto:
          "Esta cuota la estimó este teléfono con tus documentos (reglas del crédito, " +
          "no el modelo QVAC). Al firmar se envía al banco por el nodo del pueblo para " +
          "estudio; el banco puede aprobar distinto. Si no hay nodo, queda pendiente aquí.",
      }
    : {
        titulo: "Cálculo inicial en el teléfono",
        texto:
          "Esta cuota la estimó este teléfono con tus documentos (reglas del crédito, " +
          "no el modelo QVAC). Al firmar se envía al banco para estudio; él confirma o " +
          "cambia la decisión. Si el banco no responde, se intenta el nodo del pueblo.",
      };

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.tinta} texto="Preaprobado" derecha={`B/. ${pre.monto}`} />

      <Cifra
        valor={`B/. ${pre.cuota.toFixed(2)}`}
        unidad="al mes · estimado"
        nota={`durante ${pre.meses} meses · pendiente de estudio en el banco`}
      />

      <Etiqueta>Las condiciones</Etiqueta>
      <FilaRuta simbolo="moneda" etiqueta="Monto" valor={`B/. ${pre.monto}`} />
      <FilaRuta simbolo="calendario" etiqueta="Plazo" valor={`${pre.meses} meses`} />
      <FilaRuta simbolo="porcentaje" etiqueta="Tasa anual" valor={`${pre.tasa_anual_pct}%`} />
      <FilaRuta simbolo="moneda" etiqueta="Puedes pagar hasta" valor={`${techo} al mes`} ultima />

      <BandaTotal etiqueta="Pagas en total (estimado)" valor={`B/. ${(pre.cuota * pre.meses).toFixed(2)}`} />

      <Franja
        color={COLOR.tinta}
        simbolo="sinSenal"
        titulo={pendiente ? "Queda pendiente" : franjaIdle.titulo}
        texto={aviso ?? franjaIdle.texto}
      />

      {tecnico ? (
        <DetalleTecnico texto={tecnico} onEnviar={enviarDetalle} />
      ) : null}

      <Boton
        texto={enviando ? "Enviando…" : pendiente ? "Reintentar" : "Firmar y enviar al banco"}
        onPress={enviando ? () => {} : onFirmar}
        etiqueta={`Firmar y enviar la solicitud por ${pre.monto} balboas para estudio del banco`}
      />
    </Pantalla>
  );
}
