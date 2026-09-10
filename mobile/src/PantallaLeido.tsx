/**
 * Lo que se leyó: las fotos ya no existen. Mock 5 de Señalética.
 *
 * Un color: el verde del veredicto. La franja negra no es señal, es el estado
 * del envío (`ADR-012`). Un botón.
 */
import { View, Text, StyleSheet } from "react-native";
import {
  Pantalla, Encabezado, Veredicto, Franja, Boton, Etiqueta, Pie,
} from "./ui/componentes";
import { COLOR, TIPO, ESPACIO } from "./ui/tokens";
import type { LecturaCredito } from "./lectura";

export default function PantallaLeido({
  lectura, onFirmar, onVolver,
}: {
  lectura: LecturaCredito;
  onFirmar: () => void;
  onVolver: () => void;
}) {
  const n = lectura.fotosBorradas;
  const campos = [
    { k: "Nombre", v: lectura.cedula.nombre, p: lectura.cedula.confianza },
    { k: "Cédula", v: lectura.cedula.numero, p: lectura.cedula.confianza },
    {
      k: "Ingreso al mes",
      v: `B/. ${lectura.ingresos.ingreso_mensual_usd.toFixed(2)}`,
      p: lectura.ingresos.confianza,
    },
    { k: "Actividad", v: lectura.ingresos.empleador_o_actividad, p: lectura.ingresos.confianza },
  ];

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <Veredicto
        color={COLOR.rutinaria}
        simbolo="documento"
        palabra={`${n} foto${n === 1 ? "" : "s"}\nborrada${n === 1 ? "" : "s"}`}
        detalle="Tu teléfono las leyó, se quedó con los datos y las eliminó. No salieron de aquí."
      />

      <View style={s.cabeceraLista}>
        <Etiqueta>Lo que se leyó</Etiqueta>
        <Text style={s.sintetico}>Datos sintéticos</Text>
      </View>

      <View style={s.lista}>
        {campos.map((c, i) => (
          <View key={c.k} style={[s.fila, i === campos.length - 1 ? null : s.separador]}>
            <View style={s.textos}>
              <Text style={s.k}>{c.k}</Text>
              <Text style={s.v}>{c.v}</Text>
            </View>
            <Text style={s.pct}>{Math.round(c.p * 100)}%</Text>
          </View>
        ))}
      </View>

      <Text style={s.ayuda}>Toca volver si hay que repetir una lectura antes de firmar.</Text>

      <Franja
        color={COLOR.tinta}
        simbolo="sinSenal"
        titulo="Sigue en el teléfono"
        texto="Los campos se quedaron aquí. El siguiente paso calcula la cuota sin mandar nada a un banco."
      />

      <Boton
        texto="Ver mi cuota"
        tono="prioritaria"
        onPress={onFirmar}
        etiqueta="Ver la cuota calculada en este teléfono"
      />
      <Pie>El banco recibe los campos escritos. Nunca el motivo de salud.</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cabeceraLista: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    paddingRight: ESPACIO.borde, marginTop: 6,
  },
  sintetico: { ...TIPO.etiqueta, fontSize: 11, color: COLOR.gris },
  lista: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  separador: { borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  fila: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 12, paddingHorizontal: ESPACIO.borde, paddingVertical: 13,
  },
  textos: { flex: 1, gap: 1 },
  k: { ...TIPO.etiqueta, fontSize: 11.5, color: COLOR.gris },
  v: { fontSize: 18, fontWeight: "700", color: COLOR.tinta },
  pct: { ...TIPO.denso, fontWeight: "700", color: COLOR.tinta },
  ayuda: {
    fontSize: 13.5, lineHeight: 19, color: COLOR.gris,
    paddingHorizontal: ESPACIO.borde, paddingVertical: 12,
  },
});
