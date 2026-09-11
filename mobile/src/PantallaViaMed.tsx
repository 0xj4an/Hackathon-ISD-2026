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

function metaDe(canal: Canal): { aviso: string | null; resto: string } {
  const m = modo();
  if (canal === "local") {
    if (m === "local-wifi") return { aviso: null, resto: "WiFi · modelo en este teléfono" };
    return { aviso: "WiFi no disponible", resto: "modelo en este teléfono" };
  }
  if (canal === "p2p") return { aviso: "WiFi no disponible", resto: "par P2P" };
  return { aviso: "WiFi no disponible", resto: "pueblo HTTP" };
}

export default function PantallaViaMed({
  onSalir,
  extra,
  activo = true,
  onListo,
  lora,
}: {
  onSalir?: () => void;
  extra?: string;
  activo?: boolean;
  onListo?: () => void;
  /** Examen: versión LoRA en el teléfono. Vacío si se delega al nodo. */
  lora?: string | null;
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

  const meta = metaDe(canal);
  const conLora = Boolean(lora) && canal === "local";
  const c = COPY[fase][canal];
  const titulo = conLora ? `MedPsy + LoRA ${lora}` : c.titulo;
  const detalle = extra?.trim()
    ? extra
    : conLora
      ? (fase === "conectando"
        ? `Cargando MedPsy + LoRA ${lora} en este teléfono.`
        : fase === "delegando"
          ? `MedPsy + LoRA ${lora} recibe el texto. La foto no se mueve.`
          : fase === "esperando"
            ? `MedPsy + LoRA ${lora} está corriendo en este teléfono.`
            : `MedPsy + LoRA ${lora} terminó en este teléfono.`)
      : c.detalle;
  const barraDe = conLora
    ? (fase === "conectando" ? `Cargando MedPsy + LoRA ${lora}…`
      : fase === "delegando" ? `Pasando el texto a MedPsy + LoRA ${lora}…`
        : fase === "esperando" ? `Inferencia MedPsy + LoRA ${lora}…`
          : `Respuesta MedPsy + LoRA ${lora}…`)
    : c.barraDe;
  const linea = conLora
    ? `${MODELO_TELEFONO.linea} + LoRA ${lora} · en el teléfono`
    : canal === "local"
      ? `${MODELO_TELEFONO.linea} · en el teléfono`
      : `${MODELO_TELEFONO.linea} · en el nodo`;
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));
  const colorBarra = canal === "local" ? COLOR.tinta
    : canal === "p2p" ? COLOR.rutinaria
      : COLOR.prioritaria;

  return (
    <Pantalla scroll={false}>
      <Encabezado meta="Salir" onVolver={onSalir} />
      <View style={s.cuerpo}>
        <Text style={s.meta} accessibilityLiveRegion="polite">
          {meta.aviso ? (
            <>
              <Text style={{ color: COLOR.prioritaria }}>{meta.aviso}</Text>
              <Text style={{ color: COLOR.gris }}> · {meta.resto}</Text>
            </>
          ) : (
            meta.resto
          )}
        </Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{titulo}</Text>
        <Text style={s.modelo}>
          {conLora ? `${MODELO_TELEFONO.id} · LoRA ${lora}` : MODELO_TELEFONO.id}
        </Text>
        <Text style={s.linea}>{linea}</Text>
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
          <Text style={s.barraDe}>{barraDe}</Text>
        </View>

        <Text style={s.pie}>
          {conLora
            ? "El LoRA saca los marcadores. Rangos y urgencia los decide el catálogo, no el modelo."
            : c.pie}
        </Text>
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
