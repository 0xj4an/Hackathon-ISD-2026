/**
 * Consola negra de demo. Vive en el layout, arriba, para no tapar botones.
 * Cerrada: una línea. Abierta: el registro. Siempre se ve.
 */
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { clearDemoLog, subscribeDemoLog, useViaMed } from "./demoLog";
import { COLOR } from "./ui/tokens";

export default function ConsolaDemo() {
  const [abierta, setAbierta] = useState(true);
  const [lineas, setLineas] = useState<string[]>([]);
  const via = useViaMed();
  const scroll = useRef<ScrollView>(null);

  useEffect(() => subscribeDemoLog(setLineas), []);
  useEffect(() => {
    if (!abierta) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 40);
    return () => clearTimeout(t);
  }, [lineas, abierta]);

  const chip = via.via === "p2p" ? "P2P"
    : via.via === "pueblo" ? "HTTP"
    : via.via === "local" ? "Tel"
    : "LOG";
  const viva = via.viva ? via.texto : lineas[lineas.length - 1] ?? "Consola lista para recibir datos";

  return (
    <View style={s.caja}>
      <Pressable
        onPress={() => setAbierta(v => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={abierta ? "Cerrar consola" : "Abrir consola"}
        style={s.tira}
      >
        <Text style={s.chip}>{chip}</Text>
        <Text style={s.ultima} numberOfLines={1}>{viva}</Text>
        <Text style={s.chev}>{abierta ? "▴" : "▾"}</Text>
      </Pressable>
      {abierta ? (
        <>
          <ScrollView
            ref={scroll}
            style={s.scroll}
            contentContainerStyle={s.scrollIn}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          >
            {lineas.length === 0 ? (
              <Text style={s.vacio}>Consola lista para recibir datos</Text>
            ) : (
              lineas.map((l, i) => (
                <Text key={`${i}-${l.slice(0, 12)}`} style={s.linea} selectable>
                  {l}
                </Text>
              ))
            )}
          </ScrollView>
          <Pressable onPress={clearDemoLog} style={s.borrar} accessibilityRole="button">
            <Text style={s.borrarTxt}>Borrar</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const mono = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const s = StyleSheet.create({
  caja: { backgroundColor: COLOR.tinta },
  tira: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 28,
  },
  chip: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLOR.sobreColor,
    flexShrink: 0,
  },
  ultima: {
    flex: 1,
    fontFamily: mono,
    fontSize: 10,
    lineHeight: 13,
    color: COLOR.sobreColor,
    minWidth: 0,
  },
  chev: { fontSize: 10, color: COLOR.sobreTinta, flexShrink: 0 },
  scroll: { maxHeight: 120 },
  scrollIn: { paddingHorizontal: 16, paddingBottom: 6, gap: 2 },
  linea: {
    fontFamily: mono,
    fontSize: 10,
    lineHeight: 13,
    color: COLOR.sobreColor,
  },
  vacio: { fontSize: 11, color: COLOR.sobreTinta, paddingVertical: 4 },
  borrar: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  borrarTxt: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: COLOR.sobreColor,
  },
});
