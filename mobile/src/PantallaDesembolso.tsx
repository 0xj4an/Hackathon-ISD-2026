/**
 * Final feliz: distinto a “Aprobado”. Negro + destino, no el mismo bloque verde.
 * No mueve plata real.
 */
import { View, Text, StyleSheet } from "react-native";
import type { Respuesta } from "./core/credito/motor";
import {
  Pantalla, Encabezado, Boton, Pie,
} from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";

export default function PantallaDesembolso({
  respuesta, destino, constancia, onListo,
}: {
  respuesta: Respuesta;
  destino: string;
  /** Hash corto del trazo (demo local; no sale al banco). */
  constancia?: string;
  onListo: () => void;
}) {
  const monto = respuesta.monto_aprobado_usd ?? 0;

  return (
    <Pantalla>
      <Encabezado />

      <View style={s.hero}>
        <Text style={s.eyebrow}>Crédito aceptado</Text>
        <Text style={s.palabra}>Ya está{"\n"}en tu cuenta</Text>
        <Text style={s.detalle}>
          Simulación de la demo: no hubo un traslado bancario real.
        </Text>
      </View>

      <View style={s.caja}>
        <Text style={s.cajaEtiqueta}>Desembolsado</Text>
        <Text style={s.cajaMonto}>B/. {monto}</Text>
        <View style={s.sep} />
        <Text style={s.cajaEtiqueta}>Destino</Text>
        <Text style={s.cajaDestino}>{destino}</Text>
        {respuesta.cuota_mensual_usd != null && respuesta.plazo_meses != null ? (
          <>
            <View style={s.sep} />
            <Text style={s.cajaNota}>
              Cuota B/. {respuesta.cuota_mensual_usd.toFixed(2)} · {respuesta.plazo_meses} meses
            </Text>
          </>
        ) : null}
        {constancia ? (
          <>
            <View style={s.sep} />
            <Text style={s.cajaNota}>Constancia del trazo · {constancia}</Text>
          </>
        ) : null}
      </View>

      <Boton texto="Terminar" tono="rutinaria" onPress={onListo} />
      <Pie>Fin del camino. Vuelves a la entrada para otro caso de demo.</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 10,
  },
  eyebrow: {
    ...TIPO.barra,
    fontSize: 12,
    letterSpacing: 1,
    color: COLOR.sobreTinta,
  },
  palabra: {
    ...DISPLAY,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.4,
    color: COLOR.sobreColor,
  },
  detalle: {
    fontSize: 14.5,
    lineHeight: 20,
    color: COLOR.sobreTinta,
    marginTop: 4,
  },

  caja: {
    marginTop: 0,
    borderTopWidth: 0,
    backgroundColor: COLOR.rutinaria,
    paddingHorizontal: ESPACIO.borde,
    paddingVertical: 22,
    gap: 4,
  },
  cajaEtiqueta: {
    ...TIPO.etiqueta,
    fontSize: 11,
    color: COLOR.sobreColor,
    opacity: 0.85,
  },
  cajaMonto: {
    ...DISPLAY,
    fontSize: 36,
    lineHeight: 38,
    color: COLOR.sobreColor,
  },
  cajaDestino: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: COLOR.sobreColor,
  },
  cajaNota: {
    fontSize: 14,
    lineHeight: 19,
    color: COLOR.sobreColor,
    opacity: 0.9,
  },
  sep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginVertical: 12,
  },
});
