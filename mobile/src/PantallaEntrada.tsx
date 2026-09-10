/**
 * Entrada a la app: se escribe un correo y se entra con ese historial.
 *
 * No es un login: no hay contraseña, no hay cuenta y nada sale del teléfono. El
 * correo es la llave del caso de la demo, y se declara en pantalla. En uso normal
 * la app leería el historial de quien la usa y esta pantalla no existiría.
 */
import { useState } from "react";
import {
  SafeAreaView, ScrollView, Text, View, TextInput, Pressable, StyleSheet,
} from "react-native";
import { USUARIOS, buscarPorCorreo, type Usuario } from "./usuarios";

const NO_EXISTE = "No hay ningún historial con ese correo. Revisa cómo lo escribiste.";

export default function PantallaEntrada({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");

  const entrar = () => {
    const usuario = buscarPorCorreo(correo);
    if (!usuario) return setError(NO_EXISTE);
    setError("");
    onEntrar(usuario);
  };

  const escribir = (texto: string) => {
    setCorreo(texto);
    if (error) setError("");
  };

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
        <Text style={s.marca}>Ina Igar</Text>
        <Text style={s.sub}>camino de la medicina</Text>

        <Text style={s.titulo}>Entra con tu correo</Text>
        <Text style={s.parrafo}>
          No pedimos contraseña y nada de esto viaja a ningún lado.
        </Text>

        <Text style={s.etiqueta}>Correo</Text>
        <TextInput
          value={correo}
          onChangeText={escribir}
          onSubmitEditing={entrar}
          placeholder="tucorreo@gmail.com"
          placeholderTextColor="#A6B0AB"
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          accessibilityLabel="Correo con el que entras"
          style={[s.campo, error ? s.campoError : null]}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable
          onPress={entrar}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
          style={({ pressed }) => [s.boton, pressed && s.botonPress]}
        >
          <Text style={s.botonTexto}>Entrar</Text>
        </Pressable>

        <View style={s.aviso}>
          <Text style={s.avisoTexto}>
            Pantalla de demostración. Cada correo abre un historial sintético completo:
            ninguno corresponde a una persona real.
          </Text>
        </View>

        <Text style={s.etiqueta}>Correos de la demo</Text>
        <View style={s.lista}>
          {USUARIOS.map(u => (
            <Pressable
              key={u.id}
              onPress={() => escribir(u.correo)}
              accessibilityRole="button"
              accessibilityLabel={`Usar el correo ${u.correo}`}
              style={({ pressed }) => [s.correo, pressed && s.correoPress]}
            >
              <Text style={s.correoTexto}>{u.correo}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  marca: { fontSize: 30, fontWeight: "700", color: "#0F1512" },
  sub: { fontSize: 14, color: "#818C87", marginTop: 2 },
  titulo: { fontSize: 19, fontWeight: "600", color: "#0F1512", marginTop: 34 },
  parrafo: { fontSize: 14, lineHeight: 21, color: "#4E5A55", marginTop: 6 },
  etiqueta: {
    fontSize: 12, color: "#818C87", marginTop: 24, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  campo: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#D3DAD6",
    borderBottomWidth: 2, borderBottomColor: "#0E6E6C",
    borderRadius: 3, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: "#0F1512",
  },
  campoError: { borderBottomColor: "#A2402F" },
  error: { fontSize: 13, lineHeight: 19, color: "#A2402F", marginTop: 8 },
  boton: {
    backgroundColor: "#0E6E6C", borderRadius: 3,
    paddingVertical: 14, alignItems: "center", marginTop: 16,
  },
  botonPress: { backgroundColor: "#0B5654" },
  botonTexto: { fontSize: 15, fontWeight: "600", color: "#F4F6F4" },
  aviso: {
    backgroundColor: "#F7EBD5", borderLeftWidth: 3, borderLeftColor: "#B77812",
    padding: 14, borderRadius: 3, marginTop: 28,
  },
  avisoTexto: { fontSize: 13, lineHeight: 19, color: "#6B5310" },
  lista: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  correo: {
    borderWidth: 1, borderColor: "#D3DAD6", borderRadius: 3,
    paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#FFFFFF",
  },
  correoPress: { backgroundColor: "#EAEEEB" },
  correoTexto: { fontSize: 13, color: "#4E5A55" },
});
