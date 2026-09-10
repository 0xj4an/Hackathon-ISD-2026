/**
 * De dónde salen tus mediciones: el paso entre entrar y que la app revise.
 *
 * En producción esto sería el permiso real de Apple Health o de Google Health.
 * Hoy las mediciones salen del JSON sintético del caso. La pantalla se comporta
 * como la de verdad: se elige la fuente, se toca conectar, y se ve leer.
 *
 * Lo que se muestra al terminar es el contenido leído: qué variables, cuántas
 * lecturas de cada una y en qué meses hay dato. Nada de eso está escrito a mano.
 */
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { Usuario } from "./usuarios";
import {
  NOMBRE_VARIABLE, fraseLecturas, fraseMeses, resumenHistorial,
} from "./historial";
import { Pantalla, Encabezado, BarraVeredicto, Veredicto, Franja, Boton, Pie, Etiqueta } from "./ui/componentes";
import Pictograma from "./ui/Pictograma";
import { COLOR, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const RITMO_MS = 480;

type Fuente = {
  id: "apple" | "google";
  nombre: string;
  conectar: string;
  detalle: string;
};

const FUENTES: Fuente[] = [
  {
    id: "apple",
    nombre: "Apple Health",
    conectar: "Conectarse a Apple Health",
    detalle: "El historial de salud de este iPhone",
  },
  {
    id: "google",
    nombre: "Google Health",
    conectar: "Conectarse a Google Health",
    detalle: "El historial de salud de este Android",
  },
];

type Estado = "elegir" | "leyendo" | "listo";

const fuenteDelTelefono = () =>
  FUENTES.find(f => (f.id === "apple") === (Platform.OS === "ios")) ?? FUENTES[0];

export default function PantallaSalud({
  usuario, onListo, onVolver,
}: { usuario: Usuario; onListo: () => void; onVolver: () => void }) {
  const [estado, setEstado] = useState<Estado>("elegir");
  const [elegida, setElegida] = useState<Fuente>(fuenteDelTelefono);
  const [hechas, setHechas] = useState(0);

  const resumen = useMemo(() => resumenHistorial(usuario.mediciones), [usuario.mediciones]);

  const pasos = useMemo(() => [
    { clave: "fuente", titulo: `Estamos leyendo datos de ${elegida.nombre}`, detalle: elegida.detalle },
    ...resumen.porVariable.map(v => ({
      clave: v.tipo,
      titulo: `Estamos leyendo ${NOMBRE_VARIABLE[v.tipo] ?? v.tipo}`,
      detalle: `${v.lecturas} ${v.lecturas === 1 ? "lectura" : "lecturas"}`,
    })),
  ], [elegida, resumen.porVariable]);

  useEffect(() => {
    if (estado !== "leyendo") return;
    const n = pasos.length;
    const relojes = Array.from({ length: n }, (_, i) =>
      setTimeout(() => setHechas(i + 1), RITMO_MS * (i + 1)),
    );
    const fin = setTimeout(() => setEstado("listo"), RITMO_MS * (n + 0.8));
    return () => {
      relojes.forEach(clearTimeout);
      clearTimeout(fin);
    };
  }, [estado, usuario.id, pasos.length]);

  if (estado === "listo") {
    return (
      <Pantalla>
        <Encabezado meta="Salir" onVolver={onVolver} />
        <Veredicto
          color={COLOR.rutinaria}
          antetitulo="Conectado"
          palabra={`${elegida.nombre} está listo`}
          mayusculas={false}
          simbolo="listo"
        />

        <Hecho etiqueta="Lecturas" texto={fraseLecturas(resumen)} />
        <Hecho etiqueta="Meses" texto={fraseMeses(resumen)} ultima />

        <Etiqueta>Variables</Etiqueta>
        <View style={s.lista}>
          {resumen.porVariable.map((v, i) => (
            <View key={v.tipo} style={[s.fila, i === resumen.porVariable.length - 1 ? null : s.separador]}>
              <Pictograma simbolo="listo" tamano={20} color={COLOR.rutinaria} />
              <Text style={s.filaNombre}>{capitalizar(NOMBRE_VARIABLE[v.tipo] ?? v.tipo)}</Text>
              <Text style={s.filaCuenta}>
                {v.lecturas} {v.lecturas === 1 ? "lectura" : "lecturas"}
              </Text>
            </View>
          ))}
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

  if (estado === "leyendo") {
    const actual = pasos[Math.min(hechas, pasos.length - 1)];
    const pct = Math.round((hechas / Math.max(1, pasos.length)) * 100);
    const varsHechas = Math.max(0, hechas - 1);
    return (
      <Pantalla scroll={false}>
        <Encabezado />
        <View style={s.cuerpoFijo}>
          <Text style={s.leyendoTitular} accessibilityLiveRegion="polite">{actual.titulo}</Text>
          <Text style={s.parrafo}>{actual.detalle}</Text>

          <View style={s.barra} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
            <View style={[s.barraLlena, { width: `${pct}%` }]} />
          </View>
          <View style={s.barraTextos}>
            <Text style={s.barraPct}>{pct}%</Text>
            <Text style={s.barraDe}>
              {hechas === 0
                ? `Desde ${elegida.nombre}`
                : `${varsHechas} de ${resumen.variables} variables`}
            </Text>
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
        <Text style={s.titular}>¿Cómo me{"\n"}conecto?</Text>
        <Text style={s.parrafo}>
          Ina Igar lee el historial que este teléfono ya guarda. Elige Apple Health o Google Health y toca conectar.
        </Text>
      </View>

      <View style={s.opciones}>
        {FUENTES.map((f, i) => {
          const puesta = f.id === elegida.id;
          const enEste = (f.id === "apple") === (Platform.OS === "ios");
          return (
            <Pressable
              key={f.id}
              onPress={() => setElegida(f)}
              accessibilityRole="radio"
              accessibilityState={{ selected: puesta }}
              accessibilityLabel={f.conectar}
              style={({ pressed }) => [
                s.opcion,
                i === FUENTES.length - 1 ? null : s.separador,
                pressed && s.opcionPress,
              ]}
            >
              <View style={[s.marca, puesta && s.marcaPuesta]}>
                {puesta ? <View style={s.marcaDentro} /> : null}
              </View>
              <View style={s.opcionTextos}>
                <Text style={s.opcionNombre}>{f.conectar}</Text>
                <Text style={s.opcionDetalle}>{f.detalle}</Text>
              </View>
              {enEste ? <Text style={s.propia}>En este teléfono</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Boton
        texto="Conectar"
        etiqueta={elegida.conectar}
        onPress={() => { setHechas(0); setEstado("leyendo"); }}
      />

      <Pie>Toda la lectura ocurre en este teléfono. Nada viaja a ningún lado.</Pie>
    </Pantalla>
  );
}

function capitalizar(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

const Hecho = ({ etiqueta, texto, ultima }: { etiqueta: string; texto: string; ultima?: boolean }) => (
  <View style={[s.hecho, ultima ? s.hechoUltimo : s.separador]}>
    <Text style={s.hechoEtiqueta}>{etiqueta}</Text>
    <Text style={s.hechoTexto}>{texto}</Text>
  </View>
);

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 18, gap: 10 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  leyendoTitular: { ...DISPLAY, fontSize: 28, lineHeight: 30, letterSpacing: -1, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  opciones: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  opcion: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 16, minHeight: TOQUE + 14,
  },
  opcionPress: { backgroundColor: COLOR.hundido },
  marca: {
    width: 24, height: 24, borderWidth: 3, borderColor: COLOR.separador,
    alignItems: "center", justifyContent: "center",
  },
  marcaPuesta: { borderColor: COLOR.tinta },
  marcaDentro: { width: 10, height: 10, backgroundColor: COLOR.tinta },
  opcionTextos: { flex: 1, gap: 2 },
  opcionNombre: { ...DISPLAY, fontSize: 18, lineHeight: 22, color: COLOR.tinta },
  opcionDetalle: { fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  propia: { ...TIPO.etiqueta, fontSize: 10.5, color: COLOR.rutinaria, maxWidth: 74, textAlign: "right" },

  cuerpoFijo: { flex: 1, paddingHorizontal: ESPACIO.borde, justifyContent: "center", paddingBottom: 30 },

  barra: { height: 14, backgroundColor: COLOR.hundido, marginTop: 30 },
  barraLlena: { height: 14, backgroundColor: COLOR.rutinaria },
  barraTextos: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 10 },
  barraPct: { ...DISPLAY, fontSize: 30, lineHeight: 32, color: COLOR.tinta },
  barraDe: { flex: 1, fontSize: 13.5, lineHeight: 18, color: COLOR.gris },
  aviso: { marginTop: 26, fontSize: 13.5, lineHeight: 19, color: COLOR.gris },

  hecho: { paddingHorizontal: ESPACIO.borde, paddingVertical: 14, gap: 4 },
  hechoUltimo: { borderBottomWidth: 3, borderBottomColor: COLOR.tinta },
  hechoEtiqueta: { ...TIPO.etiqueta, color: COLOR.gris },
  hechoTexto: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: COLOR.tinta },

  lista: { paddingTop: 4 },
  fila: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 11,
  },
  filaNombre: { flex: 1, fontSize: 15, fontWeight: "600", color: COLOR.tinta },
  filaCuenta: { fontSize: 13.5, color: COLOR.gris },
});
