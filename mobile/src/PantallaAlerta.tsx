/**
 * Pantalla del caso: qué se detectó y qué hacer.
 *
 * Las señales las deciden las reglas de `core/reglas.ts`, no el modelo
 * (`ADR-005`). Esta pantalla muestra el resultado de esas reglas tal cual, con
 * su fuente citada. El modelo entra después, para redactar el mensaje en
 * español sencillo, y no puede cambiar ni el umbral ni la ruta.
 */
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales, type Senal } from "./core/reglas";

const COLOR = {
  Inmediata: "#A2402F",
  Prioritaria: "#B77812",
  Rutinaria: "#0E6E6C",
} as const;

const QUE_HACER = {
  emergencia: "Anda ya",
  autocuidado: "Hazlo ahora",
  consulta: "Consulta",
  examen: "Examen",
  examen_y_consulta: "Examen y consulta",
} as const;

const DISCLAIMER =
  "Esto es orientación automática y local, no un diagnóstico. Confirma con un profesional de salud.";

function Tarjeta({ senal }: { senal: Senal }) {
  const c = COLOR[senal.urgencia];
  const r = senal.ruta;
  return (
    <View style={[s.tarjeta, { borderLeftColor: c }]}>
      <View style={s.cabecera}>
        <Text style={[s.urgencia, { color: c }]}>{senal.urgencia}</Text>
        <Text style={s.tipoRuta}>{QUE_HACER[r.tipo]}</Text>
      </View>

      <Text style={s.descripcion}>{senal.descripcion}</Text>

      {r.ahora ? (
        <View style={[s.ahora, { backgroundColor: c + "18" }]}>
          <Text style={[s.ahoraTexto, { color: c }]}>{r.ahora}</Text>
        </View>
      ) : null}

      <View style={s.datos}>
        {r.examen ? <Dato k="Examen" v={r.examen} /> : null}
        {senal.costo ? (
          <Dato k="Costo" v={`${senal.costo.min_usd} a ${senal.costo.max_usd} USD, aproximado`} />
        ) : null}
        <Dato k="Dónde" v={r.donde} />
        <Dato k="Quién" v={r.especialista} />
      </View>

      {r.vigilar ? (
        <Text style={s.vigilar}>
          <Text style={s.vigilarK}>Ve de inmediato si aparece: </Text>{r.vigilar}
        </Text>
      ) : null}

      <Text style={s.fuente}>{senal.fuente}</Text>
    </View>
  );
}

const Dato = ({ k, v }: { k: string; v: string }) => (
  <View style={s.dato}>
    <Text style={s.datoK}>{k}</Text>
    <Text style={s.datoV}>{v}</Text>
  </View>
);

export default function PantallaAlerta({
  usuario, onVolver,
}: { usuario: Usuario; onVolver: () => void }) {
  const orden = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 } as const;
  const senales = detectarSenales(usuario.mediciones)
    .sort((a, b) => orden[a.urgencia] - orden[b.urgencia]);

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Pressable onPress={onVolver} accessibilityRole="button" style={s.volver}>
          <Text style={s.volverTexto}>Volver a los casos</Text>
        </Pressable>

        <Text style={s.nombre}>{usuario.nombre}</Text>
        <Text style={s.meta}>
          {usuario.sexo === "mujer" ? "Mujer" : "Hombre"}, {usuario.edad} años ·{" "}
          {usuario.mediciones.length} mediciones
        </Text>

        {senales.length === 0 ? (
          <View style={s.sano}>
            <Text style={s.sanoTitulo}>Nada fuera de rango</Text>
            <Text style={s.sanoTexto}>
              Todas las mediciones están dentro de los rangos de referencia. No hay nada que
              hacer hoy. Sigue midiéndote como siempre.
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.cuenta}>
              {senales.length} {senales.length === 1 ? "señal detectada" : "señales detectadas"}
            </Text>
            {senales.map(x => <Tarjeta key={x.codigo} senal={x} />)}
          </>
        )}

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  volver: { marginBottom: 20 },
  volverTexto: { fontSize: 14, color: "#0E6E6C", fontWeight: "600" },
  nombre: { fontSize: 24, fontWeight: "700", color: "#0F1512" },
  meta: { fontSize: 13, color: "#818C87", marginTop: 3, marginBottom: 22 },
  cuenta: { fontSize: 13, color: "#4E5A55", marginBottom: 12, fontWeight: "600" },

  sano: {
    backgroundColor: "#DCEBEA", borderWidth: 1, borderColor: "#0E6E6C",
    borderRadius: 4, padding: 20,
  },
  sanoTitulo: { fontSize: 17, fontWeight: "700", color: "#0E6E6C", marginBottom: 8 },
  sanoTexto: { fontSize: 14, lineHeight: 21, color: "#2F4746" },

  tarjeta: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D3DAD6",
    borderLeftWidth: 4, borderRadius: 4, padding: 16, marginBottom: 12,
  },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  urgencia: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  tipoRuta: {
    fontSize: 11, color: "#4E5A55", backgroundColor: "#EAEEEB",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, overflow: "hidden",
  },
  descripcion: { fontSize: 15, lineHeight: 22, color: "#0F1512" },
  ahora: { marginTop: 12, padding: 12, borderRadius: 3 },
  ahoraTexto: { fontSize: 14.5, fontWeight: "700", lineHeight: 20 },
  datos: { marginTop: 14, gap: 8 },
  dato: { flexDirection: "row", gap: 10 },
  datoK: { fontSize: 12.5, color: "#818C87", width: 62 },
  datoV: { fontSize: 13.5, color: "#0F1512", flex: 1, lineHeight: 19 },
  vigilar: {
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3DED9",
    fontSize: 13, lineHeight: 19, color: "#A2402F",
  },
  vigilarK: { fontWeight: "700" },
  fuente: {
    marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#EAEEEB",
    fontSize: 11.5, lineHeight: 17, color: "#818C87", fontStyle: "italic",
  },
  disclaimer: {
    marginTop: 26, padding: 14, backgroundColor: "#EAEEEB", borderRadius: 3,
    fontSize: 12.5, lineHeight: 19, color: "#4E5A55",
  },
});
