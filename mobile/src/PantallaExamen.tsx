/**
 * Vía B: la persona trae un examen de laboratorio y la app se lo lee.
 *
 * Es la otra mitad del proyecto. La vía A vigila las mediciones del día a día;
 * esta atiende al que bajó al pueblo, se hizo el examen y volvió con un papel
 * que nadie le explica. El catálogo de `marcadores.ts` ya sabía clasificar, pero
 * hasta ahora no tenía por dónde entrar.
 *
 * Dos caminos de entrada, y el orden importa: la foto es el que se demuestra, y
 * escribir los valores es el que funciona hoy. Cuando `ocr()` exista, la foto
 * llenará estos mismos campos con `SYSTEM_EXTRACCION_LABORATORIO` y el resto de
 * la pantalla no cambia. Quién está alto o bajo lo decide `clasificar()` contra
 * su rango citado, nunca el modelo (`ADR-005`).
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { Usuario } from "./usuarios";
import { MARCADORES, clasificar, buscarMarcador, type LecturaLab } from "./core/marcadores";
import {
  Pantalla, Encabezado, BarraVeredicto, Veredicto, Franja, Boton, Etiqueta, Pie,
} from "./ui/componentes";
import { COLOR, COLOR_URGENCIA, VERBO_URGENCIA, TIPO, ESPACIO, DISPLAY, TOQUE } from "./ui/tokens";

const SIN_PERMISO = "Sin permiso de cámara no podemos leer el examen. Actívalo y vuelve a intentar.";
const FALLO = "No se pudo abrir la cámara. Intenta otra vez.";
const NADA = "Escribe al menos un valor, el que aparezca en tu examen.";
const PENDIENTE =
  "La lectura automática de la foto entra en el siguiente bloque. Mientras tanto, escribe abajo los valores que veas en el papel.";

const ORDEN = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 } as const;

export default function PantallaExamen({
  usuario, onVolver,
}: { usuario: Usuario; onVolver: () => void }) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [lecturas, setLecturas] = useState<LecturaLab[] | null>(null);
  const [fotoTomada, setFotoTomada] = useState(false);
  const [error, setError] = useState("");

  const tomarFoto = async () => {
    setError("");
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setError(SIN_PERMISO);
      const foto = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (foto.canceled) return;
      setFotoTomada(true);
    } catch {
      setError(FALLO);
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
    if (salida.length === 0) return setError(NADA);
    setError("");
    setLecturas(salida.sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]));
  };

  if (lecturas) {
    const peor = lecturas[0].urgencia;
    const fuera = lecturas.filter(l => l.hallazgo !== "dentro de rango");
    return (
      <Pantalla>
        <Encabezado meta="Volver" onVolver={onVolver} />

        {fuera.length === 0 ? (
          <Veredicto
            color={COLOR.rutinaria}
            palabra="Todo en rango"
            detalle={`Los ${lecturas.length} valores que escribiste están dentro de lo esperado.`}
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

        <Boton texto="Escribir otros valores" tono="borde" onPress={() => setLecturas(null)} />

        <Pie>
          Los rangos salen del catálogo de marcadores, cada uno con su fuente. Esto es orientación
          automática y local, no un diagnóstico. Confirma con un profesional de salud.
        </Pie>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <BarraVeredicto color={COLOR.prioritaria} texto="Tu examen" />

      <View style={s.arriba}>
        <Text style={s.titular}>¿Te hiciste{"\n"}un examen?</Text>
        <Text style={s.parrafo}>
          Tráelo y te decimos qué dice cada número. Se lee en este teléfono, como todo lo demás.
        </Text>
      </View>

      {error ? <Franja color={COLOR.inmediata} titulo="No se pudo" texto={error} /> : null}

      <Boton texto={fotoTomada ? "Foto tomada. Repetir" : "Tomar foto del examen"} onPress={tomarFoto} />

      {fotoTomada ? <Franja color={COLOR.prioritaria} titulo="Falta leerla" texto={PENDIENTE} /> : null}

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
                if (error) setError("");
              }}
              placeholder="--"
              placeholderTextColor="#9A9A9A"
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel={`Valor de ${m.nombre} en ${m.unidad}`}
              style={s.campo}
            />
          </View>
        ))}
      </View>

      <Boton texto="Ver qué dicen" onPress={leer} />

      <Pie>
        Solo escribe los que aparezcan en tu papel. Los que dejes vacíos no se inventan.
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
