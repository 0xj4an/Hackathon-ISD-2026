/**
 * Carga de documentos: foto o archivo, se leen aquí, queda el JSON, se borra la copia.
 *
 * SQLite no entra todavía. El JSON vive en esta pantalla hasta que confirmemos
 * si la cola lo necesita.
 */
import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Pantalla, Encabezado, BarraVeredicto, Franja, Etiqueta, Pie, Boton } from "./ui/componentes";
import Pictograma from "./ui/Pictograma";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";
import { leerDocumento, mensajeLectura, soltarLectores, type ProgresoLectura } from "./leerDocumento";
import type { ClaveDocumento } from "./core/extraccion";
import type { Problema } from "./core/validaciones";
import { CedulaSchema, IngresosSchema, ExtractoSchema } from "./core/schemas";
import type { LecturaCredito } from "./lectura";
import { recordError } from "./perf/logger";

type Documento = {
  clave: ClaveDocumento;
  nombre: string;
  ayuda: string;
  obligatorio: boolean;
};

type EstadoDoc =
  | { fase: "vacio" }
  | { fase: "leyendo"; detalle: string; pct?: number }
  | {
      fase: "listo";
      datos: Record<string, unknown>;
      problemas: Problema[];
      borrada: boolean;
    }
  | { fase: "error"; mensaje: string; crudo?: unknown; textoOcr?: string };

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

const SIN_CAMARA = "Sin permiso de cámara no podemos leer el documento. Actívalo y vuelve a intentar.";
const FALLO_CAMARA = "No se pudo abrir la cámara. Intenta otra vez.";
const FALLO_ARCHIVO = "No se pudo abrir el archivo. Prueba con una foto JPG o PNG.";
const NO_IMAGEN = "Por ahora solo fotos (JPG o PNG). Si es un PDF, sácale una foto.";

/** JPEG compatible: el OCR de QVAC no abre HEIC, que es lo que iOS entrega por defecto. */
const CAPTURA: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.55,
  exif: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

function semilla(lectura?: LecturaCredito): Record<ClaveDocumento, EstadoDoc> {
  if (!lectura) {
    return { cedula: { fase: "vacio" }, ingresos: { fase: "vacio" }, extracto: { fase: "vacio" } };
  }
  const n = 2 + (lectura.extracto ? 1 : 0);
  const listo = (datos: object, i: number): EstadoDoc => ({
    fase: "listo",
    datos: datos as Record<string, unknown>,
    problemas: [],
    borrada: lectura.fotosBorradas >= i,
  });
  return {
    cedula: listo(lectura.cedula, 1),
    ingresos: listo(lectura.ingresos, 2),
    extracto: lectura.extracto ? listo(lectura.extracto, n) : { fase: "vacio" },
  };
}

export default function PantallaDocumentos({
  monto, onVolver, onListo, lecturaInicial,
}: {
  monto: number;
  onVolver: () => void;
  onListo: (lectura: LecturaCredito) => void;
  lecturaInicial?: LecturaCredito;
}) {
  const [estados, setEstados] = useState<Record<ClaveDocumento, EstadoDoc>>(() => semilla(lecturaInicial));
  const [error, setError] = useState("");
  const ocupado = Object.values(estados).some(e => e.fase === "leyendo");

  useEffect(() => {
    return () => {
      void soltarLectores();
    };
  }, []);

  const setEstado = (clave: ClaveDocumento, estado: EstadoDoc) => {
    setEstados(previos => ({ ...previos, [clave]: estado }));
  };

  const marcarProgreso = (clave: ClaveDocumento, p: ProgresoLectura) => {
    setEstado(clave, { fase: "leyendo", detalle: p.detalle, pct: p.pct });
  };

  const procesar = async (clave: ClaveDocumento, uri: string) => {
    setError("");
    setEstado(clave, { fase: "leyendo", detalle: "Preparando la lectura" });
    try {
      const r = await leerDocumento(clave, uri, p => marcarProgreso(clave, p));
      if (r.ok) {
        setEstado(clave, {
          fase: "listo",
          datos: r.datos as Record<string, unknown>,
          problemas: r.problemas,
          borrada: r.borrada,
        });
      } else {
        setEstado(clave, {
          fase: "error",
          mensaje: r.error,
          crudo: r.crudo,
          textoOcr: r.textoOcr,
        });
      }
    } catch (err) {
      recordError("PantallaDocumentos", err);
      setEstado(clave, { fase: "error", mensaje: mensajeLectura(err) });
    }
  };

  const tomarFoto = async (clave: ClaveDocumento) => {
    if (ocupado) return;
    setError("");
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError(SIN_CAMARA);
      const foto = await ImagePicker.launchCameraAsync(CAPTURA);
      if (foto.canceled || !foto.assets[0]?.uri) return;
      await procesar(clave, foto.assets[0].uri);
    } catch {
      setError(FALLO_CAMARA);
    }
  };

  const subirArchivo = async (clave: ClaveDocumento) => {
    if (ocupado) return;
    setError("");
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (pick.canceled || !pick.assets[0]) return;
      const asset = pick.assets[0];
      const mime = (asset.mimeType ?? "").toLowerCase();
      if (mime && !mime.startsWith("image/")) {
        setError(NO_IMAGEN);
        return;
      }
      await procesar(clave, asset.uri);
    } catch (err) {
      recordError("documentPicker", err);
      try {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
          setError("Sin permiso para leer tus archivos o la galería. Actívalo y vuelve a intentar.");
          return;
        }
        const galeria = await ImagePicker.launchImageLibraryAsync(CAPTURA);
        if (galeria.canceled || !galeria.assets[0]?.uri) return;
        await procesar(clave, galeria.assets[0].uri);
      } catch {
        setError(FALLO_ARCHIVO);
      }
    }
  };

  const faltan = DOCUMENTOS.filter(d => d.obligatorio && estados[d.clave].fase !== "listo").length;

  const continuar = () => {
    const ced = estados.cedula;
    const ing = estados.ingresos;
    if (ced.fase !== "listo" || ing.fase !== "listo") return;
    try {
      const cedula = CedulaSchema.parse(ced.datos);
      const ingresos = IngresosSchema.parse(ing.datos);
      const ext = estados.extracto;
      const extracto = ext.fase === "listo" ? ExtractoSchema.parse(ext.datos) : undefined;
      const fotosBorradas = DOCUMENTOS.filter(d => {
        const e = estados[d.clave];
        return e.fase === "listo" && e.borrada;
      }).length;
      onListo({ cedula, ingresos, extracto, fotosBorradas });
    } catch {
      setError("Los datos leídos no cuadran. Repite una foto.");
    }
  };

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <BarraVeredicto color={COLOR.prioritaria} texto="Tus documentos" derecha={`B/. ${monto}`} />

      <View style={s.arriba}>
        <Text style={s.titular}>Se leen{"\n"}aquí dentro</Text>
        <Text style={s.parrafo}>
          Hacen falta dos documentos, y un tercero que es opcional. Toma una foto o
          súbelos desde tus archivos. No viajan a ningún lado.
        </Text>
      </View>

      {error ? <Franja color={COLOR.inmediata} titulo="No se pudo" texto={error} /> : null}

      <View style={s.lista}>
        {DOCUMENTOS.map((d, i) => (
          <FilaDocumento
            key={d.clave}
            doc={d}
            estado={estados[d.clave]}
            bloqueado={ocupado}
            ultima={i === DOCUMENTOS.length - 1}
            onFoto={() => void tomarFoto(d.clave)}
            onArchivo={() => void subirArchivo(d.clave)}
          />
        ))}
      </View>

      <View style={s.privacidad}>
        <Text style={s.privacidadTitulo}>Qué pasa con las fotos</Text>
        <Text style={s.privacidadTexto}>
          Se leen en este teléfono para sacar los datos escritos y se borra la copia.
          Ninguna imagen viaja al banco. Lo que queda es el JSON.
        </Text>
      </View>

      {faltan === 0 ? (
        <Boton
          texto="Ver lo que se leyó"
          tono="rutinaria"
          onPress={continuar}
          etiqueta="Ver los datos leídos y las fotos borradas"
        />
      ) : (
        <>
          <Etiqueta>Estado</Etiqueta>
          <Text style={s.estado}>
            Faltan {faltan} {faltan === 1 ? "documento" : "documentos"} obligatorios.
          </Text>
        </>
      )}

      <Pie>
        Si un dato no cuadra, toma otra foto. Las imágenes no salen de este teléfono.
      </Pie>
    </Pantalla>
  );
}

function FilaDocumento({
  doc, estado, bloqueado, ultima, onFoto, onArchivo,
}: {
  doc: Documento;
  estado: EstadoDoc;
  bloqueado: boolean;
  ultima: boolean;
  onFoto: () => void;
  onArchivo: () => void;
}) {
  const listo = estado.fase === "listo";
  const error = estado.fase === "error";
  const simbolo = listo ? "listo" : error ? "alerta" : "documento";
  const color = listo ? COLOR.rutinaria : error ? COLOR.inmediata : COLOR.tinta;

  return (
    <View style={[s.fila, ultima ? null : s.separador]}>
      <Pictograma simbolo={simbolo} tamano={30} color={color} />
      <View style={s.textos}>
        <View style={s.cabecera}>
          <Text style={s.nombre}>{doc.nombre}</Text>
          {listo && typeof estado.datos.confianza === "number" ? (
            <Text style={s.pct}>{Math.round(estado.datos.confianza * 100)}%</Text>
          ) : doc.obligatorio ? null : (
            <Text style={s.opcional}>Opcional</Text>
          )}
        </View>
        {estado.fase === "leyendo" ? (
          <Text style={s.ayuda}>
            {estado.detalle}{estado.pct != null ? ` · ${estado.pct}%` : ""}
          </Text>
        ) : listo || error ? null : (
          <Text style={s.ayuda}>{doc.ayuda}</Text>
        )}

        {listo ? (
          <ResumenDatos
            clave={doc.clave}
            datos={estado.datos}
            problemas={estado.problemas}
            nota={estado.borrada ? "Copia borrada." : "Leído. No se pudo borrar la copia."}
          />
        ) : null}

        {error ? (
          <>
            <Text style={s.problema}>{estado.mensaje}</Text>
            {estado.crudo && typeof estado.crudo === "object" && !Array.isArray(estado.crudo) ? (
              <ResumenDatos
                clave={doc.clave}
                datos={estado.crudo as Record<string, unknown>}
                nota="Lo que se alcanzó a leer"
              />
            ) : null}
          </>
        ) : null}

        {estado.fase !== "leyendo" ? (
          <View style={s.acciones}>
            <Pressable
              onPress={onFoto}
              disabled={bloqueado}
              accessibilityRole="button"
              accessibilityLabel={`${estado.fase === "vacio" ? "Tomar" : "Repetir"} la foto de ${doc.nombre}`}
              style={({ pressed }) => [
                s.accion, listo && s.accionListo, pressed && s.accionPress, bloqueado && s.accionOff,
              ]}
            >
              <Text style={[s.accionTexto, listo && s.accionTextoListo]}>
                {estado.fase === "vacio" ? "Tomar foto" : "Otra foto"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onArchivo}
              disabled={bloqueado}
              accessibilityRole="button"
              accessibilityLabel={`Subir ${doc.nombre} desde archivos`}
              style={({ pressed }) => [
                s.accion, listo && s.accionListo, pressed && s.accionPress, bloqueado && s.accionOff,
              ]}
            >
              <Text style={[s.accionTexto, listo && s.accionTextoListo]}>
                {estado.fase === "vacio" ? "Subir archivo" : "Otro archivo"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const TIPO_INGRESO: Record<string, string> = {
  asalariado: "Asalariado",
  independiente: "Independiente",
  jubilado: "Jubilado",
  otro: "Otro",
};

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function textoDe(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function dineroDe(v: unknown): string | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? `B/. ${n.toFixed(2)}` : undefined;
}

function fechaDe(v: unknown): string | undefined {
  const t = textoDe(v);
  if (!t) return undefined;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return t;
  const mes = MES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} ${mes} ${m[1]}` : t;
}

function camposDe(clave: ClaveDocumento, datos: Record<string, unknown>): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [];
  const add = (k: string, v: string | undefined) => { if (v) out.push({ k, v }); };

  if (clave === "cedula") {
    add("Nombre", textoDe(datos.nombre));
    add("Cédula", textoDe(datos.numero));
    add("Nacimiento", fechaDe(datos.fecha_nacimiento));
    add("Vence", fechaDe(datos.fecha_expiracion));
  }
  if (clave === "ingresos") {
    add("Actividad", textoDe(datos.empleador_o_actividad));
    add("Ingreso al mes", dineroDe(datos.ingreso_mensual_usd));
    const tipo = textoDe(datos.tipo);
    add("Tipo", tipo ? (TIPO_INGRESO[tipo] ?? tipo) : undefined);
    const meses = typeof datos.antiguedad_meses === "number" ? datos.antiguedad_meses : undefined;
    if (meses != null) {
      add("Antigüedad", meses >= 12 ? `${Math.floor(meses / 12)} años` : `${meses} ${meses === 1 ? "mes" : "meses"}`);
    }
  }
  if (clave === "extracto") {
    add("Banco", textoDe(datos.banco));
    add("Saldo promedio", dineroDe(datos.saldo_promedio_usd));
    const n = typeof datos.meses_cubiertos === "number" ? datos.meses_cubiertos : undefined;
    if (n != null) add("Periodo", n === 1 ? "1 mes" : `${n} meses`);
  }
  return out;
}

function ResumenDatos({
  clave, datos, problemas, nota,
}: {
  clave: ClaveDocumento;
  datos: Record<string, unknown>;
  problemas?: Problema[];
  nota?: string;
}) {
  const campos = camposDe(clave, datos);
  if (campos.length === 0 && !nota && !problemas?.length) return null;
  return (
    <View style={s.resumen}>
      {campos.map(c => (
        <View key={c.k} style={s.dato}>
          <Text style={s.datoK}>{c.k}</Text>
          <Text style={s.datoV}>{c.v}</Text>
        </View>
      ))}
      {problemas?.map(p => (
        <Text key={`${p.campo}:${p.mensaje}`} style={s.aviso}>{p.mensaje}</Text>
      ))}
      {nota ? <Text style={s.ayuda}>{nota}</Text> : null}
    </View>
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
  pct: { ...TIPO.denso, fontWeight: "700", color: COLOR.rutinaria },
  ayuda: { fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  problema: { ...TIPO.denso, color: COLOR.inmediata },
  aviso: { ...TIPO.denso, color: COLOR.prioritaria },
  resumen: { gap: 8, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLOR.separador },
  dato: { gap: 1 },
  datoK: { ...TIPO.etiqueta, fontSize: 11, color: COLOR.gris },
  datoV: { fontSize: 16, fontWeight: "700", color: COLOR.tinta },

  acciones: { flexDirection: "row", gap: 8, marginTop: 10 },
  accion: {
    flex: 1, minHeight: TOQUE, paddingHorizontal: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: COLOR.tinta,
  },
  accionListo: { borderColor: COLOR.rutinaria },
  accionPress: { opacity: 0.8 },
  accionOff: { opacity: 0.45 },
  accionTexto: { ...TIPO.barra, fontSize: 12, letterSpacing: 0.4, color: COLOR.tinta },
  accionTextoListo: { color: COLOR.rutinaria },

  privacidad: {
    backgroundColor: COLOR.rutinaria, marginTop: 22,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 15, gap: 4,
  },
  privacidadTitulo: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.6, color: COLOR.sobreColor },
  privacidadTexto: { fontSize: 13.5, lineHeight: 19, color: COLOR.sobreColor },

  estado: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: COLOR.tinta, paddingHorizontal: ESPACIO.borde },
});
