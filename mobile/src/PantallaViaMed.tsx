/**
 * Fases de inferencia para el video.
 *
 * Dos caminos, según la ruta elegida al entrar:
 * - local-wifi / local-offline → MedPsy en este teléfono.
 * - nodo-offline → se simula un teléfono sin modelo: inferencia en el nodo.
 */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";
import { MODELO_TELEFONO } from "./modelosMarca";
import { modo, saltarMedPsyLocal } from "./modo";
import { useViaMed, type ViaMed } from "./demoLog";
import { ENVIO_MS, animarPct, sleep } from "./envioVisual";

type Canal = "p2p" | "pueblo" | "local";
type FaseVia = "conectando" | "delegando" | "esperando" | "recibiendo";

const COPY: Record<FaseVia, Record<Canal, {
  titulo: string; detalle: string; pie: string; barraDe: string;
}>> = {
  conectando: {
    local: {
      titulo: "En este teléfono",
      detalle: "Cargando MedPsy en este teléfono.",
      pie: "La inferencia no sale al pueblo ni a la nube.",
      barraDe: "Cargando MedPsy…",
    },
    p2p: {
      titulo: "Conectando al nodo",
      detalle: "Este teléfono no tiene capacidad para correr el modelo. Delegando al nodo por P2P.",
      pie: "La inferencia corre en la laptop. La foto no sale.",
      barraDe: "Handshake con el par…",
    },
    pueblo: {
      titulo: "Conectando al nodo",
      detalle: "Este teléfono no tiene capacidad para correr el modelo. Delegando al nodo por HTTP.",
      pie: "La inferencia corre en el pueblo. La foto no sale.",
      barraDe: "Abriendo el canal…",
    },
  },
  delegando: {
    local: {
      titulo: "Pedido local",
      detalle: "MedPsy recibe el texto en este teléfono. La foto no se mueve.",
      pie: "El umbral lo deciden las reglas, no el modelo.",
      barraDe: "Pasando el texto a MedPsy…",
    },
    p2p: {
      titulo: "Delegando…",
      detalle: "Mandando el pedido de inferencia al par. La foto no sale.",
      pie: "QVAC delegate. El modelo corre en la laptop.",
      barraDe: "Enviando el request…",
    },
    pueblo: {
      titulo: "Mandando el request…",
      detalle: "POST /inferir al pueblo. Solo texto, sin foto ni cédula.",
      pie: "Plan B si el par no entra.",
      barraDe: "Subiendo el pedido…",
    },
  },
  esperando: {
    local: {
      titulo: "MedPsy escribe",
      detalle: "La inferencia está corriendo en este teléfono.",
      pie: "Nada sale.",
      barraDe: "Inferencia en el teléfono…",
    },
    p2p: {
      titulo: "Esperando inferencia…",
      detalle: "MedPsy está escribiendo en la laptop del pueblo.",
      pie: "Este teléfono no puede correr MedPsy. La inferencia está en el nodo.",
      barraDe: "Inferencia en el par…",
    },
    pueblo: {
      titulo: "Esperando inferencia…",
      detalle: "El pueblo está corriendo MedPsy.",
      pie: "Este teléfono no puede correr MedPsy. La inferencia está en el nodo.",
      barraDe: "Inferencia en el pueblo…",
    },
  },
  recibiendo: {
    local: {
      titulo: "Listo aquí",
      detalle: "MedPsy terminó en este teléfono.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Respuesta local…",
    },
    p2p: {
      titulo: "Recibiendo del nodo",
      detalle: "Bajando la respuesta. El modelo corrió en el nodo: este teléfono no tenía capacidad.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Llegó del par…",
    },
    pueblo: {
      titulo: "Recibiendo del nodo",
      detalle: "Bajando la respuesta. El modelo corrió en el nodo: este teléfono no tenía capacidad.",
      pie: "Siguiente: el hallazgo, que lo deciden las reglas.",
      barraDe: "Llegó del pueblo…",
    },
  },
};

function canalDe(via: ViaMed): Canal {
  if (via === "pueblo") return "pueblo";
  if (via === "p2p") return "p2p";
  if (via === "local") return "local";
  return saltarMedPsyLocal() ? "p2p" : "local";
}

function metaDe(canal: Canal): string {
  const m = modo();
  if (canal === "local") {
    return m === "local-wifi"
      ? "WiFi · modelo en este teléfono"
      : "Sin WiFi al banco · modelo en este teléfono";
  }
  if (canal === "p2p") return "WiFi no disponible · par P2P";
  return "WiFi no disponible · pueblo HTTP";
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
  const detalle = fase === "conectando" && extra && canal !== "local" ? extra : c.detalle;
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));
  const colorBarra = canal === "local" ? COLOR.tinta
    : canal === "p2p" ? COLOR.rutinaria
      : COLOR.prioritaria;

  return (
    <Pantalla scroll={false}>
      <Encabezado meta="Salir" onVolver={onSalir} />
      <View style={s.cuerpo}>
        <Text
          style={[s.meta, { color: colorBarra === COLOR.tinta ? COLOR.gris : colorBarra }]}
          accessibilityLiveRegion="polite"
        >
          {metaDe(canal)}
        </Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{c.titulo}</Text>
        <Text style={s.modelo}>{MODELO_TELEFONO.id}</Text>
        <Text style={s.linea}>
          {canal === "local" ? `${MODELO_TELEFONO.linea} · en el teléfono` : `${MODELO_TELEFONO.linea} · en el nodo`}
        </Text>
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
  meta: { ...TIPO.etiqueta, marginBottom: 4 },
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
