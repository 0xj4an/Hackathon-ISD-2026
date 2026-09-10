/**
 * Entrada a la app: escenario (capacidad × red) × vía de salud × caso.
 *
 * Un toque no entra: hay que elegir las tres cosas y pulsar Entrar. El correo
 * no es un login. Sin selección de caso se abre diabetes.
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { USUARIOS, buscarPorCorreo, type Usuario } from "./usuarios";
import {
  ESCENARIOS, VIAS_SALUD, fijarEscenario, fijarViaSalud, usuarioDelEscenario,
  type EscenarioId, type ViaSalud,
} from "./escenario";
import { Pantalla, Encabezado, Boton, Etiqueta, Pie } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const NO_EXISTE = "No hay ningún historial con ese correo. Revisa cómo lo escribiste.";

const CASO_CORTO: Record<string, string> = {
  sano: "Control",
  diabetes: "Diabetes",
  hipertension: "Presión",
  respiratorio: "Fiebre",
  hipoglucemia: "Azúcar",
  prediabetes: "Límite",
  "glu-leve": "Alerta",
  "sat-critica": "Oxígeno",
  "resp-grave": "Ahogo",
};

export default function PantallaEntrada({
  onEntrar, onRegistro,
}: {
  onEntrar: (u: Usuario, escenario: EscenarioId, via: ViaSalud) => void;
  onRegistro?: () => void;
}) {
  const [correo, setCorreo] = useState(usuarioDelEscenario().correo);
  const [error, setError] = useState("");
  const [escena, setEscena] = useState<EscenarioId>("A");
  const [via, setVia] = useState<ViaSalud>("historial");

  const entrar = () => {
    const usuario = buscarPorCorreo(correo) ?? (correo.trim() === "" ? usuarioDelEscenario() : undefined);
    if (!usuario) return setError(NO_EXISTE);
    setError("");
    fijarEscenario(escena);
    fijarViaSalud(via);
    onEntrar(usuario, escena, via);
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
        <Text style={s.parrafo}>Elige escenario, historial o examen, y el caso. Nada de esto viaja.</Text>
      </View>

      <Etiqueta>Escenario · el teléfono</Etiqueta>
      <View style={s.escenarios}>
        {ESCENARIOS.map(e => {
          const puesto = escena === e.id;
          return (
            <Pressable
              key={e.id}
              onPress={() => setEscena(e.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: puesto }}
              accessibilityLabel={`${e.titulo}. ${e.detalle}`}
              style={({ pressed }) => [
                s.escena,
                { borderColor: e.color },
                puesto && { backgroundColor: e.color },
                pressed && s.press,
              ]}
            >
              <View style={[s.marca, { backgroundColor: puesto ? COLOR.sobreColor : e.color }]} />
              <View style={s.escenaTextos}>
                <Text style={[s.escenaTitulo, puesto && s.escenaSobre]}>{e.titulo}</Text>
                <Text style={[s.escenaDetalle, puesto && s.escenaSobre]}>{e.detalle}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Etiqueta>Qué se lee</Etiqueta>
      <View style={s.vias}>
        {VIAS_SALUD.map(v => {
          const puesto = via === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => setVia(v.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: puesto }}
              accessibilityLabel={`${v.titulo}: ${v.detalle}`}
              style={({ pressed }) => [s.via, puesto && s.puesto, pressed && s.press]}
            >
              <Text style={s.viaTitulo}>{v.titulo}</Text>
              <Text style={s.viaDetalle}>{v.detalle}</Text>
            </Pressable>
          );
        })}
      </View>

      <Etiqueta>Caso</Etiqueta>
      <View style={s.lista}>
        {USUARIOS.map(u => {
          const puesto = correo.trim().toLowerCase() === u.correo;
          return (
            <Pressable
              key={u.id}
              onPress={() => escribir(u.correo)}
              accessibilityRole="button"
              accessibilityState={{ selected: puesto }}
              accessibilityLabel={`${CASO_CORTO[u.id] ?? u.id}: ${u.caso}`}
              style={({ pressed }) => [s.correo, puesto && s.puesto, pressed && s.press]}
            >
              <Text style={s.correoTexto}>{CASO_CORTO[u.id] ?? u.id}</Text>
            </Pressable>
          );
        })}
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
        <Text style={s.avisoTitulo}>Seis tomas, mismos casos</Text>
        <Text style={s.avisoTexto}>
          El color es si el aparato corre el modelo y si hay wifi. Historial y examen se eligen aparte. El crédito solo nace del historial.
        </Text>
      </View>

      <Pressable onLongPress={onRegistro} delayLongPress={800} accessibilityRole="button">
        <Pie>Historial sintético. Nadie de verdad está detrás de un correo.</Pie>
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

  escenarios: { paddingHorizontal: ESPACIO.borde, gap: 8, marginBottom: 18 },
  escena: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 3,
    borderColor: COLOR.tinta,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: TOQUE + 8,
  },
  marca: { width: 14, height: 14 },
  escenaTextos: { flex: 1, gap: 2 },
  escenaTitulo: { fontSize: 15, fontWeight: "800", color: COLOR.tinta },
  escenaDetalle: { fontSize: 13, lineHeight: 17, color: COLOR.gris },
  escenaSobre: { color: COLOR.sobreColor },

  vias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: ESPACIO.borde,
    marginBottom: 18,
  },
  via: {
    flexGrow: 1,
    flexBasis: 148,
    borderWidth: 3,
    borderColor: COLOR.tinta,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: TOQUE + 16,
    gap: 4,
  },
  viaTitulo: { fontSize: 16, fontWeight: "800", color: COLOR.tinta },
  viaDetalle: { fontSize: 12.5, lineHeight: 16, color: COLOR.gris },

  puesto: { backgroundColor: COLOR.hundido },
  press: { backgroundColor: COLOR.hundido },

  lista: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: ESPACIO.borde, marginBottom: 18 },
  correo: {
    borderWidth: 2, borderColor: COLOR.tinta, paddingHorizontal: 11,
    minHeight: TOQUE, justifyContent: "center",
  },
  correoTexto: { fontSize: 13, fontWeight: "700", color: COLOR.tinta },
});
