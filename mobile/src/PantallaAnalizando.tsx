/**
 * Pantalla de “analizando con X modelo” — señalética, para el video.
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";
import { animarPct, sleep } from "./envioVisual";

export default function PantallaAnalizando({
  titulo,
  modeloId,
  modeloLinea,
  chip,
  detalle,
  pie,
  ms = 3800,
  onListo,
}: {
  titulo: string;
  modeloId: string;
  modeloLinea: string;
  chip: string;
  detalle: string;
  pie: string;
  ms?: number;
  onListo?: () => void;
}) {
  const [pct, setPct] = useState(4);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      await animarPct(4, 96, ms, n => {
        if (vivo) setPct(n);
      }, () => vivo);
      if (!vivo) return;
      setPct(100);
      await sleep(350);
      if (vivo) onListo?.();
    })();
    return () => { vivo = false; };
  }, [ms, onListo]);

  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <Pantalla scroll={false}>
      <Encabezado />
      <View style={s.cuerpo}>
        <Text style={s.chip}>{chip}</Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{titulo}</Text>
        <Text style={s.modeloId}>{modeloId}</Text>
        <Text style={s.modeloLinea}>{modeloLinea}</Text>
        <Text style={s.detalle}>{detalle}</Text>

        <View
          style={s.barra}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: pctClamped }}
        >
          <View style={[s.barraLlena, { width: `${pctClamped}%` }]} />
        </View>
        <View style={s.barraTextos}>
          <Text style={s.barraPct}>{pctClamped}%</Text>
          <Text style={s.barraDe}>Inferencia en curso…</Text>
        </View>

        <Text style={s.pie}>{pie}</Text>
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
    gap: 10,
  },
  chip: { ...TIPO.etiqueta, color: COLOR.rutinaria, marginBottom: 6 },
  titulo: { ...DISPLAY, fontSize: 28, lineHeight: 30, letterSpacing: -1, color: COLOR.tinta },
  modeloId: {
    ...DISPLAY,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1.2,
    color: COLOR.tinta,
    marginTop: 8,
  },
  modeloLinea: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: COLOR.gris },
  detalle: { fontSize: 15, lineHeight: 21, color: COLOR.gris, marginTop: 6 },
  barra: { height: 14, backgroundColor: COLOR.hundido, marginTop: 22 },
  barraLlena: { height: 14, backgroundColor: COLOR.rutinaria },
  barraTextos: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 10 },
  barraPct: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta },
  barraDe: { flex: 1, fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  pie: { marginTop: 22, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },
});
