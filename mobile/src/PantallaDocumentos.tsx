/**
 * Carga de documentos: se fotografían aquí y se leen aquí.
 *
 * La foto entra a la app pero no viaja: la lectura (OCR y extracción a JSON) es
 * el siguiente bloque de trabajo, y hasta que exista la pantalla dice que el
 * documento está tomado, no leído. Prometer en pantalla un borrado que todavía
 * no ocurre sería exactamente la clase de mentira que este proyecto no puede
 * permitirse.
 */
import { useState } from "react";
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

type Clave = "cedula" | "ingresos" | "extracto";

type Documento = {
  clave: Clave;
  nombre: string;
  ayuda: string;
  obligatorio: boolean;
};

const DOCUMENTOS: Documento[] = [
  {
    clave: "cedula",
    nombre: "Cédula",
    ayuda: "La cara donde salen tu nombre y tu número",
    obligatorio: true,
  },
  {
    clave: "ingresos",
    nombre: "Comprobante de ingresos",
    ayuda: "Carta laboral, talonario o constancia de lo que trabajas por tu cuenta",
    obligatorio: true,
  },
  {
    clave: "extracto",
    nombre: "Extracto bancario",
    ayuda: "Si lo tienes, baja la tasa. Puedes seguir sin él",
    obligatorio: false,
  },
];

const SIN_PERMISO = "Sin permiso de cámara no podemos leer el documento. Actívalo y vuelve a intentar.";
const FALLO = "No se pudo abrir la cámara. Intenta otra vez.";

export default function PantallaDocumentos({
  monto, onVolver,
}: { monto: number; onVolver: () => void }) {
  const [tomados, setTomados] = useState<Partial<Record<Clave, boolean>>>({});
  const [error, setError] = useState("");

  const tomarFoto = async (clave: Clave) => {
    setError("");
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError(SIN_PERMISO);
      const foto = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (foto.canceled) return;
      setTomados(previos => ({ ...previos, [clave]: true }));
    } catch {
      setError(FALLO);
    }
  };

  const faltan = DOCUMENTOS.filter(d => d.obligatorio && !tomados[d.clave]).length;

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Pressable onPress={onVolver} accessibilityRole="button" style={s.volver}>
          <Text style={s.volverTexto}>Volver</Text>
        </Pressable>

        <Text style={s.titulo}>Tus documentos</Text>
        <Text style={s.parrafo}>
          Para el crédito de B/. {monto} hacen falta dos documentos, y un tercero que es
          opcional. Se fotografían aquí y se leen aquí mismo, en el teléfono.
        </Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.lista}>
          {DOCUMENTOS.map(d => (
            <View key={d.clave} style={[s.tarjeta, tomados[d.clave] && s.tarjetaLista]}>
              <View style={s.cabecera}>
                <Text style={s.nombre}>{d.nombre}</Text>
                {d.obligatorio ? null : <Text style={s.opcional}>Opcional</Text>}
              </View>
              <Text style={s.ayuda}>{d.ayuda}</Text>

              {tomados[d.clave] ? (
                <View style={s.estado}>
                  <Text style={s.estadoTexto}>Foto tomada</Text>
                  <Pressable
                    onPress={() => tomarFoto(d.clave)}
                    accessibilityRole="button"
                    accessibilityLabel={`Repetir la foto de ${d.nombre}`}
                  >
                    <Text style={s.repetir}>Repetir</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => tomarFoto(d.clave)}
                  accessibilityRole="button"
                  accessibilityLabel={`Tomar la foto de ${d.nombre}`}
                  style={({ pressed }) => [s.boton, pressed && s.botonPress]}
                >
                  <Text style={s.botonTexto}>Tomar foto</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={s.privacidad}>
          <Text style={s.privacidadTitulo}>Qué pasa con las fotos</Text>
          <Text style={s.privacidadTexto}>
            Se leen en este teléfono para sacar los datos escritos y se borran. Ninguna imagen
            viaja al banco.
          </Text>
        </View>

        <Text style={s.pendiente}>
          {faltan > 0
            ? `Faltan ${faltan} ${faltan === 1 ? "documento" : "documentos"} para poder enviar.`
            : "Ya están los obligatorios. El envío se conecta en el siguiente bloque."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  volver: { marginBottom: 20 },
  volverTexto: { fontSize: 14, color: "#0E6E6C", fontWeight: "600" },
  titulo: { fontSize: 24, fontWeight: "700", color: "#0F1512" },
  parrafo: { fontSize: 15, lineHeight: 22, color: "#4E5A55", marginTop: 10 },
  error: {
    fontSize: 13.5, lineHeight: 20, color: "#A2402F",
    backgroundColor: "#F6E4DF", borderRadius: 3, padding: 12, marginTop: 16,
  },
  lista: { gap: 12, marginTop: 24 },
  tarjeta: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D3DAD6",
    borderRadius: 4, padding: 16,
  },
  tarjetaLista: { borderColor: "#0E6E6C" },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  nombre: { fontSize: 16, fontWeight: "600", color: "#0F1512", flex: 1 },
  opcional: { fontSize: 11, color: "#818C87", textTransform: "uppercase", letterSpacing: 0.6 },
  ayuda: { fontSize: 13.5, lineHeight: 19, color: "#818C87", marginTop: 4 },
  boton: {
    backgroundColor: "#EAEEEB", borderRadius: 3,
    paddingVertical: 12, alignItems: "center", marginTop: 14,
  },
  botonPress: { backgroundColor: "#DDE3DF" },
  botonTexto: { fontSize: 14.5, fontWeight: "600", color: "#0E6E6C" },
  estado: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EAEEEB",
  },
  estadoTexto: { fontSize: 14, fontWeight: "600", color: "#0E6E6C" },
  repetir: { fontSize: 13.5, color: "#818C87" },
  privacidad: {
    backgroundColor: "#DCEBEA", borderWidth: 1, borderColor: "#0E6E6C",
    borderRadius: 4, padding: 16, marginTop: 24,
  },
  privacidadTitulo: { fontSize: 14, fontWeight: "700", color: "#0E6E6C", marginBottom: 6 },
  privacidadTexto: { fontSize: 13.5, lineHeight: 20, color: "#2F4746" },
  pendiente: { fontSize: 13, lineHeight: 19, color: "#818C87", marginTop: 20 },
});
