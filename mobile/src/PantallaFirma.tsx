/**
 * Trazo para aceptar el crédito aprobado.
 * Demo: no es firma electrónica legal.
 *
 * Pantalla sin scroll: si el ScrollView captura el gesto, el pad no escribe.
 */
import { useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet } from "react-native";
import type { Respuesta } from "./core/credito/motor";
import { hashTrazo } from "./firmaHash";
import { Pantalla, Encabezado, BarraVeredicto, Boton, Pie } from "./ui/componentes";
import { COLOR, DISPLAY, ESPACIO, TIPO } from "./ui/tokens";

type Punto = { x: number; y: number };
type Trazo = Punto[];

/** Segmento entre dos puntos (RN no trae canvas ni SVG aquí). */
function Segmento({ a, b }: { a: Punto; b: Punto }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return null;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={[
        s.seg,
        {
          left: (a.x + b.x) / 2 - len / 2,
          top: (a.y + b.y) / 2 - 2,
          width: len,
          transform: [{ rotate: `${ang}deg` }],
        },
      ]}
    />
  );
}

function DibujarTrazos({ trazos }: { trazos: Trazo[] }) {
  return (
    <>
      {trazos.map((trazo, i) =>
        trazo.slice(1).map((b, j) => (
          <Segmento key={`${i}-${j}`} a={trazo[j]!} b={b} />
        )),
      )}
    </>
  );
}

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
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: e => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setActivo([{ x, y }]);
    },
    onPanResponderMove: e => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setActivo(a => {
        const last = a[a.length - 1];
        if (last && Math.hypot(x - last.x, y - last.y) < 2) return a;
        return [...a, { x, y }];
      });
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
    <Pantalla scroll={false}>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.prioritaria} texto="Tu firma" />

      <View style={s.arriba}>
        <Text style={s.titular}>Firma{"\n"}aquí</Text>
        <Text style={s.parrafo}>
          Aceptas B/. {monto}
          {meses != null ? ` a ${meses} meses` : ""}
          {cuota != null ? ` · cuota B/. ${cuota.toFixed(2)}` : ""}.
        </Text>
      </View>

      <View
        style={s.pad}
        {...pan.panHandlers}
        accessibilityLabel="Área para firmar con el dedo"
      >
        {todos.length === 0 ? (
          <Text style={s.hint} pointerEvents="none">Dibuja tu firma con el dedo</Text>
        ) : null}
        <DibujarTrazos trazos={todos} />
      </View>

      <View style={s.acciones}>
        <Boton
          texto="Borrar"
          tono="borde"
          onPress={() => { setTrazos([]); setActivo([]); }}
        />
        <Boton
          texto={hayTrazo ? "Confirmar firma" : "Firma primero"}
          tono={hayTrazo ? "rutinaria" : "borde"}
          onPress={() => {
            if (!hayTrazo) return;
            onConfirmar(hashTrazo(todos));
          }}
        />
      </View>

      <Pie>
        Este trazo no es una firma electrónica legal. Solo deja constancia en la demo.
      </Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 12, paddingBottom: 10, gap: 6 },
  titular: { ...DISPLAY, fontSize: 34, lineHeight: 35, letterSpacing: -1.2, color: COLOR.tinta },
  parrafo: { fontSize: 15, lineHeight: 21, color: COLOR.gris },

  pad: {
    marginHorizontal: ESPACIO.borde,
    flex: 1,
    minHeight: 220,
    maxHeight: 280,
    borderWidth: 3,
    borderColor: COLOR.tinta,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: { ...TIPO.etiqueta, fontSize: 13, color: COLOR.apagado },
  seg: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.tinta,
  },
  acciones: { marginTop: 8, gap: 0 },
});
