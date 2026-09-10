/**
 * Lo que se leyó. Es la pantalla 11 del mapa de diseño, y el mapa dice
 * **editable**: lo que sale de un OCR se corrige, no se acata.
 *
 * Hoy los campos llegan vacíos y los escribe la persona, porque la extracción
 * todavía no existe (`PantallaDocumentos` solo toma la foto). Cuando exista,
 * llegan por `leidos` ya rellenos y con su confianza al lado, y esta pantalla
 * no cambia: sigue siendo el sitio donde se confirma o se corrige.
 *
 * Los cinco campos de abajo no son burocracia. Son exactamente los que el
 * modelo necesita para medir capacidad de pago de verdad: sin las otras cuotas
 * el cálculo sería sobre el ingreso a secas y mentiría.
 */
import { useState } from "react";
import { Text, TextInput, View, Pressable, StyleSheet } from "react-native";
import type { Solicitud } from "./core/credito/motor";
import type { TipoIngreso } from "./core/credito/politica";
import { Pantalla, Encabezado, BarraVeredicto, Franja, Boton, Etiqueta } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO, TOQUE } from "./ui/tokens";

/** Lo que el OCR llenará algún día. Hoy llega vacío. */
export type Leidos = {
  nombre?: string;
  anio_nacimiento?: number;
  ingreso_mensual_usd?: number;
  tipo?: TipoIngreso;
  antiguedad_meses?: number;
  confianza?: number;
};

const TIPOS: { valor: TipoIngreso; texto: string }[] = [
  { valor: "asalariado", texto: "Con planilla" },
  { valor: "independiente", texto: "Por mi cuenta" },
  { valor: "jubilado", texto: "Jubilado" },
  { valor: "otro", texto: "Otro" },
];

export default function PantallaDatos({
  monto, conExtracto = false, leidos = {}, onListo, onVolver,
}: {
  monto: number;
  /** Si se fotografió el extracto, se preguntan sus dos campos. */
  conExtracto?: boolean;
  leidos?: Leidos;
  onListo: (solicitud: Solicitud) => void;
  onVolver: () => void;
}) {
  const [anio, setAnio] = useState(leidos.anio_nacimiento ? String(leidos.anio_nacimiento) : "");
  const [ingreso, setIngreso] = useState(leidos.ingreso_mensual_usd ? String(leidos.ingreso_mensual_usd) : "");
  const [tipo, setTipo] = useState<TipoIngreso>(leidos.tipo ?? "asalariado");
  const [antiguedad, setAntiguedad] = useState(leidos.antiguedad_meses ? String(leidos.antiguedad_meses) : "");
  const [deudas, setDeudas] = useState("");
  const [aCargo, setACargo] = useState("");
  const [mesesExtracto, setMesesExtracto] = useState("");
  const [saldo, setSaldo] = useState("");

  const num = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));
  const anioN = num(anio), ingresoN = num(ingreso), antiguedadN = num(antiguedad);
  const deudasN = deudas.trim() === "" ? 0 : num(deudas);
  const aCargoN = aCargo.trim() === "" ? 0 : num(aCargo);
  const hoy = new Date();

  // Los rangos son los de `SolicitudSchema`. Si no cuadran, el nodo rechazaria
  // el JSON y la persona no sabria por que, asi que se avisa aqui.
  const problemas: string[] = [];
  if (!Number.isFinite(anioN) || anioN < hoy.getFullYear() - 100 || anioN > hoy.getFullYear() - 18) {
    problemas.push("el año de nacimiento");
  }
  if (!Number.isFinite(ingresoN) || ingresoN < 100 || ingresoN > 20000) problemas.push("el ingreso del mes");
  if (!Number.isFinite(antiguedadN) || antiguedadN < 0 || antiguedadN > 600) problemas.push("los meses en la actividad");
  if (!Number.isFinite(deudasN) || deudasN < 0) problemas.push("las otras cuotas");
  if (!Number.isFinite(aCargoN) || aCargoN < 0 || aCargoN > 15) problemas.push("las personas a cargo");

  const listo = problemas.length === 0;

  const continuar = () => {
    if (!listo) return;
    const extracto = conExtracto && Number.isFinite(num(mesesExtracto)) && Number.isFinite(num(saldo))
      ? {
          banco: "Banco declarado por la persona",
          saldo_promedio_usd: num(saldo),
          meses_cubiertos: Math.min(12, Math.max(1, Math.round(num(mesesExtracto)))),
          confianza: 1,
        }
      : undefined;
    onListo({
      id: undefined,
      monto_solicitado_usd: monto,
      cedula: {
        fecha_nacimiento: `${anioN}-01-01`,
        // Lo escribio la persona, no lo leyo un modelo: no hay incertidumbre
        // de OCR que declarar.
        confianza: leidos.confianza ?? 1,
      },
      ingresos: {
        ingreso_mensual_usd: ingresoN,
        tipo,
        antiguedad_meses: Math.round(antiguedadN),
        confianza: leidos.confianza ?? 1,
      },
      deudas_mensuales_usd: deudasN,
      personas_a_cargo: Math.round(aCargoN),
      extracto,
    } as Solicitud);
  };

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto color={COLOR.tinta} texto="Lo que se leyó" derecha={`B/. ${monto}`} />

      <View style={s.arriba}>
        <Text style={s.titular}>Confirma{"\n"}tus datos</Text>
        <Text style={s.parrafo}>
          Con esto se calcula tu cuota en este mismo teléfono. Las fotos ya se borraron.
        </Text>
      </View>

      <Etiqueta>De tu cédula</Etiqueta>
      <Campo etiqueta="Año de nacimiento" valor={anio} onCambio={setAnio} marcador="1990" />

      <Etiqueta>De tu comprobante de ingresos</Etiqueta>
      <Campo etiqueta="Cuánto ganas al mes" prefijo="B/." valor={ingreso} onCambio={setIngreso} marcador="520" />
      <Campo etiqueta="Meses en esa actividad" valor={antiguedad} onCambio={setAntiguedad} marcador="36" />

      <Etiqueta>Cómo ganas</Etiqueta>
      <View style={s.opciones}>
        {TIPOS.map(t => (
          <Pressable
            key={t.valor}
            onPress={() => setTipo(t.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: tipo === t.valor }}
            style={({ pressed }) => [
              s.opcion, tipo === t.valor && s.opcionElegida, pressed && s.opcionPress,
            ]}
          >
            <Text style={[s.opcionTexto, tipo === t.valor && s.opcionTextoElegido]}>{t.texto}</Text>
          </Pressable>
        ))}
      </View>

      <Etiqueta>Lo que ya pagas</Etiqueta>
      <Campo
        etiqueta="Otras cuotas al mes"
        prefijo="B/."
        valor={deudas}
        onCambio={setDeudas}
        marcador="0"
        ayuda="Préstamos, fiados, tarjetas. Si no debes nada, deja el cero"
      />
      <Campo
        etiqueta="Personas a tu cargo"
        valor={aCargo}
        onCambio={setACargo}
        marcador="0"
        ayuda="Quiénes comen de este ingreso, sin contarte"
      />

      {conExtracto ? (
        <>
          <Etiqueta>De tu extracto</Etiqueta>
          <Campo etiqueta="Meses que cubre" valor={mesesExtracto} onCambio={setMesesExtracto} marcador="6" />
          <Campo etiqueta="Saldo promedio" prefijo="B/." valor={saldo} onCambio={setSaldo} marcador="200" />
        </>
      ) : null}

      {listo ? null : (
        <Franja
          color={COLOR.prioritaria}
          simbolo="alerta"
          titulo="Falta revisar"
          texto={`Revisa ${problemas.join(", ")}.`}
        />
      )}

      <Franja
        color={COLOR.tinta}
        simbolo="sinSenal"
        texto={
          "Nada de esto sale del teléfono todavía. Al banco solo le llegan estos campos " +
          "escritos, nunca las fotos ni por qué pediste el crédito."
        }
      />

      <Boton
        texto={listo ? "Ver mi cuota" : "Completa los datos"}
        onPress={continuar}
        tono={listo ? "tinta" : "borde"}
        etiqueta="Calcular mi cuota con estos datos"
      />
    </Pantalla>
  );
}

function Campo({
  etiqueta, valor, onCambio, marcador, prefijo, ayuda,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (t: string) => void;
  marcador: string;
  prefijo?: string;
  ayuda?: string;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.campoEtiqueta}>{etiqueta}</Text>
      <View style={s.entradaFila}>
        {prefijo ? <Text style={s.prefijo}>{prefijo}</Text> : null}
        <TextInput
          value={valor}
          onChangeText={onCambio}
          placeholder={marcador}
          placeholderTextColor={COLOR.apagado}
          keyboardType="number-pad"
          accessibilityLabel={etiqueta}
          style={s.entrada}
        />
      </View>
      {ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  arriba: { marginBottom: ESPACIO.entre },
  titular: { ...TIPO.titulo, color: COLOR.tinta, marginBottom: ESPACIO.apretado },
  parrafo: { ...TIPO.denso, color: COLOR.gris },
  campo: { marginBottom: ESPACIO.entre },
  campoEtiqueta: { ...TIPO.denso, color: COLOR.gris, marginBottom: 4 },
  entradaFila: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderBottomWidth: 2, borderBottomColor: COLOR.tinta,
  },
  prefijo: { ...TIPO.cifraMedia, color: COLOR.gris },
  entrada: { ...TIPO.cifraMedia, color: COLOR.tinta, flex: 1, minHeight: TOQUE, paddingVertical: 4 },
  ayuda: { ...TIPO.pie, color: COLOR.gris, marginTop: 4 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: ESPACIO.entre },
  opcion: {
    paddingHorizontal: 12, minHeight: TOQUE, justifyContent: "center",
    borderWidth: 2, borderColor: COLOR.separador,
  },
  opcionElegida: { borderColor: COLOR.tinta, backgroundColor: COLOR.tinta },
  opcionPress: { backgroundColor: COLOR.hundido },
  opcionTexto: { ...TIPO.denso, color: COLOR.gris },
  opcionTextoElegido: { color: COLOR.sobreColor },
});
