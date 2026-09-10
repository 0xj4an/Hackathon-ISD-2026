/**
 * Entrada: correo primero; abajo, controles de demo (modo + caso).
 * El historial se lee siempre; el examen se ofrece tras el resultado.
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { USUARIOS, buscarPorCorreo, type Usuario } from "./usuarios";
import {
  MODOS, fijarModo, usuarioDelModo, etiquetaModo, type ModoId,
} from "./modo";
import { Pantalla, Encabezado, Boton, Pie } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const NO_EXISTE = "No hay ningún historial con ese correo. Revisa cómo lo escribiste.";

const CASO_CORTO: Record<string, string> = {
  sano: "Sano",
  diabetes: "Diabetes",
  hipertension: "Hipertensión",
  respiratorio: "Respiratorio",
  hipoglucemia: "Hipoglucemia",
  prediabetes: "Prediabetes",
  "glu-leve": "Azúcar baja",
  "sat-critica": "Oxígeno crítico",
  "resp-grave": "Respiración alta",
};

export default function PantallaEntrada({
  onEntrar, onRegistro,
}: {
  onEntrar: (u: Usuario, modo: ModoId) => void;
  onRegistro?: () => void;
}) {
  const [correo, setCorreo] = useState(usuarioDelModo().correo);
  const [error, setError] = useState("");
  const [modoSel, setModoSel] = useState<ModoId>("local-wifi");
  const [demoAbierta, setDemoAbierta] = useState(false);

  const entrar = () => {
    const usuario = buscarPorCorreo(correo) ?? (correo.trim() === "" ? usuarioDelModo() : undefined);
    if (!usuario) return setError(NO_EXISTE);
    setError("");
    fijarModo(modoSel);
    onEntrar(usuario, modoSel);
  };

  const escribir = (texto: string) => {
    setCorreo(texto);
    if (error) setError("");
  };

  const casoActivo = USUARIOS.find(u => u.correo === correo.trim().toLowerCase());
  const modoActivo = MODOS.find(e => e.id === modoSel) ?? MODOS[0];
  const demoResumen = [
    etiquetaModo(modoActivo),
    casoActivo ? (CASO_CORTO[casoActivo.id] ?? casoActivo.id) : "correo libre",
  ].join(" · ");

  return (
    <Pantalla>
      <Encabezado meta="Camino de la medicina" />

      <View style={s.arriba}>
        <Text style={s.titular}>Entra con{"\n"}tu correo</Text>
        <Text style={s.parrafo}>Tu historial se queda en este teléfono. Nada de esto viaja.</Text>
      </View>

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

      <View style={s.demo}>
        <Pressable
          onPress={() => setDemoAbierta(v => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: demoAbierta }}
          accessibilityLabel="Controles solo para demostración"
          style={({ pressed }) => [s.demoCabecera, pressed && s.press]}
        >
          <View style={s.demoCabeceraTextos}>
            <Text style={s.demoBadge}>Solo para demostración</Text>
            <Text style={s.demoResumen} numberOfLines={2}>{demoResumen}</Text>
          </View>
          <Text style={s.demoChevron}>{demoAbierta ? "▴" : "▾"}</Text>
        </Pressable>

        {demoAbierta ? (
          <View style={s.demoCuerpo}>
            <Text style={s.demoAyuda}>
              WiFi y dónde corre el modelo. El historial se lee siempre; el examen se ofrece después del resultado.
            </Text>

            <Text style={s.demoEtiqueta}>Modo · el teléfono</Text>
            <View style={s.modos}>
              {MODOS.map(e => {
                const puesto = modoSel === e.id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setModoSel(e.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: puesto }}
                    accessibilityLabel={`${etiquetaModo(e)}. ${e.detalle}`}
                    style={({ pressed }) => [
                      s.modo,
                      puesto && { borderColor: e.color, backgroundColor: COLOR.hundido },
                      pressed && s.press,
                    ]}
                  >
                    <View style={[s.marca, { backgroundColor: e.color }]} />
                    <View style={s.modoTextos}>
                      <View style={s.modoLineas}>
                        <Text style={s.modoWifi}>{e.wifi}</Text>
                        <Text style={s.modoMas}>+</Text>
                        <Text style={s.modoModelo}>{e.modelo}</Text>
                      </View>
                      <Text style={s.modoDetalle}>{e.detalle}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.demoEtiqueta}>Caso</Text>
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
          </View>
        ) : null}
      </View>

      <Pressable onLongPress={onRegistro} delayLongPress={800} accessibilityRole="button">
        <Pie>Historial sintético. Nadie de verdad está detrás de un correo.</Pie>
      </Pressable>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 4, gap: 10 },
  titular: { ...DISPLAY, fontSize: 42, lineHeight: 46, letterSpacing: -1.4, color: COLOR.tinta },
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

  demo: {
    marginTop: 28,
    marginHorizontal: ESPACIO.borde,
    borderWidth: 1,
    borderColor: COLOR.separador,
    backgroundColor: COLOR.hundido,
  },
  demoCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: TOQUE,
  },
  demoCabeceraTextos: { flex: 1, gap: 4, minWidth: 0 },
  demoBadge: {
    ...TIPO.etiqueta,
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLOR.gris,
  },
  demoResumen: { fontSize: 13, lineHeight: 17, color: COLOR.tinta, fontWeight: "600" },
  demoChevron: { fontSize: 14, color: COLOR.gris },
  demoCuerpo: {
    borderTopWidth: 1,
    borderTopColor: COLOR.separador,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  demoAyuda: {
    fontSize: 13, lineHeight: 18, color: COLOR.gris,
    paddingHorizontal: 14, marginBottom: 10,
  },
  demoEtiqueta: {
    ...TIPO.etiqueta, fontSize: 11, color: COLOR.gris,
    paddingHorizontal: 14, marginTop: 10, marginBottom: 8,
  },

  modos: { paddingHorizontal: 14, gap: 6, marginBottom: 8 },
  modo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLOR.separador,
    backgroundColor: COLOR.fondo,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: TOQUE,
  },
  marca: { width: 10, height: 10 },
  modoTextos: { flex: 1, gap: 4, minWidth: 0 },
  modoLineas: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  modoWifi: { fontSize: 13.5, fontWeight: "800", color: COLOR.tinta },
  modoMas: { fontSize: 12, fontWeight: "700", color: COLOR.apagado },
  modoModelo: { fontSize: 13.5, fontWeight: "800", color: COLOR.tinta },
  modoDetalle: { fontSize: 12, lineHeight: 16, color: COLOR.gris },

  puesto: { backgroundColor: COLOR.hundido, borderColor: COLOR.tinta },
  press: { opacity: 0.85 },

  lista: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14 },
  correo: {
    borderWidth: 1, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
    paddingHorizontal: 10, minHeight: 40, justifyContent: "center",
  },
  correoTexto: { fontSize: 12.5, fontWeight: "700", color: COLOR.tinta },
});
