/**
 * De dónde salen tus mediciones: el paso entre entrar y que la app revise.
 *
 * En producción esto sería el permiso real de Apple Salud o de Health Connect,
 * que es de donde vendrían las nueve variables de `ADR-008`. Hoy no existe: las
 * mediciones salen de un archivo sintético que Metro empaqueta con el bundle.
 *
 * Esta pantalla simula esa conexión y se comporta como la de verdad, sin
 * declararlo en pantalla. Es una decisión del equipo: en el video la simulación
 * se narra en voz, y una pantalla llena de descargos no deja ver el flujo. Lo
 * que el proyecto sí declara por escrito, que es donde toca, está en el README,
 * en la landing y en `ADR-008`: las mediciones son sintéticas y la conexión con
 * Apple Salud o Health Connect no está construida.
 *
 * Lo que la pantalla afirma sigue siendo cierto: la lectura ocurre en el
 * teléfono y no necesita red. Eso no es simulación, es el producto.
 */
import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { Usuario } from "./usuarios";
import {
  Pantalla, Encabezado, BarraVeredicto, Veredicto, Franja, Boton, Pie,
} from "./ui/componentes";
import Pictograma from "./ui/Pictograma";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

/** Lo que tarda cada paso. Es tiempo de lectura, no de trabajo: no hay trabajo. */
const RITMO_MS = 700;

type Fuente = { id: "apple" | "google"; nombre: string; detalle: string };

const FUENTES: Fuente[] = [
  { id: "apple", nombre: "Salud", detalle: "La app de Apple, en este iPhone" },
  { id: "google", nombre: "Health Connect", detalle: "El almacén de salud de Android" },
];

type Estado = "elegir" | "conectando" | "listo";

export default function PantallaSalud({
  usuario, onListo, onVolver,
}: { usuario: Usuario; onListo: () => void; onVolver: () => void }) {
  const [estado, setEstado] = useState<Estado>("elegir");
  const [fuente, setFuente] = useState<Fuente | null>(null);
  const [hechos, setHechos] = useState(0);

  const total = usuario.mediciones.length;
  const tipos = new Set(usuario.mediciones.map(m => m.tipo)).size;

  const pasos = fuente
    ? [
        `Pidiendo permiso a ${fuente.nombre}`,
        "Leyendo los últimos meses",
        `${total} mediciones de ${tipos} variables`,
      ]
    : [];

  useEffect(() => {
    if (estado !== "conectando") return;
    const relojes = pasos.map((_, i) =>
      setTimeout(() => setHechos(i + 1), RITMO_MS * (i + 1)),
    );
    const fin = setTimeout(() => setEstado("listo"), RITMO_MS * (pasos.length + 1));
    return () => {
      relojes.forEach(clearTimeout);
      clearTimeout(fin);
    };
  }, [estado]);

  const conectar = (f: Fuente) => {
    setFuente(f);
    setHechos(0);
    setEstado("conectando");
  };

  if (estado === "listo" && fuente) {
    return (
      <Pantalla>
        <Encabezado meta="Salir" onVolver={onVolver} />
        <Veredicto
          color={COLOR.rutinaria}
          antetitulo="Conectado"
          palabra={`${fuente.nombre} está listo`}
          mayusculas={false}
          simbolo="listo"
        />

        <View style={s.resumen}>
          <Text style={s.cifra}>{total}</Text>
          <View style={s.resumenTextos}>
            <Text style={s.resumenTitulo}>mediciones leídas</Text>
            <Text style={s.resumenNota}>de {tipos} variables distintas, de los últimos meses</Text>
          </View>
        </View>

        <Franja
          color={COLOR.tinta}
          simbolo="sinSenal"
          titulo="Nada de esto salió del teléfono"
          texto="Leer tus mediciones no necesita red, y esta app no la usa para hacerlo."
        />

        <Boton texto="Revisar mis mediciones" onPress={onListo} />
      </Pantalla>
    );
  }

  if (estado === "conectando" && fuente) {
    return (
      <Pantalla scroll={false}>
        <Encabezado />
        <View style={s.cuerpoFijo}>
          <Text style={s.titular}>Conectando{"\n"}con {fuente.nombre}</Text>

          <View style={s.pasos}>
            {pasos.map((p, i) => {
              const hecho = i < hechos;
              const activo = i === hechos;
              return (
                <View key={p} style={s.paso}>
                  <View style={[s.marcador, activo && s.marcadorActivo, hecho && s.marcadorHecho]} />
                  <Text style={[s.pasoTexto, (hecho || activo) && s.pasoTextoVivo]}>{p}</Text>
                </View>
              );
            })}
          </View>

          <Text style={s.aviso}>
            Todo ocurre en este teléfono. No hace falta señal para leer tus mediciones.
          </Text>
        </View>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado meta="Salir" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.prioritaria} texto="Tus mediciones" />

      <View style={s.arriba}>
        <Text style={s.titular}>¿De dónde{"\n"}las saco?</Text>
        <Text style={s.parrafo}>
          Ina Igar no te pide que escribas nada: lee lo que tu teléfono ya guarda. Elige de dónde.
        </Text>
      </View>

      <View style={s.opciones}>
        {FUENTES.map((f, i) => {
          const propia = (f.id === "apple") === (Platform.OS === "ios");
          return (
            <Pressable
              key={f.id}
              onPress={() => conectar(f)}
              accessibilityRole="button"
              accessibilityLabel={`Conectar con ${f.nombre}`}
              style={({ pressed }) => [
                s.opcion,
                i === FUENTES.length - 1 ? null : s.separador,
                pressed && s.opcionPress,
              ]}
            >
              <Pictograma simbolo="salud" tamano={30} color={COLOR.tinta} />
              <View style={s.opcionTextos}>
                <Text style={s.opcionNombre}>{f.nombre}</Text>
                <Text style={s.opcionDetalle}>{f.detalle}</Text>
              </View>
              {propia ? <Text style={s.recomendado}>En este teléfono</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Pie>Toda la lectura ocurre en este teléfono. Nada viaja a ningún lado.</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 18, gap: 10 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  opciones: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  opcion: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 16, minHeight: TOQUE + 14,
  },
  opcionPress: { backgroundColor: COLOR.hundido },
  opcionTextos: { flex: 1, gap: 2 },
  opcionNombre: { ...DISPLAY, fontSize: 20, lineHeight: 24, color: COLOR.tinta },
  opcionDetalle: { fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  recomendado: { ...TIPO.etiqueta, fontSize: 10.5, color: COLOR.rutinaria, maxWidth: 74, textAlign: "right" },


  cuerpoFijo: { flex: 1, paddingHorizontal: ESPACIO.borde, justifyContent: "center", paddingBottom: 40 },
  pasos: { marginTop: 34, gap: 4 },
  paso: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 11 },
  marcador: {
    width: 14, height: 14, borderWidth: 3, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
  },
  marcadorActivo: { borderColor: COLOR.tinta },
  marcadorHecho: { borderColor: COLOR.rutinaria, backgroundColor: COLOR.rutinaria },
  pasoTexto: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "600", color: COLOR.apagado },
  pasoTextoVivo: { color: COLOR.tinta },
  aviso: { marginTop: 30, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },

  resumen: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingTop: 20, paddingBottom: 18,
    borderBottomWidth: 3, borderBottomColor: COLOR.tinta,
  },
  cifra: { ...TIPO.cifra, fontSize: 46, lineHeight: 42, color: COLOR.tinta },
  resumenTextos: { flex: 1, gap: 2 },
  resumenTitulo: { fontSize: 16, fontWeight: "700", color: COLOR.tinta },
  resumenNota: { fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
});
