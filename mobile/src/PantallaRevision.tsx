/**
 * La revisión: lo que pasa entre entrar y ver la alerta.
 *
 * Existe porque el trabajo es invisible y hay que enseñarlo. Sin esta pantalla
 * la app salta del correo a un diagnóstico y parece magia; con ella se ve qué
 * lee, contra qué lo compara y qué encontró, que es lo que sostiene la promesa
 * de que todo ocurre en el teléfono.
 *
 * Los pasos son reales: se corren las reglas y se arma el paquete de costos. El
 * ritmo sí es puesto a mano, para que se alcance a leer. Cuando MedPsy entre a
 * redactar el mensaje, la espera dejará de ser puesta y será la de verdad.
 */
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales } from "./core/reglas";
import { armarPaquete } from "./core/paquete";
import { fraseLecturas, fraseMeses, resumenHistorial, yLista } from "./historial";
import { Pantalla, Encabezado } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, DISPLAY } from "./ui/tokens";

/** Lo que tarda cada paso en pantalla. No es el tiempo de cálculo, es el de lectura. */
const RITMO_MS = 600;

export default function PantallaRevision({
  usuario, onListo,
}: { usuario: Usuario; onListo: () => void }) {
  const [hechos, setHechos] = useState(0);

  const senales = detectarSenales(usuario.mediciones);
  const paquete = armarPaquete(senales);
  const resumen = resumenHistorial(usuario.mediciones);

  const pasos = [
    {
      titulo: "Lo que había en el historial",
      resultado: `${fraseLecturas(resumen)} ${fraseMeses(resumen)}.`,
    },
    {
      titulo: "Comparando con los rangos de referencia",
      resultado: senales.length === 0
        ? "Nada fuera de rango"
        : yLista(senales.map(s => s.titulo)),
    },
    {
      titulo: "Calculando lo que cuesta atenderlo",
      resultado: paquete
        ? `Entre B/. ${paquete.total_min} y B/. ${paquete.total_max}`
        : "No hace falta",
    },
  ];

  useEffect(() => {
    const relojes = pasos.map((_, i) =>
      setTimeout(() => setHechos(i + 1), RITMO_MS * (i + 1)),
    );
    const salida = setTimeout(onListo, RITMO_MS * (pasos.length + 1));
    return () => {
      relojes.forEach(clearTimeout);
      clearTimeout(salida);
    };
  }, []);

  return (
    <Pantalla>
      <Encabezado meta="en este teléfono" />

      <View style={s.cuerpo}>
        <Text style={s.titular}>Revisando{"\n"}tu historial</Text>
        <Text style={s.parrafo}>Todo esto ocurre en este teléfono. Nada se envía a ningún lado.</Text>

        <View style={s.pasos}>
          {pasos.map((p, i) => {
            const hecho = i < hechos;
            const activo = i === hechos;
            return (
              <View key={p.titulo} style={s.paso}>
                <View
                  style={[
                    s.marcador,
                    activo && s.marcadorActivo,
                    hecho && s.marcadorHecho,
                  ]}
                />
                <View style={s.textos}>
                  <Text style={[s.pasoTitulo, (hecho || activo) && s.pasoTituloVivo]}>
                    {p.titulo}
                  </Text>
                  {hecho ? <Text style={s.pasoResultado}>{p.resultado}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cuerpo: { paddingHorizontal: ESPACIO.borde, paddingTop: 12, paddingBottom: 24 },
  titular: { ...DISPLAY, fontSize: 38, lineHeight: 38, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris, marginTop: 10 },

  pasos: { marginTop: 38, gap: 4 },
  paso: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 12 },
  /** Cuadrado, no círculo: en señalética no hay nada redondo salvo un pictograma. */
  marcador: {
    width: 14, height: 14, marginTop: 4,
    borderWidth: 3, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
  },
  marcadorActivo: { borderColor: COLOR.tinta },
  marcadorHecho: { borderColor: COLOR.rutinaria, backgroundColor: COLOR.rutinaria },
  textos: { flex: 1 },
  pasoTitulo: { fontSize: 16, lineHeight: 21, fontWeight: "600", color: COLOR.apagado },
  pasoTituloVivo: { color: COLOR.tinta },
  pasoResultado: { ...TIPO.denso, fontSize: 14, lineHeight: 19, color: COLOR.rutinaria, marginTop: 3 },
});
