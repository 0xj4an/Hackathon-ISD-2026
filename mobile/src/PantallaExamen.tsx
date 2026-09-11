/**
 * Examen de laboratorio: foto → OCR → MedPsy+LoRA → clasificar().
 * Si hay hallazgos fuera de rango, se puede pedir crédito.
 */
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Share } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { Usuario } from "./usuarios";
import { MARCADORES, clasificar, buscarMarcador, type LecturaLab } from "./core/marcadores";
import { armarPaqueteDesdeLab, mensajeCredito } from "./core/paquete";
import { leerExamenFoto } from "./leerExamen";
import { LORA_LAB_VERSION } from "./lora";
import { fichaModo, saltarMedPsyLocal } from "./modo";
import PantallaViaMed from "./PantallaViaMed";
import { recordError } from "./perf/logger";
import {
  Pantalla, Encabezado, BarraVeredicto, Veredicto, Franja, Boton, Etiqueta, Pie, DetalleTecnico,
} from "./ui/componentes";
import { COLOR, COLOR_URGENCIA, VERBO_URGENCIA, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const SIN_PERMISO = "Sin permiso de cámara no podemos leer el examen. Actívalo y vuelve a intentar.";
const FALLO_CAMARA = "No se pudo abrir la cámara. Intenta otra vez.";
const FALLO_ARCHIVO = "No se pudo abrir el archivo. Prueba con una foto JPG o PNG.";
const NO_IMAGEN = "Por ahora solo fotos (JPG o PNG). Si es un PDF, sácale una foto.";
const NADA = "Escribe al menos un valor, el que aparezca en tu examen.";

/** JPEG compatible: el OCR de QVAC no abre HEIC por defecto en iOS. */
const CAPTURA: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
  exif: false,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const ORDEN = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 } as const;

export default function PantallaExamen({
  usuario, onVolver, onPedirCredito,
}: {
  usuario: Usuario;
  onVolver: () => void;
  onPedirCredito?: (costoMin: number, costoMax: number) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [lecturas, setLecturas] = useState<LecturaLab[] | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [mostrandoVia, setMostrandoVia] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [conLora, setConLora] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [diagnostico, setDiagnostico] = useState("");

  const fallar = (mensaje: string, detalle = "") => {
    setError(mensaje);
    setDiagnostico(detalle);
  };

  const enviarDetalle = () => {
    if (!diagnostico) return;
    void Share.share({ message: diagnostico, title: "Error examen Ina Igar" }).catch(err => {
      const msg = err instanceof Error ? err.message : String(err);
      if (/dismiss|cancel/i.test(msg)) return;
      recordError("examen.share", err);
    });
  };

  const leerUri = async (uri: string) => {
    setMostrandoVia(true);
    setLeyendo(true);
    setProgreso("Preparando…");
    try {
      const r = await leerExamenFoto(uri, usuario.sexo, p => {
        setProgreso(p.detalle + (p.pct != null ? ` · ${p.pct}%` : ""));
      });
      if (!r.ok) fallar(r.error, r.diagnostico ?? "");
      else {
        setConLora(r.lora);
        setLecturas(r.lecturas);
      }
    } finally {
      setLeyendo(false);
      setProgreso("");
    }
  };

  const tomarFoto = async () => {
    if (leyendo) return;
    fallar("");
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return fallar(SIN_PERMISO);
      const foto = await ImagePicker.launchCameraAsync(CAPTURA);
      if (foto.canceled || !foto.assets[0]?.uri) return;
      await leerUri(foto.assets[0].uri);
    } catch {
      setLeyendo(false);
      setProgreso("");
      fallar(FALLO_CAMARA);
    }
  };

  const subirArchivo = async () => {
    if (leyendo) return;
    fallar("");
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (pick.canceled || !pick.assets[0]) return;
      const asset = pick.assets[0];
      const mime = (asset.mimeType ?? "").toLowerCase();
      if (mime && !mime.startsWith("image/")) {
        fallar(NO_IMAGEN);
        return;
      }
      await leerUri(asset.uri);
    } catch (err) {
      recordError("examen.documentPicker", err);
      try {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
          fallar("Sin permiso para leer tus archivos o la galería. Actívalo y vuelve a intentar.");
          return;
        }
        const galeria = await ImagePicker.launchImageLibraryAsync(CAPTURA);
        if (galeria.canceled || !galeria.assets[0]?.uri) return;
        await leerUri(galeria.assets[0].uri);
      } catch {
        setLeyendo(false);
        setProgreso("");
        fallar(FALLO_ARCHIVO);
      }
    }
  };

  const leer = () => {
    const salida: LecturaLab[] = [];
    for (const m of MARCADORES) {
      const crudo = (valores[m.codigo] ?? "").replace(",", ".").trim();
      if (!crudo) continue;
      const valor = Number(crudo);
      if (!Number.isFinite(valor)) continue;
      salida.push(clasificar(m, valor, usuario.sexo));
    }
    if (salida.length === 0) return fallar(NADA);
    fallar("");
    setConLora(null);
    setLecturas(salida.sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]));
  };

  if (leyendo || mostrandoVia) {
    return (
      <PantallaViaMed
        onSalir={onVolver}
        extra={progreso || "Leyendo el examen"}
        activo={leyendo}
        onListo={() => setMostrandoVia(false)}
        lora={LORA_LAB_VERSION}
      />
    );
  }

  if (lecturas) {
    const peor = lecturas[0].urgencia;
    const fuera = lecturas.filter(l => l.hallazgo !== "dentro de rango");
    const paquete = armarPaqueteDesdeLab(lecturas);
    return (
      <Pantalla>
        <Encabezado meta="Volver" onVolver={onVolver} />
        <Franja color={fichaModo().color} titulo={fichaModo().titulo} texto={fichaModo().franja} />

        {fuera.length === 0 ? (
          <Veredicto
            color={COLOR.rutinaria}
            palabra="Todo en rango"
            detalle={`Los ${lecturas.length} valores están dentro de lo esperado.`}
            simbolo="listo"
          />
        ) : (
          <Veredicto
            color={COLOR_URGENCIA[peor]}
            palabra={VERBO_URGENCIA[peor]}
            detalle={`${fuera.length} de ${lecturas.length} ${fuera.length === 1 ? "valor está fuera" : "valores están fuera"} de rango.`}
            simbolo="alerta"
          />
        )}

        {conLora ? (
          <Franja
            color={COLOR.tinta}
            titulo={`MedPsy + LoRA ${conLora}`}
            texto="Fine-tuning de laboratorio. Los marcadores salen del LoRA. Rangos y urgencia los decide el catálogo, no el modelo."
          />
        ) : null}

        <View style={s.resultados}>
          {lecturas.map(l => {
            const dentro = l.hallazgo === "dentro de rango";
            const color = dentro ? COLOR.gris : COLOR_URGENCIA[l.urgencia];
            const m = buscarMarcador(l.marcador);
            return (
              <View key={l.marcador} style={s.lectura}>
                <View style={[s.borde, { backgroundColor: color }]} />
                <View style={s.lecturaTextos}>
                  <Text style={s.marcador}>{l.marcador}</Text>
                  <Text style={s.medida}>
                    <Text style={[s.medidaValor, { color }]}>{l.valor}</Text> {l.unidad}
                    <Text style={s.rango}>   rango {l.rango}</Text>
                  </Text>
                  <Text style={[s.hallazgo, { color }]}>{l.hallazgo}</Text>
                  <Text style={s.paso}>{l.siguiente_paso}</Text>
                  {m ? <Text style={s.fuente}>{m.fuente}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        {paquete && onPedirCredito ? (
          <>
            <Text style={s.credito}>{mensajeCredito(paquete)}</Text>
            <Boton
              texto="Pedir un crédito de salud"
              tono="prioritaria"
              onPress={() => onPedirCredito(paquete.total_min, paquete.total_max)}
            />
          </>
        ) : null}

        <Boton
          texto="Leer otro examen"
          tono="borde"
          onPress={() => { setLecturas(null); setConLora(null); fallar(""); }}
        />

        <Pie>
          {conLora
            ? `Marcadores: MedPsy + LoRA ${conLora} (fine-tuning). Rangos y urgencia: catálogo, cada uno con su fuente. No es un diagnóstico.`
            : "Los rangos salen del catálogo de marcadores, cada uno con su fuente. Esto es orientación automática y local, no un diagnóstico."}
        </Pie>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <Franja color={fichaModo().color} titulo={fichaModo().titulo} texto={fichaModo().franja} />

      <BarraVeredicto color={COLOR.prioritaria} texto="Tu examen" />

      <View style={s.arriba}>
        <Text style={s.titular}>¿Te hiciste{"\n"}un examen?</Text>
        <Text style={s.parrafo}>
          {saltarMedPsyLocal()
            ? "Foto o archivo: OCR aquí. Este teléfono no puede correr MedPsy ni el LoRA: se delega al nodo. La imagen no sale."
            : `Tráelo en foto o archivo. OCR y MedPsy + LoRA ${LORA_LAB_VERSION} en este teléfono.`}
        </Text>
      </View>

      {error ? <Franja color={COLOR.inmediata} titulo="No se pudo" texto={error} /> : null}
      {diagnostico ? <DetalleTecnico texto={diagnostico} onEnviar={enviarDetalle} /> : null}

      <Boton
        texto="Tomar foto del examen"
        onPress={() => { void tomarFoto(); }}
      />
      <Boton
        texto="Subir archivo"
        tono="borde"
        onPress={() => { void subirArchivo(); }}
      />

      <Etiqueta>O escribe los valores</Etiqueta>
      <View style={s.lista}>
        {MARCADORES.map((m, i) => (
          <View key={m.codigo} style={[s.fila, i === MARCADORES.length - 1 ? null : s.separador]}>
            <View style={s.filaTextos}>
              <Text style={s.nombre}>{m.nombre}</Text>
              <Text style={s.unidad}>{m.unidad}</Text>
            </View>
            <TextInput
              value={valores[m.codigo] ?? ""}
              onChangeText={texto => {
                setValores(previos => ({ ...previos, [m.codigo]: texto }));
                if (error) fallar("");
              }}
              placeholder="--"
              placeholderTextColor="#9A9A9A"
              keyboardType="decimal-pad"
              inputMode="decimal"
              editable={!leyendo}
              accessibilityLabel={`Valor de ${m.nombre} en ${m.unidad}`}
              style={s.campo}
            />
          </View>
        ))}
      </View>

      <Boton
        texto="Ver qué dicen"
        onPress={() => { if (!leyendo) leer(); }}
      />

      <Pie>
        Solo escribe los que aparezcan en tu papel. Los que dejes vacíos no se inventan.
        {saltarMedPsyLocal()
          ? "OCR aquí. Sin capacidad para MedPsy: se delega al nodo."
          : `Foto o archivo usan MedPsy + LoRA (${LORA_LAB_VERSION}); escribir a mano no.`}
      </Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 16, gap: 10 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },
  credito: {
    fontSize: 15, lineHeight: 21, fontWeight: "600", color: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde, marginTop: 18, marginBottom: 8,
  },

  lista: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  fila: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 10,
  },
  filaTextos: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: "700", color: COLOR.tinta },
  unidad: { ...TIPO.denso, color: COLOR.gris },
  campo: {
    width: 104, minHeight: TOQUE, paddingHorizontal: 12,
    borderWidth: 3, borderColor: COLOR.tinta, backgroundColor: COLOR.fondo,
    ...DISPLAY, fontSize: 20, color: COLOR.tinta, textAlign: "right",
  },

  resultados: { borderTopWidth: 3, borderTopColor: COLOR.tinta, marginTop: 22 },
  lectura: { flexDirection: "row", gap: 14, paddingRight: ESPACIO.borde, paddingVertical: 16 },
  borde: { width: 6 },
  lecturaTextos: { flex: 1, gap: 3 },
  marcador: { ...TIPO.etiqueta, fontSize: 12, color: COLOR.gris },
  medida: { fontSize: 15, fontWeight: "700", color: COLOR.tinta },
  medidaValor: { ...DISPLAY, fontSize: 30 },
  rango: { ...TIPO.denso, color: COLOR.gris },
  hallazgo: { fontSize: 17, fontWeight: "900", marginTop: 2 },
  paso: { fontSize: 14.5, lineHeight: 20, color: COLOR.tinta, marginTop: 2 },
  fuente: { ...TIPO.pie, color: COLOR.gris, marginTop: 6 },
});
