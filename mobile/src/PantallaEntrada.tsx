/**
 * Entrada a la app: se escribe un correo y se entra con ese historial.
 *
 * No es un login: no hay contraseña, no hay cuenta y nada sale del teléfono. El
 * correo es la llave del caso de la demo, y se declara en pantalla. En uso normal
 * la app leería el historial de quien la usa y esta pantalla no existiría.
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { USUARIOS, buscarPorCorreo, type Usuario } from "./usuarios";
import { Pantalla, Encabezado, Boton, Etiqueta, Pie } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const NO_EXISTE = "No hay ningún historial con ese correo. Revisa cómo lo escribiste.";

export default function PantallaEntrada({
  onEntrar, onRegistro,
}: {
  onEntrar: (u: Usuario) => void;
  /** Los registros medidos, para sacarlos del telefono. Entrada discreta. */
  onRegistro?: () => void;
}) {
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
    <Pantalla>
      <Encabezado meta="camino de la medicina" />

      <View style={s.arriba}>
        <Text style={s.titular}>Entra con{"\n"}tu correo</Text>
        <Text style={s.parrafo}>No pedimos contraseña y nada de esto viaja a ningún lado.</Text>
      </View>

      <Etiqueta>Correo</Etiqueta>
      <View style={s.campoCaja}>
        <TextInput
          value={correo}
          onChangeText={escribir}
          onSubmitEditing={entrar}
          placeholder="tucorreo@gmail.com"
          placeholderTextColor={COLOR.apagado}
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          accessibilityLabel="Correo con el que entras"
          style={[s.campo, error ? s.campoError : null]}
        />
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Boton texto="Entrar" onPress={entrar} />

      <View style={s.aviso}>
        <Text style={s.avisoTitulo}>Pantalla de demostración</Text>
        <Text style={s.avisoTexto}>
          Cada correo abre un historial sintético completo. Ninguno corresponde a una persona real.
        </Text>
      </View>

      <Etiqueta>Correos de la demo</Etiqueta>
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

      <Pressable onLongPress={onRegistro} delayLongPress={800} accessibilityRole="button">
        <Pie>Toda la inteligencia corre en este teléfono. Ningún servicio remoto participa.</Pie>
      </Pressable>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 4, gap: 10 },
  titular: { ...DISPLAY, fontSize: 42, lineHeight: 42, letterSpacing: -1.4, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  campoCaja: { paddingHorizontal: ESPACIO.borde },
  campo: {
    borderWidth: 3, borderColor: COLOR.tinta, backgroundColor: COLOR.fondo,
    paddingHorizontal: 14, minHeight: 58,
    fontSize: 17, fontWeight: "600", color: COLOR.tinta,
  },
  campoError: { borderColor: COLOR.inmediata },
  error: {
    fontSize: 13.5, lineHeight: 19, fontWeight: "600", color: COLOR.inmediata,
    paddingHorizontal: ESPACIO.borde, marginTop: 8,
  },

  aviso: {
    backgroundColor: COLOR.prioritaria, marginTop: 26,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 14, gap: 3,
  },
  avisoTitulo: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.6, color: COLOR.sobreColor },
  avisoTexto: { fontSize: 13.5, lineHeight: 18, color: COLOR.sobreColor },

  lista: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: ESPACIO.borde },
  correo: {
    borderWidth: 2, borderColor: COLOR.tinta, paddingHorizontal: 11,
    minHeight: TOQUE, justifyContent: "center",
  },
  correoPress: { backgroundColor: COLOR.hundido },
  correoTexto: { fontSize: 13, fontWeight: "700", color: COLOR.tinta },
});
