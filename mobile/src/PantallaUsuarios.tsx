/**
 * Pantalla de entrada: se elige con qué usuario entrar.
 *
 * En producción no existiría: la app leería el historial de quien la usa. Está
 * aquí porque la demo tiene que poder mostrar varios cuadros clínicos en cinco
 * minutos de vídeo, y se declara como tal en pantalla.
 */
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { USUARIOS, type Usuario } from "./usuarios";
import { detectarSenales } from "./core/reglas";

const COLOR_URGENCIA = {
  Inmediata: "#A2402F",
  Prioritaria: "#B77812",
  Rutinaria: "#0E6E6C",
} as const;

export default function PantallaUsuarios({ onElegir }: { onElegir: (u: Usuario) => void }) {
  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Text style={s.marca}>Ina Igar</Text>
        <Text style={s.sub}>camino de la medicina</Text>
        <Text style={s.titulo}>Elige un caso</Text>

        <View style={s.aviso}>
          <Text style={s.avisoTexto}>
            Pantalla de demostración. Cada caso es un historial sintético completo: ninguno
            corresponde a una persona real. En uso normal la app leería tu propio historial y
            esta pantalla no existiría.
          </Text>
        </View>

        {USUARIOS.map(u => {
          const senales = detectarSenales(u.mediciones);
          const peor = senales.find(x => x.urgencia === "Inmediata")
            ?? senales.find(x => x.urgencia === "Prioritaria")
            ?? senales[0];
          return (
            <Pressable
              key={u.id}
              onPress={() => onElegir(u)}
              accessibilityRole="button"
              accessibilityLabel={`Ver el caso ${u.nombre}. ${u.descripcion}`}
              style={({ pressed }) => [s.tarjeta, pressed && s.tarjetaPress]}
            >
              <View style={s.fila}>
                <View style={s.inicial}><Text style={s.inicialTexto}>{u.nombre[0]}</Text></View>
                <View style={s.textos}>
                  <Text style={s.nombre}>{u.nombre}</Text>
                  <Text style={s.meta}>{u.sexo === "mujer" ? "Mujer" : "Hombre"}, {u.edad} años</Text>
                  <Text style={s.caso}>{u.descripcion}</Text>
                </View>
                <View style={s.estado}>
                  {senales.length === 0 ? (
                    <Text style={[s.pill, { color: COLOR_URGENCIA.Rutinaria }]}>Sin señales</Text>
                  ) : (
                    <>
                      <Text style={[s.pill, { color: COLOR_URGENCIA[peor!.urgencia] }]}>
                        {peor!.urgencia}
                      </Text>
                      <Text style={s.cuenta}>
                        {senales.length} {senales.length === 1 ? "señal" : "señales"}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={s.contexto}>{u.contexto}</Text>
            </Pressable>
          );
        })}
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
  caso: { fontSize: 13.5, color: "#4E5A55", marginTop: 5 },
  estado: { alignItems: "flex-end" },
  pill: { fontSize: 12, fontWeight: "700" },
  cuenta: { fontSize: 11, color: "#818C87", marginTop: 2 },
  contexto: {
    fontSize: 12.5, color: "#818C87", marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#EAEEEB", lineHeight: 18,
  },
});
