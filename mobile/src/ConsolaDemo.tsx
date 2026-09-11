/**
 * Consola flotante para grabar el video: petición ↔ respuesta en vivo.
 * Abierta por defecto en demo; el chip LOG queda arriba a la derecha
 * (abajo lo tapa el botón principal).
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
import { clearDemoLog, subscribeDemoLog } from "./demoLog";
import { COLOR, TIPO } from "./ui/tokens";

export default function ConsolaDemo() {
  const [abierta, setAbierta] = useState(true);
  const [lineas, setLineas] = useState<string[]>([]);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => subscribeDemoLog(setLineas), []);

  useEffect(() => {
    if (!abierta) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 40);
    return () => clearTimeout(t);
  }, [lineas, abierta]);

  return (
    <View style={s.capa} pointerEvents="box-none">
      {abierta ? (
        <View style={s.panel}>
          <View style={s.barra}>
            <Text style={s.titulo}>Consola demo</Text>
            <View style={s.acciones}>
              <Pressable onPress={clearDemoLog} hitSlop={10} accessibilityRole="button">
                <Text style={s.accion}>Borrar</Text>
              </Pressable>
              <Pressable
                onPress={() => setAbierta(false)}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={s.accion}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView
            ref={scroll}
            style={s.scroll}
            contentContainerStyle={s.scrollIn}
            onContentSizeChange={() =>
              scroll.current?.scrollToEnd({ animated: false })
            }
          >
            {lineas.length === 0 ? (
              <Text style={s.vacio}>
                Aquí salen POST al banco/pueblo, respuestas y /inferir. Sin fotos ni cédula.
              </Text>
            ) : (
              lineas.map((l, i) => (
                <Text key={`${i}-${l.slice(0, 12)}`} style={s.linea} selectable>
                  {l}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <Pressable
          onPress={() => setAbierta(true)}
          style={s.chip}
          accessibilityLabel="Abrir consola de demo"
          accessibilityRole="button"
        >
          <Text style={s.chipTxt}>LOG</Text>
          {lineas.length > 0 ? (
            <Text style={s.chipN}>{Math.min(lineas.length, 99)}</Text>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const mono = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const s = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  chip: {
    position: "absolute",
    top: 56,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLOR.tinta,
    borderWidth: 2,
    borderColor: COLOR.rutinaria,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  chipTxt: {
    ...TIPO.barra,
    fontSize: 12,
    letterSpacing: 1.4,
    color: COLOR.sobreColor,
  },
  chipN: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7DFFB0",
    fontVariant: ["tabular-nums"],
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "44%",
    backgroundColor: "#0A0A0A",
    borderTopWidth: 3,
    borderTopColor: COLOR.rutinaria,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titulo: {
    ...TIPO.barra,
    fontSize: 12,
    letterSpacing: 0.8,
    color: COLOR.sobreColor,
  },
  acciones: { flexDirection: "row", gap: 16 },
  accion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7DFFB0",
  },
  scroll: { flexGrow: 0 },
  scrollIn: { paddingHorizontal: 14, paddingBottom: 8, gap: 3 },
  linea: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 15,
    color: "#C8F0D8",
  },
  vacio: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 16,
    color: COLOR.sobreTinta,
    paddingVertical: 8,
  },
});
