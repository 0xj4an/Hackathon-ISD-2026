/**
 * Los pictogramas de Señalética, dibujados con Views.
 *
 * No hay `react-native-svg` en el proyecto y meterlo es otro módulo nativo, así
 * que estos se componen con rectángulos, círculos y el truco del borde para el
 * triángulo. No es una limitación tan grande como parece: la señalética real es
 * geometría elemental, y a 28 px un pictograma sólido no da para más detalle.
 *
 * Todos son macizos, del color que se les pase, y ocupan un cuadrado de `tamano`.
 */
import { View, StyleSheet } from "react-native";

export type Simbolo =
  | "alerta"      // triángulo con signo: lo que obliga a salir
  | "salud"       // casa con cruz: el centro de salud
  | "persona"     // a quién le corresponde
  | "moneda"      // lo que cuesta
  | "listo"       // círculo con visto: todo en orden
  | "sinSenal"    // círculo tachado: no hay red
  | "documento"   // hoja con líneas: la cédula, el comprobante
  | "calendario"  // cuánto tiempo dura: el plazo, los meses
  | "porcentaje"; // la tasa

/**
 * `fondo` es el color que hay detrás del pictograma, y hace falta porque tres
 * de estos se dibujan calando el fondo: el signo de la alerta, la cruz del
 * centro de salud y las líneas del documento. Sobre un bloque de color el
 * pictograma va en blanco, y si el calado también fuera blanco desaparecería,
 * que es exactamente lo que pasaba: el triángulo salía macizo y sin signo.
 */
type Props = { simbolo: Simbolo; tamano?: number; color?: string; fondo?: string };

export default function Pictograma({
  simbolo, tamano = 28, color = "#101010", fondo = "#FFFFFF",
}: Props) {
  const u = tamano / 24; // el dibujo está pensado en una rejilla de 24
  const caja = { width: tamano, height: tamano };

  if (simbolo === "alerta") {
    return (
      <View style={[caja, s.centro]}>
        <View
          style={{
            width: 0, height: 0, backgroundColor: "transparent",
            borderLeftWidth: 11 * u, borderRightWidth: 11 * u, borderBottomWidth: 19 * u,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: color,
          }}
        />
        <View style={[s.encima, { top: 10 * u, width: 2.4 * u, height: 6 * u, backgroundColor: fondo }]} />
        <View style={[s.encima, { top: 17.6 * u, width: 2.4 * u, height: 2.4 * u, backgroundColor: fondo }]} />
      </View>
    );
  }

  if (simbolo === "salud") {
    return (
      <View style={[caja, s.abajo]}>
        <View
          style={{
            width: 0, height: 0, backgroundColor: "transparent",
            borderLeftWidth: 11 * u, borderRightWidth: 11 * u, borderBottomWidth: 8 * u,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: color,
          }}
        />
        <View style={{ width: 17 * u, height: 12 * u, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 9 * u, height: 2.6 * u, backgroundColor: fondo }} />
          <View style={[s.encima, { width: 2.6 * u, height: 9 * u, backgroundColor: fondo }]} />
        </View>
      </View>
    );
  }

  if (simbolo === "persona") {
    return (
      <View style={[caja, s.abajo]}>
        <View style={{ width: 8 * u, height: 8 * u, borderRadius: 4 * u, backgroundColor: color, marginBottom: 1.6 * u }} />
        <View
          style={{
            width: 16 * u, height: 9 * u, backgroundColor: color,
            borderTopLeftRadius: 8 * u, borderTopRightRadius: 8 * u,
          }}
        />
      </View>
    );
  }

  if (simbolo === "moneda") {
    // Un billete, no una moneda con signo: el círculo dentro del rectángulo se
    // lee como dinero, y un "$" hecho de rectángulos no se lee como nada.
    return (
      <View style={[caja, s.centro]}>
        <View
          style={{
            width: 22 * u, height: 14 * u,
            borderWidth: 2.4 * u, borderColor: color,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 6.4 * u, height: 6.4 * u, borderRadius: 3.2 * u,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    );
  }

  if (simbolo === "listo") {
    return (
      <View style={[caja, s.centro]}>
        <View
          style={{
            width: 21 * u, height: 21 * u, borderRadius: 10.5 * u,
            borderWidth: 2.4 * u, borderColor: color,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 5 * u, height: 2.4 * u, backgroundColor: color,
              transform: [{ rotate: "45deg" }, { translateX: -1.6 * u }, { translateY: 2.4 * u }],
            }}
          />
          <View
            style={[s.encima, {
              width: 10 * u, height: 2.4 * u, backgroundColor: color,
              transform: [{ rotate: "-45deg" }, { translateX: 1.4 * u }],
            }]}
          />
        </View>
      </View>
    );
  }

  if (simbolo === "sinSenal") {
    return (
      <View style={[caja, s.centro]}>
        <View
          style={{
            width: 21 * u, height: 21 * u, borderRadius: 10.5 * u,
            borderWidth: 2.4 * u, borderColor: color,
          }}
        />
        <View
          style={[s.encima, {
            width: 19 * u, height: 2.6 * u, backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }]}
        />
      </View>
    );
  }

  if (simbolo === "calendario") {
    return (
      <View style={[caja, s.centro]}>
        <View style={{ width: 20 * u, height: 18 * u, borderWidth: 2.4 * u, borderColor: color }}>
          <View style={{ height: 4.4 * u, backgroundColor: color }} />
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", padding: 1.8 * u, gap: 1.6 * u }}>
            <View style={{ width: 3 * u, height: 3 * u, backgroundColor: color }} />
            <View style={{ width: 3 * u, height: 3 * u, backgroundColor: color }} />
            <View style={{ width: 3 * u, height: 3 * u, backgroundColor: color }} />
          </View>
        </View>
      </View>
    );
  }

  if (simbolo === "porcentaje") {
    return (
      <View style={[caja, s.centro]}>
        <View style={[s.encima, { top: 3 * u, left: 4 * u, width: 6 * u, height: 6 * u, borderRadius: 3 * u, borderWidth: 2.2 * u, borderColor: color }]} />
        <View style={{ width: 2.6 * u, height: 21 * u, backgroundColor: color, transform: [{ rotate: "28deg" }] }} />
        <View style={[s.encima, { bottom: 3 * u, right: 4 * u, width: 6 * u, height: 6 * u, borderRadius: 3 * u, borderWidth: 2.2 * u, borderColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[caja, s.centro]}>
      <View style={{ width: 16 * u, height: 20 * u, backgroundColor: color, paddingTop: 4 * u, alignItems: "center", gap: 2 * u }}>
        <View style={{ width: 10 * u, height: 2 * u, backgroundColor: fondo }} />
        <View style={{ width: 10 * u, height: 2 * u, backgroundColor: fondo }} />
        <View style={{ width: 6 * u, height: 2 * u, backgroundColor: fondo, marginRight: 4 * u }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { alignItems: "center", justifyContent: "center" },
  abajo: { alignItems: "center", justifyContent: "flex-end" },
  encima: { position: "absolute" },
});
