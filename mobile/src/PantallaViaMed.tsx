/**
 * Fases de inferencia para el video, como el envío al banco:
 * conectar → mandar/delegar → esperar → recibir. Cada una dura lo suficiente
 * para grabarse; la barra no llega a 100 hasta que MedPsy termina de verdad.
 */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";
import { MODELO_TELEFONO } from "./modelosMarca";
import { saltarMedPsyLocal } from "./modo";
import { useViaMed } from "./demoLog";
import { ENVIO_MS, animarPct, sleep } from "./envioVisual";

type Canal = "p2p" | "pueblo" | "local";
type FaseVia = "conectando" | "delegando" | "esperando" | "recibiendo";

const COPY: Record<FaseVia, Record<Canal, {
  titulo: string; detalle: string; pie: string; barraDe: string; meta: string;
}>> = {
  conectando: {
    p2p: {
      meta: "Nodo del pueblo · par P2P",
      titulo: "Conectando…",
      detalle: "Abriendo el par P2P. El teléfono busca la laptop del pueblo.",
      pie: "Misma WiFi. Sin nube.",
      barraDe: "Handshake con el par…",
    },
    pueblo: {
      meta: "Nodo del pueblo · HTTP",
      titulo: "Conectando…",
      detalle: "Abriendo canal con el pueblo por HTTP.",
      pie: "Solo la WiFi del corregimiento.",
      barraDe: "Abriendo el canal…",
    },
    local: {
      meta: "Este teléfono",
      titulo: "Conectando…",
      detalle: "Cargando MedPsy en este teléfono.",
      pie: "Nada sale a internet.",
      barraDe: "Cargando el modelo…",
    },
  },
  delegando: {
    p2p: {
      meta: "Nodo del pueblo · par P2P",
      titulo: "Delegando…",
      detalle: "El teléfono manda el pedido de inferencia al par. La foto no sale.",
      pie: "QVAC delegate. El modelo corre en la laptop.",
      barraDe: "Enviando el request…",
    },
    pueblo: {
      meta: "Nodo del pueblo · HTTP",
      titulo: "Mandando el request…",
      detalle: "POST /inferir al pueblo. Solo texto, sin foto ni cédula.",
      pie: "Si el par no entra, este es el plan B.",
      barraDe: "Subiendo el pedido…",
    },
    local: {
      meta: "Este teléfono",
      titulo: "Mandando el pedido…",
      detalle: "MedPsy recibe el texto aquí mismo.",
      pie: "El umbral lo deciden las reglas, no el modelo.",
      barraDe: "Pasando el texto a MedPsy…",
    },
  },
  esperando: {
    p2p: {
      meta: "Nodo del pueblo · par P2P",
      titulo: "Esperando inferencia…",
      detalle: "MedPsy está escribiendo en la laptop del pueblo.",
      pie: "La foto no salió. Solo fue el pedido.",
      barraDe: "Inferencia en el par…",
    },
    pueblo: {
      meta: "Nodo del pueblo · HTTP",
      titulo: "Esperando inferencia…",
      detalle: "El pueblo está corriendo MedPsy. Esperamos la respuesta.",
      pie: "Sin foto y sin cédula.",
      barraDe: "Inferencia en el pueblo…",
    },
    local: {
      meta: "Este teléfono",
      titulo: "Esperando inferencia…",
      detalle: "MedPsy está redactando en este teléfono.",
      pie: "Nada sale.",
      barraDe: "Inferencia en el teléfono…",
    },
  },
  recibiendo: {
    p2p: {
      meta: "Nodo del pueblo · par P2P",
      titulo: "Recibiendo…",
      detalle: "Bajando la respuesta del par. El modelo no corrió en la nube.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Llegó la inferencia…",
    },
    pueblo: {
      meta: "Nodo del pueblo · HTTP",
      titulo: "Recibiendo…",
      detalle: "Bajando la respuesta del pueblo.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Llegó la inferencia…",
    },
    local: {
      meta: "Este teléfono",
      titulo: "Recibiendo…",
      detalle: "MedPsy terminó. Bajando el texto.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Llegó la inferencia…",
    },
  },
};

function canalDe(via: ReturnType<typeof useViaMed>["via"]): Canal {
  if (via === "pueblo") return "pueblo";
  if (via === "local") return "local";
  if (via === "p2p") return "p2p";
  return saltarMedPsyLocal() ? "p2p" : "local";
}

export default function PantallaViaMed({
  onSalir,
  extra,
  activo = true,
  onListo,
}: {
  onSalir?: () => void;
  extra?: string;
  activo?: boolean;
  onListo?: () => void;
}) {
  const via = useViaMed();
  const canal = canalDe(via.via);
  const [fase, setFase] = useState<FaseVia>("conectando");
  const [pct, setPct] = useState(4);
  const activoRef = useRef(activo);
  const pctRef = useRef(4);
  const onListoRef = useRef(onListo);
  activoRef.current = activo;
  onListoRef.current = onListo;

  useEffect(() => {
    let vivo = true;
    const pintar = (n: number) => {
      pctRef.current = n;
      if (vivo) setPct(n);
    };
    void (async () => {
      setFase("conectando");
      await animarPct(4, 24, ENVIO_MS.viaConectando, pintar, () => vivo);
      if (!vivo) return;

      setFase("delegando");
      await animarPct(pctRef.current, 48, ENVIO_MS.viaDelegando, pintar, () => vivo);
      if (!vivo) return;

      setFase("esperando");
      await animarPct(pctRef.current, 70, ENVIO_MS.viaEsperandoMin, pintar, () => vivo);
      while (vivo && activoRef.current) {
        const cur = pctRef.current;
        if (cur < 90) {
          await animarPct(cur, Math.min(90, cur + 4), 1400, pintar, () => vivo && activoRef.current);
        } else {
          await sleep(400);
        }
      }
      if (!vivo) return;

      setFase("recibiendo");
      await animarPct(pctRef.current, 100, ENVIO_MS.viaRecibiendo, pintar, () => vivo);
      await sleep(ENVIO_MS.cierre);
      if (vivo) onListoRef.current?.();
    })();
    return () => { vivo = false; };
  }, []);

  const c = COPY[fase][canal];
  const detalle = fase === "conectando" && extra ? extra : c.detalle;
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));
  const colorBarra = canal === "p2p" ? COLOR.rutinaria
    : canal === "pueblo" ? COLOR.prioritaria
      : COLOR.tinta;

  return (
    <Pantalla scroll={false}>
      <Encabezado meta="Salir" onVolver={onSalir} />
      <View style={s.cuerpo}>
        <Text style={s.meta} accessibilityLiveRegion="polite">{c.meta}</Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{c.titulo}</Text>
        <Text style={s.modelo}>{MODELO_TELEFONO.id}</Text>
        <Text style={s.linea}>{MODELO_TELEFONO.linea}</Text>
        <Text style={s.detalle}>{detalle}</Text>

        <View
          style={s.barra}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: pctClamped }}
        >
          <View style={[s.barraLlena, { width: `${pctClamped}%`, backgroundColor: colorBarra }]} />
        </View>
        <View style={s.barraTextos}>
          <Text style={s.barraPct}>{pctClamped}%</Text>
          <Text style={s.barraDe}>{c.barraDe}</Text>
        </View>

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
    gap: 8,
  },
  meta: { ...TIPO.etiqueta, color: COLOR.gris, marginBottom: 4 },
  titulo: { ...DISPLAY, fontSize: 28, lineHeight: 30, letterSpacing: -1, color: COLOR.tinta },
  modelo: {
    ...DISPLAY,
    fontSize: 18,
    letterSpacing: 1.4,
    color: COLOR.tinta,
    marginTop: 4,
  },
  linea: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: COLOR.gris },
  detalle: { fontSize: 15, lineHeight: 21, color: COLOR.gris, marginTop: 4 },
  barra: { height: 14, backgroundColor: COLOR.hundido, marginTop: 22 },
  barraLlena: { height: 14 },
  barraTextos: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 10 },
  barraPct: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta },
  barraDe: { flex: 1, fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  pie: { marginTop: 22, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },
});
