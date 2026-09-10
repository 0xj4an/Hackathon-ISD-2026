/**
 * Entrada: correo primero; abajo, controles de demo (modo + caso + pueblo).
 * El historial se lee siempre; el examen se ofrece tras el resultado.
 */
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { USUARIOS, buscarPorCorreo, type Usuario } from "./usuarios";
import {
  MODOS, fijarModo, usuarioDelModo, etiquetaModo, type ModoId,
} from "./modo";
import {
  etiquetaOrigen,
  fijarUrlNodo,
  limpiarUrlNodo,
  probarNodo,
  resolverNodo,
} from "./nodoUrl";
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
  const [puebloEdit, setPuebloEdit] = useState("");
  const [puebloInfo, setPuebloInfo] = useState(() => resolverNodo());
  const [puebloPrueba, setPuebloPrueba] = useState("");
  const [probando, setProbando] = useState(false);

  const refrescarPueblo = () => {
    const r = resolverNodo();
    setPuebloInfo(r);
    setPuebloEdit(r.url.replace(/^https?:\/\//, ""));
    return r;
  };

  useEffect(() => {
    if (demoAbierta) refrescarPueblo();
  }, [demoAbierta]);

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

  const guardarPueblo = async () => {
    const n = await fijarUrlNodo(puebloEdit);
    setPuebloPrueba(n ? "Guardado." : "URL inválida.");
    refrescarPueblo();
  };

  const usarAuto = async () => {
    await limpiarUrlNodo();
    setPuebloPrueba("Auto (Metro / env).");
    refrescarPueblo();
  };

  const probar = async () => {
    setProbando(true);
    setPuebloPrueba("Probando…");
    if (puebloEdit.trim()) await fijarUrlNodo(puebloEdit);
    const r = await probarNodo();
    setPuebloPrueba(r.ok ? `Conecta · ${r.detalle}` : `No llega · ${r.detalle}`);
    refrescarPueblo();
    setProbando(false);
  };

  const casoActivo = USUARIOS.find(u => u.correo === correo.trim().toLowerCase());
  const modoActivo = MODOS.find(e => e.id === modoSel) ?? MODOS[0];
  const demoResumen = [
    etiquetaModo(modoActivo),
    casoActivo ? (CASO_CORTO[casoActivo.id] ?? casoActivo.id) : "correo libre",
    puebloInfo.url ? etiquetaOrigen(puebloInfo.origen) : "sin pueblo",
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
              WiFi, modelo y nodo del pueblo. La IP se toma de Metro en LAN; si cambias de red, no hay que reeditar código.
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

            <Text style={s.demoEtiqueta}>Pueblo · LAN :8788</Text>
            <View style={s.puebloCaja}>
              <Text style={s.puebloOrigen}>
                Ahora: {puebloInfo.url || "—"} · {etiquetaOrigen(puebloInfo.origen)}
              </Text>
              <TextInput
                value={puebloEdit}
                onChangeText={setPuebloEdit}
                placeholder="192.168.x.x o host:8788"
                placeholderTextColor={COLOR.apagado}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel="URL o IP del nodo del pueblo"
                style={s.puebloCampo}
              />
              <View style={s.puebloAcciones}>
                <Pressable
                  onPress={() => { void guardarPueblo(); }}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.puebloBtn, pressed && s.press]}
                >
                  <Text style={s.puebloBtnTexto}>Guardar</Text>
                </Pressable>
                <Pressable
                  onPress={() => { void usarAuto(); }}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.puebloBtn, pressed && s.press]}
                >
                  <Text style={s.puebloBtnTexto}>Auto</Text>
                </Pressable>
                <Pressable
                  onPress={() => { void probar(); }}
                  disabled={probando}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.puebloBtn, s.puebloBtnFuerte, pressed && s.press]}
                >
                  <Text style={[s.puebloBtnTexto, s.puebloBtnTextoFuerte]}>
                    {probando ? "…" : "Probar"}
                  </Text>
                </Pressable>
              </View>
              {puebloPrueba ? <Text style={s.puebloPrueba}>{puebloPrueba}</Text> : null}
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

  puebloCaja: { paddingHorizontal: 14, gap: 8, marginBottom: 8 },
  puebloOrigen: { fontSize: 12, lineHeight: 16, color: COLOR.gris },
  puebloCampo: {
    borderWidth: 1, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
    paddingHorizontal: 12, minHeight: 44,
    fontSize: 14, fontWeight: "600", color: COLOR.tinta,
  },
  puebloAcciones: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  puebloBtn: {
    borderWidth: 1, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
    paddingHorizontal: 12, minHeight: 40, justifyContent: "center",
  },
  puebloBtnFuerte: { backgroundColor: COLOR.tinta, borderColor: COLOR.tinta },
  puebloBtnTexto: { fontSize: 12.5, fontWeight: "700", color: COLOR.tinta },
  puebloBtnTextoFuerte: { color: COLOR.fondo },
  puebloPrueba: { fontSize: 12, lineHeight: 16, color: COLOR.gris },

  puesto: { backgroundColor: COLOR.hundido, borderColor: COLOR.tinta },
  press: { opacity: 0.85 },

  lista: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14 },
  correo: {
    borderWidth: 1, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
    paddingHorizontal: 10, minHeight: 40, justifyContent: "center",
  },
  correoTexto: { fontSize: 12.5, fontWeight: "700", color: COLOR.tinta },
});
