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
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales } from "./core/reglas";
import { armarPaquete } from "./core/paquete";

/** Lo que tarda cada paso en pantalla. No es el tiempo de cálculo, es el de lectura. */
const RITMO_MS = 600;

export default function PantallaRevision({
  usuario, onListo,
}: { usuario: Usuario; onListo: () => void }) {
  const [hechos, setHechos] = useState(0);

  const senales = detectarSenales(usuario.mediciones);
  const paquete = armarPaquete(senales);

  const pasos = [
    {
      titulo: "Leyendo tus mediciones",
      resultado: `${usuario.mediciones.length} mediciones de los últimos meses`,
    },
    {
      titulo: "Comparando con los rangos de referencia",
      resultado: senales.length === 0
        ? "Nada fuera de rango"
        : `${senales.length} ${senales.length === 1 ? "señal encontrada" : "señales encontradas"}`,
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
    <SafeAreaView style={s.pantalla}>
      <View style={s.cuerpo}>
        <Text style={s.marca}>Ina Igar</Text>
        <Text style={s.titulo}>Revisando tu historial</Text>
        <Text style={s.parrafo}>
          Todo esto ocurre aquí dentro. Nada se envía a ningún lado.
        </Text>

        <View style={s.pasos}>
          {pasos.map((p, i) => {
            const hecho = i < hechos;
            const activo = i === hechos;
            return (
              <View key={p.titulo} style={s.paso}>
                <View style={[s.marcador, hecho && s.marcadorHecho, activo && s.marcadorActivo]} />
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { flex: 1, padding: 20, paddingTop: 40, justifyContent: "center" },
  marca: { fontSize: 15, fontWeight: "700", color: "#818C87", letterSpacing: 0.3 },
  titulo: { fontSize: 24, fontWeight: "700", color: "#0F1512", marginTop: 10 },
  parrafo: { fontSize: 14.5, lineHeight: 21, color: "#4E5A55", marginTop: 8 },
  pasos: { marginTop: 34, gap: 22 },
  paso: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  marcador: {
    width: 10, height: 10, borderRadius: 5, marginTop: 5,
    borderWidth: 1, borderColor: "#D3DAD6", backgroundColor: "#FFFFFF",
  },
  marcadorActivo: { borderColor: "#0E6E6C" },
  marcadorHecho: { borderColor: "#0E6E6C", backgroundColor: "#0E6E6C" },
  textos: { flex: 1 },
  pasoTitulo: { fontSize: 15, lineHeight: 21, color: "#A6B0AB" },
  pasoTituloVivo: { color: "#0F1512", fontWeight: "600" },
  pasoResultado: { fontSize: 13.5, lineHeight: 19, color: "#0E6E6C", marginTop: 3 },
});
