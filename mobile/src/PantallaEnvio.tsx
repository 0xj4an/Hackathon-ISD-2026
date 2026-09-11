/**
 * Pantalla de transporte del crédito: barras y fases para el video.
 *
 * Offline: sin wifi → buscar nodo → OK → estudio ISTMO-RISK → subir → recibir.
 * WiFi: estudio ISTMO-RISK → subir al banco → recibir.
 */
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado, Boton } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";
import { MODELO_BANCO } from "./modelosMarca";

export type FaseEnvioVisual =
  | "aviso"
  | "buscando"
  | "encontrado"
  | "conectando"
  | "estudiando"
  | "subiendo"
  | "recibiendo";

export type ViaEnvioVisual = "banco" | "pueblo";

const COPY: Record<
  FaseEnvioVisual,
  (via: ViaEnvioVisual, host?: string) => { titulo: string; detalle: string; pie: string; meta?: string }
> = {
  aviso: () => ({
    titulo: "Sin wifi al banco",
    detalle:
      "En este modo no hay internet hacia el banco. Voy a buscar un nodo local en tu WiFi del pueblo e intentar el envío por ahí.",
    pie: "El banco remoto queda fuera de alcance. El pueblo hace de puente.",
  }),
  buscando: () => ({
    titulo: "Buscando nodo local…",
    detalle: "Sondeo la red local por el corregimiento (puerto 8788).",
    pie: "Nada de esto usa internet. Solo la WiFi del pueblo.",
  }),
  encontrado: (_via, host) => ({
    titulo: "Encontré un nodo",
    detalle: host
      ? `Es ${host}. Voy a enviar tu solicitud a través de ese nodo del pueblo.`
      : "Hay un nodo del pueblo en esta red. Voy a enviar tu solicitud por ahí.",
    pie: "Toca Continuar para conectar y mandar la solicitud.",
  }),
  conectando: (_via, host) => ({
    titulo: "Conectando…",
    detalle: host ? `Abriendo canal con ${host}.` : "Abriendo canal con el nodo del pueblo.",
    pie: "Un momento.",
  }),
  estudiando: () => ({
    titulo: "Estudio en el banco",
    detalle: `${MODELO_BANCO.frase} va a puntuar tu solicitud: capacidad de pago, política y bureau simulado. No es MedPsy: es el motor de riesgo del banco.`,
    pie: "El preaprobado del teléfono fue un cálculo inicial. Aquí se decide de verdad.",
    meta: MODELO_BANCO.chip,
  }),
  subiendo: (via, host) => ({
    titulo: via === "banco" ? "Enviando a ISTMO-RISK…" : "Enviando por el nodo…",
    detalle:
      via === "banco"
        ? `Subiendo la solicitud para que ${MODELO_BANCO.id} la estudie en el banco.`
        : host
          ? `Subiendo vía ${host}. En el banco correrá ${MODELO_BANCO.frase}.`
          : `Subiendo vía el pueblo. En el banco correrá ${MODELO_BANCO.frase}.`,
    pie: via === "banco"
      ? `${MODELO_BANCO.linea} · decisión remota.`
      : "El nodo la guarda y la lleva al motor del banco.",
  }),
  recibiendo: (via, host) => ({
    titulo: via === "banco" ? "Respuesta de ISTMO-RISK…" : "Recibiendo del nodo…",
    detalle:
      via === "banco"
        ? `${MODELO_BANCO.id} ya estudió el expediente. Bajando la decisión.`
        : host
          ? `Esperando la decisión del banco a través de ${host}.`
          : "Esperando la decisión del banco a través del nodo.",
    pie: "Cuando llegue, pasamos a verla.",
  }),
};

export default function PantallaEnvio({
  fase,
  via,
  nodoHost,
  pct,
  onContinuar,
}: {
  fase: FaseEnvioVisual;
  via: ViaEnvioVisual;
  nodoHost?: string;
  pct: number;
  onContinuar?: () => void;
}) {
  const c = COPY[fase](via, nodoHost);
  const muestraBarra = fase !== "encontrado" && fase !== "aviso";
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));
  const meta =
    c.meta
    ?? (via === "banco" ? "Camino wifi · banco" : "Camino nodo local");
  const muestraModelo = fase === "estudiando" || fase === "subiendo" || fase === "recibiendo";

  return (
    <Pantalla scroll={false}>
      <Encabezado />
      <View style={s.cuerpo}>
        <Text style={s.meta} accessibilityLiveRegion="polite">{meta}</Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{c.titulo}</Text>
        {muestraModelo ? <Text style={s.modeloTag}>{MODELO_BANCO.id}</Text> : null}
        <Text style={s.detalle}>{c.detalle}</Text>

        {muestraBarra ? (
          <>
            <View
              style={s.barra}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: pctClamped }}
            >
              <View style={[s.barraLlena, { width: `${pctClamped}%` }]} />
            </View>
            <View style={s.barraTextos}>
              <Text style={s.barraPct}>{pctClamped}%</Text>
              <Text style={s.barraDe}>
                {fase === "buscando"
                  ? "Escaneando la red…"
                  : fase === "conectando"
                    ? "Handshake…"
                    : fase === "estudiando"
                      ? `${MODELO_BANCO.id} preparando estudio…`
                      : fase === "subiendo"
                        ? "Subiendo expediente…"
                        : "Bajando decisión…"}
              </Text>
            </View>
          </>
        ) : null}

        {fase === "encontrado" && onContinuar ? (
          <View style={s.acciones}>
            <Boton
              texto="Continuar"
              onPress={onContinuar}
              etiqueta="Continuar y enviar la solicitud por el nodo"
            />
          </View>
        ) : null}

        <Text style={s.pie}>{c.pie}</Text>
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cuerpo: {
    flex: 1,
    paddingHorizontal: ESPACIO.borde,
    justifyContent: "center",
    paddingBottom: 28,
    gap: 12,
  },
  meta: { ...TIPO.etiqueta, color: COLOR.gris, marginBottom: 4 },
  titulo: { ...DISPLAY, fontSize: 28, lineHeight: 30, letterSpacing: -1, color: COLOR.tinta },
  modeloTag: {
    ...DISPLAY,
    fontSize: 18,
    letterSpacing: 1.4,
    color: COLOR.rutinaria,
    marginTop: 2,
  },
  detalle: { fontSize: 15, lineHeight: 21, color: COLOR.gris },
  barra: { height: 14, backgroundColor: COLOR.hundido, marginTop: 18 },
  barraLlena: { height: 14, backgroundColor: COLOR.rutinaria },
  barraTextos: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 10 },
  barraPct: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta },
  barraDe: { flex: 1, fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  acciones: { marginTop: 22 },
  pie: { marginTop: 22, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },
});
