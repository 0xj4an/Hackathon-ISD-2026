/**
 * Las piezas de Señalética. Cada pantalla se arma con estas y no inventa
 * estilos propios: si algo se repite en dos pantallas, vive aquí.
 *
 * Hay dos modos, y son los que sostienen la dirección:
 *
 * - **Modo señal**: `Veredicto` a sangre, `FilaRuta` de 16 px, un `Boton`. Una
 *   sola cosa por pantalla.
 * - **Modo denso**: `BarraVeredicto` en lugar del bloque, `FilaLista` de 13 px,
 *   y `BandaTotal` abajo tomando el relevo como elemento dominante.
 */
import type { ReactNode } from "react";
import {
  SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet,
} from "react-native";
import Pictograma, { type Simbolo } from "./Pictograma";
import { COLOR, TIPO, ESPACIO, TOQUE } from "./tokens";

export function Pantalla({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={s.pantalla}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={s.fijo}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Encabezado({ meta, onVolver }: { meta?: string; onVolver?: () => void }) {
  return (
    <View style={s.encabezado}>
      <Text style={s.marca}>Ina Igar</Text>
      {onVolver ? (
        <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12}>
          <Text style={s.meta}>{meta ?? "Volver"}</Text>
        </Pressable>
      ) : meta ? (
        <Text style={s.meta}>{meta}</Text>
      ) : null}
    </View>
  );
}

/**
 * El bloque de veredicto: color a sangre, una palabra, y debajo qué hacer.
 * Es lo primero que se ve y lo único que hace falta leer si no hay tiempo.
 */
export function Veredicto({
  color, palabra, detalle, simbolo, children,
}: {
  color: string;
  palabra: string;
  detalle?: string;
  simbolo?: Simbolo;
  children?: ReactNode;
}) {
  return (
    <View style={[s.veredicto, { backgroundColor: color }]}>
      {simbolo ? <Pictograma simbolo={simbolo} tamano={54} color={COLOR.sobreColor} fondo={color} /> : null}
      <Text style={s.veredictoPalabra}>{palabra}</Text>
      {detalle ? <Text style={s.veredictoDetalle}>{detalle}</Text> : null}
      {children}
    </View>
  );
}

/** El veredicto encogido, para cuando debajo viene una lista larga. */
export function BarraVeredicto({ color, texto, derecha }: {
  color: string; texto: string; derecha?: string;
}) {
  return (
    <View style={[s.barra, { backgroundColor: color }]}>
      <Text style={s.barraTexto}>{texto}</Text>
      {derecha ? <Text style={s.barraDerecha}>{derecha}</Text> : null}
    </View>
  );
}

/** La cifra medida, enorme, con su unidad al lado. */
export function Cifra({ valor, unidad, nota }: { valor: string; unidad?: string; nota?: string }) {
  return (
    <View style={s.cifraFila}>
      <Text style={s.cifra}>{valor}</Text>
      <View style={s.cifraTextos}>
        {unidad ? <Text style={s.cifraUnidad}>{unidad}</Text> : null}
        {nota ? <Text style={s.cifraNota}>{nota}</Text> : null}
      </View>
    </View>
  );
}

/** Modo señal: una fila de la ruta. Pictograma, etiqueta, y el dato en grande. */
export function FilaRuta({ simbolo, etiqueta, valor, ultima }: {
  simbolo: Simbolo; etiqueta: string; valor: string; ultima?: boolean;
}) {
  return (
    <View style={[s.filaRuta, ultima ? null : s.separador]}>
      <Pictograma simbolo={simbolo} tamano={30} color={COLOR.tinta} />
      <View style={s.filaRutaTextos}>
        <Text style={s.etiqueta}>{etiqueta}</Text>
        <Text style={s.filaRutaValor}>{valor}</Text>
      </View>
    </View>
  );
}

/** Modo denso: una línea del paquete. El punto ámbar marca lo que es estimación. */
export function FilaLista({ concepto, monto, estimado, ultima }: {
  concepto: string; monto: string; estimado?: boolean; ultima?: boolean;
}) {
  return (
    <View style={[s.filaLista, ultima ? null : s.separador]}>
      <View style={s.filaListaIzq}>
        {estimado ? <View style={s.puntoEstimado} /> : null}
        <Text style={s.filaListaConcepto}>{concepto}</Text>
      </View>
      <Text style={s.filaListaMonto}>{monto}</Text>
    </View>
  );
}

/** El total en negro. En modo denso es el elemento dominante de la pantalla. */
export function BandaTotal({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.bandaTotal}>
      <Text style={s.bandaTotalEtiqueta}>{etiqueta}</Text>
      <Text style={s.bandaTotalValor}>{valor}</Text>
    </View>
  );
}

/**
 * Franja de aviso a sangre. Roja para lo que obliga a salir, negra para el
 * estado del envío. Nunca se usa para nada más: si todo grita, nada grita.
 */
export function Franja({ color = COLOR.tinta, simbolo = "alerta", titulo, texto }: {
  color?: string; simbolo?: Simbolo; titulo?: string; texto: string;
}) {
  return (
    <View style={[s.franja, { backgroundColor: color }]}>
      <Pictograma simbolo={simbolo} tamano={24} color={COLOR.sobreColor} fondo={color} />
      <View style={s.franjaTextos}>
        {titulo ? <Text style={s.franjaTitulo}>{titulo}</Text> : null}
        <Text style={[s.franjaTexto, color === COLOR.tinta ? s.franjaTextoApagado : null]}>{texto}</Text>
      </View>
    </View>
  );
}

export function Boton({ texto, onPress, tono = "tinta", etiqueta }: {
  texto: string;
  onPress: () => void;
  tono?: "tinta" | "prioritaria" | "rutinaria" | "borde";
  etiqueta?: string;
}) {
  const borde = tono === "borde";
  const fondo = borde ? COLOR.fondo
    : tono === "prioritaria" ? COLOR.prioritaria
    : tono === "rutinaria" ? COLOR.rutinaria
    : COLOR.tinta;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: fondo },
        borde ? s.botonBorde : null,
        pressed ? s.botonPress : null,
      ]}
    >
      <Text style={[s.botonTexto, borde ? s.botonTextoBorde : null]}>{texto}</Text>
    </Pressable>
  );
}

export const Etiqueta = ({ children }: { children: ReactNode }) => (
  <Text style={s.etiquetaSuelta}>{children}</Text>
);

export const Titulo = ({ children }: { children: ReactNode }) => (
  <Text style={s.titulo}>{children}</Text>
);

/** El pie: fuentes citadas, disclaimers, lo que la app declara sobre sí misma. */
export const Pie = ({ children }: { children: ReactNode }) => (
  <Text style={s.pie}>{children}</Text>
);

/** La leyenda del punto ámbar. Va debajo de cualquier lista con estimaciones. */
export const LeyendaEstimado = () => (
  <View style={s.leyenda}>
    <View style={s.puntoEstimado} />
    <Text style={s.leyendaTexto}>Estimado nuestro: no hay precio publicado que citar.</Text>
  </View>
);

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLOR.fondo },
  scroll: { paddingTop: 20, paddingBottom: 32 },
  fijo: { flex: 1, paddingTop: 20 },

  encabezado: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: ESPACIO.borde, paddingBottom: ESPACIO.entre, gap: 12,
  },
  marca: { ...TIPO.barra, color: COLOR.tinta },
  meta: { fontSize: 12, fontWeight: "600", color: COLOR.gris },

  veredicto: { paddingHorizontal: ESPACIO.borde, paddingTop: 24, paddingBottom: 26, gap: 14 },
  veredictoPalabra: { ...TIPO.veredicto, color: COLOR.sobreColor, textTransform: "uppercase" },
  veredictoDetalle: { ...TIPO.cuerpo, color: COLOR.sobreColor, marginTop: -6 },

  barra: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: ESPACIO.borde, paddingVertical: 9, gap: 14,
  },
  barraTexto: { ...TIPO.barra, fontSize: 12.5, color: COLOR.sobreColor, flexShrink: 1 },
  barraDerecha: { fontSize: 12, fontWeight: "700", color: COLOR.sobreColor },

  cifraFila: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingTop: 20, paddingBottom: 18,
    borderBottomWidth: 3, borderBottomColor: COLOR.tinta,
  },
  cifra: { ...TIPO.cifra, color: COLOR.tinta },
  cifraTextos: { flex: 1, gap: 3 },
  cifraUnidad: { fontSize: 15, fontWeight: "700", color: COLOR.tinta },
  cifraNota: { fontSize: 14, lineHeight: 18, color: COLOR.gris },

  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },

  filaRuta: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 15, minHeight: TOQUE,
  },
  filaRutaTextos: { flex: 1, gap: 2 },
  filaRutaValor: { ...TIPO.cuerpo, color: COLOR.tinta },
  etiqueta: { ...TIPO.etiqueta, color: COLOR.gris },

  filaLista: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 12, paddingHorizontal: ESPACIO.borde, paddingVertical: 8,
  },
  filaListaIzq: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  filaListaConcepto: { ...TIPO.denso, color: COLOR.tinta, flexShrink: 1 },
  filaListaMonto: { ...TIPO.denso, fontSize: 14, color: COLOR.tinta, fontWeight: "900" },
  puntoEstimado: { width: 7, height: 7, backgroundColor: COLOR.prioritaria },

  leyenda: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: ESPACIO.borde, paddingTop: 9,
  },
  leyendaTexto: { fontSize: 11.5, lineHeight: 16, color: COLOR.gris, flex: 1 },

  bandaTotal: {
    backgroundColor: COLOR.tinta, paddingHorizontal: ESPACIO.borde,
    paddingTop: 13, paddingBottom: 15, gap: 3, marginTop: 14,
  },
  bandaTotalEtiqueta: { ...TIPO.etiqueta, fontSize: 11.5, color: COLOR.sobreTinta },
  bandaTotalValor: { ...TIPO.cifraMedia, color: COLOR.sobreColor },

  franja: {
    flexDirection: "row", alignItems: "flex-start", gap: 13,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 14,
  },
  franjaTextos: { flex: 1, gap: 2 },
  franjaTitulo: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.6, color: COLOR.sobreColor },
  franjaTexto: { fontSize: 13.5, lineHeight: 18, color: COLOR.sobreColor },
  franjaTextoApagado: { color: COLOR.sobreTinta },

  boton: {
    minHeight: 62, alignItems: "center", justifyContent: "center",
    marginHorizontal: ESPACIO.borde, marginTop: ESPACIO.entre, paddingHorizontal: 16,
  },
  botonBorde: { borderWidth: 3, borderColor: COLOR.tinta, minHeight: TOQUE },
  botonPress: { opacity: 0.82 },
  botonTexto: { ...TIPO.barra, fontSize: 15, letterSpacing: 0.2, color: COLOR.sobreColor, textAlign: "center" },
  botonTextoBorde: { color: COLOR.tinta },

  etiquetaSuelta: {
    ...TIPO.etiqueta, color: COLOR.gris,
    paddingHorizontal: ESPACIO.borde, marginTop: 22, marginBottom: 8,
  },
  titulo: { ...TIPO.titulo, color: COLOR.tinta, paddingHorizontal: ESPACIO.borde },
  pie: {
    ...TIPO.pie, color: COLOR.gris,
    paddingHorizontal: ESPACIO.borde, marginTop: 12,
  },
});
