/**
 * Puente entre el splash nativo y la primera pantalla.
 * Negro + huellas blancas + estado de carga. Misma señal que el icono.
 */
import { useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLOR, DISPLAY, TIPO, ESPACIO } from "./ui/tokens";

export default function PantallaArranque({
  detalle,
  onMostrada,
}: {
  detalle: string;
  /** Cuando el layout ya pintó: ocultar el splash nativo sin flash. */
  onMostrada?: () => void;
}) {
  useEffect(() => {
    onMostrada?.();
  }, [onMostrada]);

  return (
    <View style={s.raiz} onLayout={() => onMostrada?.()}>
      <StatusBar style="light" />
      <Image
        source={require("../assets/huellas-blanco.png")}
        style={s.huellas}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={s.marca}>Ina Igar</Text>
      <Text style={s.meta}>Camino de la medicina</Text>
      <View style={s.carga}>
        <ActivityIndicator color={COLOR.sobreColor} />
        <Text style={s.detalle}>{detalle}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ESPACIO.borde,
  },
  huellas: {
    width: 220,
    height: 220,
    marginBottom: 28,
  },
  marca: {
    ...DISPLAY,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: COLOR.sobreColor,
  },
  meta: {
    ...TIPO.barra,
    color: COLOR.sobreTinta,
    marginTop: 10,
  },
  carga: {
    position: "absolute",
    bottom: 56,
    left: ESPACIO.borde,
    right: ESPACIO.borde,
    alignItems: "center",
    gap: 12,
  },
  detalle: {
    ...TIPO.pie,
    color: COLOR.sobreTinta,
    textAlign: "center",
  },
});
