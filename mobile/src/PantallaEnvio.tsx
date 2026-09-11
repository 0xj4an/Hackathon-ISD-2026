/**
 * Pantalla de transporte del crédito: barras y fases para el video.
 *
 * Offline: sin wifi → buscar nodo → OK → subir → recibir.
 * WiFi: subir al banco → recibir respuesta (mismo lenguaje visual).
 */
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado, Boton } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";

export type FaseEnvioVisual =
  | "aviso"
  | "buscando"
  | "encontrado"
  | "conectando"
  | "subiendo"
  | "recibiendo";

export type ViaEnvioVisual = "banco" | "pueblo";

const COPY: Record<
  FaseEnvioVisual,
  (via: ViaEnvioVisual, host?: string) => { titulo: string; detalle: string; pie: string }
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
  subiendo: (via, host) => ({
    titulo: via === "banco" ? "Enviando al banco…" : "Enviando por el nodo…",
    detalle:
      via === "banco"
        ? "Subiendo tu solicitud al banco por wifi."
        : host
          ? `Subiendo la solicitud a través de ${host}.`
          : "Subiendo la solicitud a través del nodo del pueblo.",
    pie: via === "banco" ? "Camino directo al banco." : "El nodo la guarda y la lleva al banco.",
  }),
  recibiendo: (via, host) => ({
    titulo: via === "banco" ? "Recibiendo del banco…" : "Recibiendo del nodo…",
    detalle:
      via === "banco"
        ? "Esperando la decisión del banco."
        : host
          ? `Esperando respuesta a través de ${host}.`
          : "Esperando respuesta a través del nodo.",
    pie: "Cuando llegue la decisión, pasamos a verla.",
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
  /** Solo en fase `encontrado`. */
  onContinuar?: () => void;
}) {
  const c = COPY[fase](via, nodoHost);
  const muestraBarra = fase !== "encontrado" && fase !== "aviso";
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <Pantalla scroll={false}>
      <Encabezado />
      <View style={s.cuerpo}>
        <Text style={s.meta} accessibilityLiveRegion="polite">
          {via === "banco" ? "Camino wifi" : "Camino nodo local"}
        </Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{c.titulo}</Text>
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
                    : fase === "subiendo"
                      ? "Subiendo solicitud…"
                      : "Bajando respuesta…"}
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
  detalle: { fontSize: 15, lineHeight: 21, color: COLOR.gris },
  barra: { height: 14, backgroundColor: COLOR.hundido, marginTop: 18 },
  barraLlena: { height: 14, backgroundColor: COLOR.rutinaria },
  barraTextos: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 10 },
  barraPct: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta },
  barraDe: { flex: 1, fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  acciones: { marginTop: 22 },
  pie: { marginTop: 22, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },
});
