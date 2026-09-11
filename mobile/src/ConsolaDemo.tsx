/**
 * Nodo del pueblo en el teléfono.
 * El atajo vive en el Encabezado (no flota). El registro solo aparece
 * si se abre: arriba, corto, sin tapar Salir ni los botones de abajo.
 */
import { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import {
  clearDemoLog,
  subscribeDemoLog,
  togglePanelNodo,
  setPanelNodo,
  usePanelNodo,
  useViaMed,
} from "./demoLog";
import { COLOR, TIPO } from "./ui/tokens";
import { saltarMedPsyLocal } from "./modo";
import { useState } from "react";

export function PuebloEncabezado() {
  const via = useViaMed();
  const abierta = usePanelNodo();
  const enNodo = saltarMedPsyLocal();
  const etiqueta = via.via === "p2p" ? "P2P"
    : via.via === "pueblo" ? "HTTP"
    : via.via === "local" || !enNodo ? "Tel"
    : "Nodo";
  const color = via.via === "p2p" ? COLOR.rutinaria
    : via.via === "pueblo" ? COLOR.prioritaria
    : via.via === "local" || !enNodo ? COLOR.tinta
    : COLOR.gris;
  return (
    <Pressable
      onPress={togglePanelNodo}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={abierta ? "Cerrar nodo del pueblo" : "Nodo del pueblo"}
      accessibilityState={{ expanded: abierta }}
    >
      <Text style={[s.link, { color }]}>{abierta ? "Cerrar" : etiqueta}</Text>
    </Pressable>
  );
}

export default function ConsolaDemo() {
  const abierta = usePanelNodo();
  const [lineas, setLineas] = useState<string[]>([]);
  const via = useViaMed();
  const scroll = useRef<ScrollView>(null);

  useEffect(() => subscribeDemoLog(setLineas), []);
  useEffect(() => {
    if (!abierta) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 40);
    return () => clearTimeout(t);
  }, [lineas, abierta]);

  if (!abierta) return null;

  const estado = via.viva
    ? via.texto
    : via.via === "p2p" ? "Último: par P2P"
      : via.via === "pueblo" ? "Último: pueblo HTTP"
        : via.via === "local" ? "Último: este teléfono"
          : "Par P2P o HTTP. Las fotos no salen.";

  return (
    <View style={s.capa} pointerEvents="box-none">
      <View style={s.panel} accessibilityViewIsModal>
        <View style={s.barra}>
          <View style={s.barraTxt}>
            <Text style={s.titulo}>Nodo del pueblo</Text>
            <Text style={s.sub} numberOfLines={2}>{estado}</Text>
          </View>
          <Pressable onPress={clearDemoLog} hitSlop={10} accessibilityRole="button">
            <Text style={s.accion}>Borrar</Text>
          </Pressable>
        </View>
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={s.scrollIn}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {lineas.length === 0 ? (
            <Text style={s.vacio}>Todavía no hay tráfico.</Text>
          ) : (
            lineas.map((l, i) => (
              <Text key={`${i}-${l.slice(0, 12)}`} style={s.linea} selectable>
                {l}
              </Text>
            ))
          )}
        </ScrollView>
        <Pressable
          onPress={() => setPanelNodo(false)}
          style={s.cerrar}
          accessibilityRole="button"
        >
          <Text style={s.cerrarTxt}>Cerrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const mono = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const s = StyleSheet.create({
  link: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 132 : 76,
    paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: COLOR.tinta,
    maxHeight: 220,
  },
  barra: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  barraTxt: { flex: 1, gap: 3, minWidth: 0 },
  titulo: {
    ...TIPO.barra,
    fontSize: 10,
    letterSpacing: 0.7,
    color: COLOR.sobreColor,
  },
  sub: {
    fontSize: 11,
    lineHeight: 14,
    color: COLOR.sobreColor,
    fontWeight: "600",
  },
  accion: { fontSize: 11, fontWeight: "700", color: COLOR.sobreTinta },
  scroll: { maxHeight: 120 },
  scrollIn: { paddingHorizontal: 14, paddingBottom: 8, gap: 2 },
  linea: {
    fontFamily: mono,
    fontSize: 10,
    lineHeight: 13,
    color: COLOR.sobreColor,
  },
  vacio: { fontSize: 11, lineHeight: 14, color: COLOR.sobreTinta, paddingVertical: 4 },
  cerrar: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  cerrarTxt: {
    ...TIPO.barra,
    fontSize: 10,
    letterSpacing: 0.7,
    color: COLOR.sobreColor,
  },
});
