/**
 * El crédito de salud: por cuánto se pide y qué hay que entregar.
 *
 * Los dos montos salen del paquete de `core/paquete.ts`, no de una lista fija:
 * el alto cubre el peor caso y el bajo el mejor. Es la bisagra entre el reto de
 * salud y el de inclusión financiera, y aquí se declara lo que de verdad importa:
 * al banco viaja el propósito genérico "salud", nunca la señal que se detectó ni
 * ninguna de las fotos.
 */
import { useState } from "react";
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";

export default function PantallaCredito({
  costoMin, costoMax, onContinuar, onVolver,
}: {
  costoMin: number;
  costoMax: number;
  onContinuar: (monto: number) => void;
  onVolver: () => void;
}) {
  const [monto, setMonto] = useState(costoMax);

  const opciones = [
    { valor: costoMax, titulo: "Todo", ayuda: "Cubre el peor caso" },
    { valor: costoMin, titulo: "Lo justo", ayuda: "Si consigues los precios bajos" },
  ];

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Pressable onPress={onVolver} accessibilityRole="button" style={s.volver}>
          <Text style={s.volverTexto}>Volver a la alerta</Text>
        </Pressable>

        <Text style={s.titulo}>Crédito de salud</Text>
        <Text style={s.parrafo}>
          Atender todo cuesta entre B/. {costoMin} y B/. {costoMax}. Puedes pedirlo desde aquí,
          sin bajar al pueblo.
        </Text>

        <Text style={s.etiqueta}>Cuánto necesitas</Text>
        <View style={s.montos}>
          {opciones.map(o => {
            const elegido = o.valor === monto;
            return (
              <Pressable
                key={o.titulo}
                onPress={() => setMonto(o.valor)}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegido }}
                accessibilityLabel={`${o.titulo}, ${o.valor} balboas. ${o.ayuda}`}
                style={({ pressed }) => [s.monto, elegido && s.montoElegido, pressed && s.montoPress]}
              >
                <Text style={[s.montoCifra, elegido && s.montoCifraElegida]}>B/. {o.valor}</Text>
                <Text style={s.montoTitulo}>{o.titulo}</Text>
                <Text style={s.montoAyuda}>{o.ayuda}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.etiqueta}>Qué te vamos a pedir</Text>
        <View style={s.lista}>
          <Punto texto="Una foto de tu cédula" />
          <Punto texto="Una foto de tu comprobante de ingresos" />
          <Punto texto="Una foto de tu extracto bancario, si lo tienes. Baja la tasa" />
        </View>

        <View style={s.privacidad}>
          <Text style={s.privacidadTitulo}>Qué ve el banco</Text>
          <Text style={s.privacidadTexto}>
            Las fotos se leen en este teléfono y se borran. Al banco solo le llegan los datos
            escritos y que el préstamo es de salud. No le llega qué se te detectó.
          </Text>
        </View>

        <Pressable
          onPress={() => onContinuar(monto)}
          accessibilityRole="button"
          accessibilityLabel={`Cargar mis documentos para pedir ${monto} balboas`}
          style={({ pressed }) => [s.boton, pressed && s.botonPress]}
        >
          <Text style={s.botonTexto}>Cargar mis documentos</Text>
        </Pressable>

        <Pressable onPress={onVolver} accessibilityRole="button" style={s.secundario}>
          <Text style={s.secundarioTexto}>Ahora no</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Punto = ({ texto }: { texto: string }) => (
  <View style={s.punto}>
    <View style={s.vineta} />
    <Text style={s.puntoTexto}>{texto}</Text>
  </View>
);

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  volver: { marginBottom: 20 },
  volverTexto: { fontSize: 14, color: "#0E6E6C", fontWeight: "600" },
  titulo: { fontSize: 24, fontWeight: "700", color: "#0F1512" },
  parrafo: { fontSize: 15, lineHeight: 22, color: "#4E5A55", marginTop: 10 },
  etiqueta: {
    fontSize: 12, color: "#818C87", marginTop: 26, marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  montos: { flexDirection: "row", gap: 10 },
  monto: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D3DAD6", borderRadius: 3,
  },
  montoElegido: { borderColor: "#0E6E6C", borderWidth: 2, backgroundColor: "#DCEBEA" },
  montoPress: { backgroundColor: "#EAEEEB" },
  montoCifra: { fontSize: 18, fontWeight: "700", color: "#4E5A55" },
  montoCifraElegida: { color: "#0E6E6C" },
  montoTitulo: { fontSize: 13.5, fontWeight: "600", color: "#0F1512", marginTop: 4 },
  montoAyuda: { fontSize: 12, lineHeight: 17, color: "#818C87", marginTop: 2 },
  lista: { gap: 10 },
  punto: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  vineta: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#818C87", marginTop: 8 },
  puntoTexto: { flex: 1, fontSize: 14.5, lineHeight: 21, color: "#4E5A55" },
  privacidad: {
    backgroundColor: "#DCEBEA", borderWidth: 1, borderColor: "#0E6E6C",
    borderRadius: 4, padding: 16, marginTop: 26,
  },
  privacidadTitulo: { fontSize: 14, fontWeight: "700", color: "#0E6E6C", marginBottom: 6 },
  privacidadTexto: { fontSize: 13.5, lineHeight: 20, color: "#2F4746" },
  boton: {
    backgroundColor: "#0E6E6C", borderRadius: 3,
    paddingVertical: 15, alignItems: "center", marginTop: 26,
  },
  botonPress: { backgroundColor: "#0B5654" },
  botonTexto: { fontSize: 15, fontWeight: "600", color: "#F4F6F4" },
  secundario: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  secundarioTexto: { fontSize: 14, color: "#818C87" },
});
