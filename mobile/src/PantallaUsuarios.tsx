/**
 * Pantalla de entrada alternativa: se elige con qué usuario entrar.
 *
 * En producción no existiría. No adelanta hallazgos: eso sale después de leer
 * el historial, igual que en el flujo real (entrada → salud → alerta).
 */
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { USUARIOS, type Usuario } from "./usuarios";

export default function PantallaUsuarios({ onElegir }: { onElegir: (u: Usuario) => void }) {
  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Text style={s.marca}>Ina Igar</Text>
        <Text style={s.sub}>camino de la medicina</Text>
        <Text style={s.titulo}>Elige un historial</Text>

        <View style={s.aviso}>
          <Text style={s.avisoTexto}>
            Pantalla de demostración. Cada opción es un historial sintético de ~un año: ninguno
            corresponde a una persona real. Primero se lee; después, si algo está fuera de rango,
            aparece la alerta.
          </Text>
        </View>

        {USUARIOS.map(u => (
          <Pressable
            key={u.id}
            onPress={() => onElegir(u)}
            accessibilityRole="button"
            accessibilityLabel={`Entrar con ${u.correo}`}
            style={({ pressed }) => [s.tarjeta, pressed && s.tarjetaPress]}
          >
            <View style={s.fila}>
              <View style={s.inicial}><Text style={s.inicialTexto}>{u.correo[0].toUpperCase()}</Text></View>
              <View style={s.textos}>
                <Text style={s.nombre}>{u.correo}</Text>
                <Text style={s.meta}>{u.sexo === "mujer" ? "Mujer" : "Hombre"}, {u.edad} años</Text>
              </View>
            </View>
            <Text style={s.contexto}>{u.contexto}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  marca: { fontSize: 30, fontWeight: "700", color: "#0F1512" },
  sub: { fontSize: 14, color: "#818C87", marginTop: 2 },
  titulo: { fontSize: 19, fontWeight: "600", color: "#0F1512", marginTop: 26, marginBottom: 14 },
  aviso: {
    backgroundColor: "#F7EBD5", borderLeftWidth: 3, borderLeftColor: "#B77812",
    padding: 14, borderRadius: 3, marginBottom: 22,
  },
  avisoTexto: { fontSize: 13, lineHeight: 19, color: "#6B5310" },
  tarjeta: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D3DAD6",
    borderRadius: 4, padding: 16, marginBottom: 12,
  },
  tarjetaPress: { backgroundColor: "#EAEEEB" },
  fila: { flexDirection: "row", alignItems: "center", gap: 14 },
  inicial: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAEEEB",
    alignItems: "center", justifyContent: "center",
  },
  inicialTexto: { fontSize: 17, fontWeight: "700", color: "#4E5A55" },
  textos: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: "600", color: "#0F1512" },
  meta: { fontSize: 12, color: "#818C87", marginTop: 1 },
  contexto: {
    fontSize: 12.5, color: "#818C87", marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#EAEEEB", lineHeight: 18,
  },
});
