/**
 * Señal de lo que está haciendo el teléfono ahora: par P2P, pueblo HTTP o MedPsy local.
 * Se queda hasta que termina de verdad. El porcentaje de las otras pantallas aquí mentiría.
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pantalla, Encabezado } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";
import { MODELO_TELEFONO } from "./modelosMarca";
import { saltarMedPsyLocal } from "./modo";
import { useViaMed, type EstadoVia } from "./demoLog";

function escena(via: EstadoVia, extra?: string): {
  meta: string;
  titulo: string;
  detalle: string;
  pie: string;
  color: string;
} {
  if (via.via === "p2p") {
    const buscando = /buscando/i.test(via.texto);
    return {
      meta: "Nodo del pueblo · par P2P",
      titulo: buscando ? "Buscando par" : "MedPsy escribe",
      detalle: via.texto,
      pie: "El modelo corre en la laptop del pueblo. La foto no sale.",
      color: COLOR.rutinaria,
    };
  }
  if (via.via === "pueblo") {
    return {
      meta: "Nodo del pueblo · HTTP",
      titulo: "Pueblo HTTP",
      detalle: via.texto,
      pie: "Solo texto. Sin foto y sin cédula.",
      color: COLOR.prioritaria,
    };
  }
  if (via.via === "local") {
    return {
      meta: "Este teléfono",
      titulo: "MedPsy",
      detalle: via.texto,
      pie: "El modelo corre aquí. Nada sale.",
      color: COLOR.tinta,
    };
  }
  if (extra) {
    return {
      meta: saltarMedPsyLocal() ? "Nodo del pueblo" : "Este teléfono",
      titulo: "Leyendo",
      detalle: extra,
      pie: saltarMedPsyLocal()
        ? "OCR aquí. Luego MedPsy en el par o el pueblo."
        : "Se lee en este teléfono.",
      color: COLOR.prioritaria,
    };
  }
  if (saltarMedPsyLocal()) {
    return {
      meta: "Nodo del pueblo",
      titulo: "Delegando",
      detalle: "Primero el par P2P. Si no entra, el pueblo por HTTP.",
      pie: "Este teléfono no carga el modelo.",
      color: COLOR.inmediata,
    };
  }
  return {
    meta: "Este teléfono",
    titulo: "MedPsy",
    detalle: "El modelo está explicando esto aquí.",
    pie: "Nada sale a internet.",
    color: COLOR.tinta,
  };
}

export default function PantallaViaMed({
  onSalir,
  extra,
}: {
  onSalir?: () => void;
  extra?: string;
}) {
  const via = useViaMed();
  const c = escena(via, extra);
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSeg(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <Pantalla scroll={false}>
      <Encabezado meta="Salir" onVolver={onSalir} />
      <View style={s.cuerpo}>
        <Text style={[s.meta, { color: c.color }]} accessibilityLiveRegion="polite">{c.meta}</Text>
        <Text style={s.titulo} accessibilityLiveRegion="polite">{c.titulo}</Text>
        <Text style={s.modelo}>{MODELO_TELEFONO.id}</Text>
        <Text style={s.linea}>{MODELO_TELEFONO.linea}</Text>
        <Text style={s.detalle}>{c.detalle}</Text>

        <Text style={s.seg} accessibilityLiveRegion="polite">{seg} s</Text>
        <Text style={s.segDe}>en curso</Text>

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
  seg: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta, marginTop: 18 },
  segDe: { fontSize: 13, lineHeight: 18, color: COLOR.gris },
  pie: { marginTop: 18, fontSize: 13, lineHeight: 18, color: COLOR.gris },
});
