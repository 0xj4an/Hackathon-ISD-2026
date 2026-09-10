/**
 * Trazo para aceptar el crédito aprobado.
 * Demo: no es firma electrónica legal. Solo deja constancia en pantalla.
 */
import { useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet } from "react-native";
import type { Respuesta } from "./core/credito/motor";
import { hashTrazo } from "./firmaHash";
import { Pantalla, Encabezado, BarraVeredicto, Boton, Pie } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";

type Punto = { x: number; y: number };
type Trazo = Punto[];

export default function PantallaFirma({
  respuesta, onConfirmar, onVolver,
}: {
  respuesta: Respuesta;
  onConfirmar: (firmaHash: string) => void;
  onVolver: () => void;
}) {
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [activo, setActivo] = useState<Trazo>([]);
  const vivo = useRef({ trazos, activo });
  vivo.current = { trazos, activo };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setActivo([{ x, y }]);
    },
    onPanResponderMove: e => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setActivo(a => [...a, { x, y }]);
    },
    onPanResponderRelease: () => {
      const { activo: a, trazos: t } = vivo.current;
      if (a.length > 0) setTrazos([...t, a]);
      setActivo([]);
    },
  })).current;

  const todos = activo.length ? [...trazos, activo] : trazos;
  const hayTrazo = todos.some(t => t.length > 1);
  const monto = respuesta.monto_aprobado_usd ?? 0;
  const cuota = respuesta.cuota_mensual_usd;
  const meses = respuesta.plazo_meses;

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.rutinaria} texto="Firma para aceptar" />

      <View style={s.arriba}>
        <Text style={s.titular}>Firma{"\n"}para aceptar</Text>
        <Text style={s.parrafo}>
          B/. {monto}
          {meses != null ? ` a ${meses} meses` : ""}
          {cuota != null ? `, cuota de B/. ${cuota.toFixed(2)}` : ""}.
        </Text>
      </View>

      <View
        style={s.pad}
        {...pan.panHandlers}
        accessibilityLabel="Área para firmar con el dedo"
      >
        {todos.length === 0 ? (
          <Text style={s.hint}>Firma con el dedo</Text>
        ) : null}
        {todos.map((trazo, i) => (
          <View key={i} style={StyleSheet.absoluteFill} pointerEvents="none">
            {trazo.map((p, j) => (
              <View
                key={j}
                style={[s.punto, { left: p.x - 2, top: p.y - 2 }]}
              />
            ))}
          </View>
        ))}
      </View>

      <Boton
        texto="Borrar"
        tono="borde"
        onPress={() => { setTrazos([]); setActivo([]); }}
      />
      <Boton
        texto="Confirmar"
        tono="rutinaria"
        onPress={() => {
          if (!hayTrazo) return;
          onConfirmar(hashTrazo(todos));
        }}
        etiqueta={hayTrazo ? "Confirmar firma" : "Firma primero para confirmar"}
      />

      <Pie>
        Este trazo no es una firma electrónica legal. Sirve para dejar constancia
        de que aceptaste estas condiciones en la demo.
      </Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 16, paddingBottom: 12, gap: 8 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  pad: {
    marginHorizontal: ESPACIO.borde,
    height: 200,
    borderWidth: 3,
    borderColor: COLOR.tinta,
    backgroundColor: COLOR.hundido,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: { ...TIPO.etiqueta, fontSize: 13, color: COLOR.apagado },
  punto: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.tinta,
  },
});
