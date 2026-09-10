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
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { BarraVeredicto, Boton, Encabezado, Etiqueta, Franja, Pantalla, Pie } from "./ui/componentes";
import Pictograma from "./ui/Pictograma";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

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
  monto, onListo, onVolver,
}: {
  monto: number;
  /**
   * Se llama cuando estan los obligatorios. Hoy pasa solo si se fotografio el
   * extracto, porque de la foto no sale nada mas: la extraccion es del bloque
   * siguiente. Cuando exista, aqui van los campos leidos y su confianza, y
   * `PantallaDatos` los recibe ya rellenos en vez de vacios.
   */
  onListo: (conExtracto: boolean) => void;
  onVolver: () => void;
}) {
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
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <BarraVeredicto color={COLOR.prioritaria} texto="Tus documentos" derecha={`B/. ${monto}`} />

      <View style={s.arriba}>
        <Text style={s.titular}>Se leen{"\n"}aquí dentro</Text>
        <Text style={s.parrafo}>
          Hacen falta dos documentos, y un tercero que es opcional. Se fotografían con este
          teléfono y no viajan a ningún lado.
        </Text>
      </View>

      {error ? <Franja color={COLOR.inmediata} titulo="No se pudo" texto={error} /> : null}

      <View style={s.lista}>
        {DOCUMENTOS.map((d, i) => {
          const listo = !!tomados[d.clave];
          return (
            <View key={d.clave} style={[s.fila, i === DOCUMENTOS.length - 1 ? null : s.separador]}>
              <Pictograma
                simbolo={listo ? "listo" : "documento"}
                tamano={30}
                color={listo ? COLOR.rutinaria : COLOR.tinta}
              />
              <View style={s.textos}>
                <View style={s.cabecera}>
                  <Text style={s.nombre}>{d.nombre}</Text>
                  {d.obligatorio ? null : <Text style={s.opcional}>Opcional</Text>}
                </View>
                <Text style={s.ayuda}>{d.ayuda}</Text>

                <Pressable
                  onPress={() => tomarFoto(d.clave)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    listo ? `Repetir la foto de ${d.nombre}` : `Tomar la foto de ${d.nombre}`
                  }
                  style={({ pressed }) => [s.accion, listo && s.accionListo, pressed && s.accionPress]}
                >
                  <Text style={[s.accionTexto, listo && s.accionTextoListo]}>
                    {listo ? "Foto tomada. Repetir" : "Tomar foto"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.privacidad}>
        <Text style={s.privacidadTitulo}>Qué pasa con las fotos</Text>
        <Text style={s.privacidadTexto}>
          Se leen en este teléfono para sacar los datos escritos y se borran. Ninguna imagen viaja
          al banco.
        </Text>
      </View>

      <Etiqueta>Estado</Etiqueta>
      <Text style={s.estado}>
        {faltan > 0
          ? `Faltan ${faltan} ${faltan === 1 ? "documento" : "documentos"} para poder enviar.`
          : "Ya están los obligatorios."}
      </Text>

      <Boton
        texto={faltan > 0 ? "Faltan documentos" : "Continuar"}
        onPress={() => { if (faltan === 0) onListo(!!tomados.extracto); }}
        tono={faltan > 0 ? "borde" : "tinta"}
        etiqueta="Continuar a confirmar tus datos"
      />

      <Pie>
        La lectura en el dispositivo y el envío al banco se conectan en el siguiente bloque. Hasta
        entonces la pantalla dice que el documento está tomado, no leído, y los campos se escriben
        a mano en la pantalla siguiente.
      </Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 16, gap: 10 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  lista: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  fila: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 15,
  },
  textos: { flex: 1, gap: 3 },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  nombre: { fontSize: 17, fontWeight: "700", color: COLOR.tinta, flex: 1 },
  opcional: { ...TIPO.etiqueta, fontSize: 11, color: COLOR.gris },
  ayuda: { fontSize: 13.5, lineHeight: 18, color: COLOR.gris },

  accion: {
    minHeight: TOQUE, marginTop: 10, paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: COLOR.tinta,
  },
  accionListo: { borderColor: COLOR.rutinaria },
  accionPress: { opacity: 0.8 },
  accionTexto: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.4, color: COLOR.tinta },
  accionTextoListo: { color: COLOR.rutinaria },

  privacidad: {
    backgroundColor: COLOR.rutinaria, marginTop: 22,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 15, gap: 4,
  },
  privacidadTitulo: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.6, color: COLOR.sobreColor },
  privacidadTexto: { fontSize: 13.5, lineHeight: 19, color: COLOR.sobreColor },

  estado: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: COLOR.tinta, paddingHorizontal: ESPACIO.borde },
});
