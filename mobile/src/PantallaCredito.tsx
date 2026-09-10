/**
 * El crédito de salud: por cuánto se pide y qué hay que entregar.
 *
 * Los dos montos salen del paquete de `core/paquete.ts`, no de una lista fija:
 * el alto cubre el peor caso y el bajo el mejor. Es la bisagra entre el reto de
 * salud y el de inclusión financiera, y aquí se declara lo que de verdad importa:
 * al banco viaja el propósito genérico "salud", nunca la señal que se detectó ni
 * ninguna de las fotos.
 */
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Pantalla, Encabezado, BarraVeredicto, FilaRuta, Boton, Etiqueta, Pie } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, DISPLAY } from "./ui/tokens";

export default function PantallaCredito({
  costoMin, costoMax, onContinuar, onVolver,
}: {
  costoMin: number;
  costoMax: number;
  onContinuar: (monto: number) => void;
  onVolver: () => void;
}) {
  const [monto, setMonto] = useState(costoMax);

  const opciones = [
    { valor: costoMax, titulo: "Todo", ayuda: "Cubre el peor caso" },
    { valor: costoMin, titulo: "Lo justo", ayuda: "Si consigues los precios bajos" },
  ];

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <BarraVeredicto color={COLOR.prioritaria} texto="Crédito de salud" />

      <View style={s.arriba}>
        <Text style={s.titular}>¿Por cuánto{"\n"}lo pides?</Text>
        <Text style={s.parrafo}>
          Atender todo cuesta entre B/. {costoMin} y B/. {costoMax}. Puedes pedirlo desde aquí,
          sin bajar al pueblo.
        </Text>
      </View>

      <View style={s.montos}>
        {opciones.map(o => {
          const elegido = o.valor === monto;
          return (
            <Pressable
              key={o.titulo}
              onPress={() => setMonto(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido }}
              accessibilityLabel={`${o.titulo}, ${o.valor} balboas. ${o.ayuda}`}
              style={({ pressed }) => [s.monto, elegido && s.montoElegido, pressed && s.montoPress]}
            >
              <Text style={[s.montoCifra, elegido && s.montoTextoElegido]}>B/. {o.valor}</Text>
              <Text style={[s.montoTitulo, elegido && s.montoTextoElegido]}>{o.titulo}</Text>
              <Text style={[s.montoAyuda, elegido && s.montoAyudaElegida]}>{o.ayuda}</Text>
            </Pressable>
          );
        })}
      </View>

      <Etiqueta>Qué te vamos a pedir</Etiqueta>
      <View style={s.filas}>
        <FilaRuta simbolo="documento" etiqueta="Obligatorio" valor="Cédula: foto o archivo" />
        <FilaRuta simbolo="documento" etiqueta="Obligatorio" valor="Comprobante de ingresos: foto o archivo" />
        <FilaRuta simbolo="moneda" etiqueta="Opcional, baja la tasa" valor="Extracto bancario: foto o archivo" ultima />
      </View>

      <View style={s.privacidad}>
        <Text style={s.privacidadTitulo}>Qué ve el banco</Text>
        <Text style={s.privacidadTexto}>
          Las fotos o archivos se leen en este teléfono y se borra la copia. Al banco solo le
          llegan los datos escritos y que el préstamo es de salud. No le llega qué se te detectó.
        </Text>
      </View>

      <Boton
        texto="Cargar mis documentos"
        onPress={() => onContinuar(monto)}
        etiqueta={`Cargar mis documentos para pedir ${monto} balboas`}
      />
      <Boton texto="Ahora no" tono="borde" onPress={onVolver} />

      <Pie>
        El banco no ve qué se te detectó. El scorecard corre con cartera sintética: demuestra el
        flujo, no la política de un banco real.
      </Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 16, gap: 10 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  montos: { flexDirection: "row", gap: 10, paddingHorizontal: ESPACIO.borde },
  monto: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 2,
    borderWidth: 3, borderColor: COLOR.separador, backgroundColor: COLOR.fondo,
  },
  montoElegido: { borderColor: COLOR.tinta, backgroundColor: COLOR.tinta },
  montoPress: { opacity: 0.85 },
  montoCifra: { ...DISPLAY, fontSize: 22, lineHeight: 24, color: COLOR.tinta },
  montoTitulo: { fontSize: 14, fontWeight: "700", color: COLOR.tinta },
  montoAyuda: { fontSize: 12.5, lineHeight: 17, color: COLOR.gris },
  montoTextoElegido: { color: COLOR.sobreColor },
  montoAyudaElegida: { color: COLOR.sobreTinta },

  filas: { borderTopWidth: 3, borderTopColor: COLOR.tinta },

  privacidad: {
    backgroundColor: COLOR.rutinaria, marginTop: 22,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 15, gap: 4,
  },
  privacidadTitulo: { ...TIPO.barra, fontSize: 13, letterSpacing: 0.6, color: COLOR.sobreColor },
  privacidadTexto: { fontSize: 13.5, lineHeight: 19, color: COLOR.sobreColor },
});
