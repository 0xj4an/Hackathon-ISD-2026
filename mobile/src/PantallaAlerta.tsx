/**
 * Pantalla del caso: qué se detectó, qué hacer, y cuánto cuesta.
 *
 * Las señales las deciden las reglas de `core/reglas.ts`, no el modelo
 * (`ADR-005`). Esta pantalla muestra el resultado de esas reglas tal cual, con
 * su fuente citada. El modelo entra después, para redactar el mensaje en
 * español sencillo, y no puede cambiar ni el umbral ni la ruta.
 *
 * El orden importa y viene de `ADR-010`: primero la señal con su instrucción
 * inmediata, el paquete debajo. En una urgencia el costo no compite con el
 * "anda ya", pero tampoco se calla: la atención de urgencia es justo lo que la
 * gente no puede pagar, y por eso no va.
 */
import { View, Text, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales, type Senal } from "./core/reglas";
import { armarPaquete, mensajeCredito, type Paquete } from "./core/paquete";
import {
  Pantalla, Encabezado, Veredicto, BarraVeredicto, FilaLista,
  BandaTotal, Franja, Boton, Etiqueta, LeyendaEstimado, Pie,
} from "./ui/componentes";
import {
  COLOR, TIPO, ESPACIO, DISPLAY, COLOR_URGENCIA, VERBO_URGENCIA, type Urgencia,
} from "./ui/tokens";

const ORDEN: Record<Urgencia, number> = { Inmediata: 0, Prioritaria: 1, Rutinaria: 2 };

const DISCLAIMER =
  "Esto es orientación automática y local, no un diagnóstico. Cada umbral sale de una guía citada, y nadie de este equipo es profesional de salud.";

const balboas = (min: number, max: number) =>
  min === max ? `B/. ${min}` : `B/. ${min} a ${max}`;

/** Una señal: el color manda, y debajo va la ruta con su fuente. */
function Tarjeta({ senal }: { senal: Senal }) {
  const color = COLOR_URGENCIA[senal.urgencia];
  const r = senal.ruta;
  return (
    <View style={s.tarjeta}>
      <View style={[s.barraColor, { backgroundColor: color }]} />
      <View style={s.tarjetaCuerpo}>
        <Text style={[s.tarjetaUrgencia, { color }]}>{VERBO_URGENCIA[senal.urgencia]}</Text>
        <Text style={s.tarjetaDescripcion}>{senal.descripcion}</Text>

        {r.ahora ? <Text style={[s.tarjetaAhora, { color }]}>{r.ahora}</Text> : null}

        <View style={s.tarjetaDatos}>
          {r.examen ? <Dato k="Examen" v={r.examen} /> : null}
          <Dato k="Dónde" v={r.donde} />
          <Dato k="Quién" v={r.especialista} />
          {senal.costo ? (
            <Dato k="Cuesta" v={`${balboas(senal.costo.min_usd, senal.costo.max_usd)}, aproximado`} />
          ) : null}
        </View>

        {r.vigilar ? (
          <View style={s.vigilar}>
            <Text style={s.vigilarK}>Ve de inmediato si aparece</Text>
            <Text style={s.vigilarV}>{r.vigilar}</Text>
          </View>
        ) : null}

        <Text style={s.fuente}>{senal.fuente}</Text>
      </View>
    </View>
  );
}

const Dato = ({ k, v }: { k: string; v: string }) => (
  <View style={s.dato}>
    <Text style={s.datoK}>{k}</Text>
    <Text style={s.datoV}>{v}</Text>
  </View>
);

/**
 * Lo que cuesta atender todo, junto, en modo denso: la barra reemplaza al
 * bloque de veredicto y el total en negro toma el relevo como elemento
 * dominante. Sin este bloque el crédito no se puede ofrecer con honestidad,
 * porque nadie sabe por cuánto pedirlo (`ADR-010`).
 */
function BloqueP({ paquete, onPedir }: {
  paquete: Paquete;
  onPedir?: (min: number, max: number) => void;
}) {
  const p = paquete;
  const hayEstimados = p.lineas.some(l => l.estimado);
  return (
    <View style={s.paquete}>
      <BarraVeredicto
        color={COLOR.prioritaria}
        texto="Lo que cuesta atenderlo"
        derecha={p.meses > 0 ? `${p.meses} meses` : undefined}
      />
      <Text style={s.paqueteTitulo}>{p.titulo}</Text>

      <View style={s.lineas}>
        {p.lineas.map((l, i) => (
          <FilaLista
            key={l.concepto}
            concepto={l.concepto}
            monto={l.min === l.max ? `${l.min}` : `${l.min} a ${l.max}`}
            estimado={l.estimado}
            ultima={i === p.lineas.length - 1}
          />
        ))}
      </View>

      {hayEstimados ? <LeyendaEstimado /> : null}

      <BandaTotal etiqueta={p.meses > 0 ? "Todo el año" : "Todo junto"} valor={balboas(p.total_min, p.total_max)} />

      <Text style={s.credito}>{mensajeCredito(p)}</Text>

      {onPedir ? (
        <Boton
          texto="Pedir un crédito de salud"
          tono="prioritaria"
          onPress={() => onPedir(p.total_min, p.total_max)}
        />
      ) : null}

      <Pie>{p.nota}</Pie>
    </View>
  );
}

export default function PantallaAlerta({
  usuario, onVolver, onPedirCredito, onSubirExamen,
}: {
  usuario: Usuario;
  onVolver: () => void;
  onPedirCredito?: (costoMin: number, costoMax: number) => void;
  /** Vía B: la persona trae un examen de laboratorio en papel. */
  onSubirExamen?: () => void;
}) {
  const senales = detectarSenales(usuario.mediciones)
    .sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]);
  const paquete = armarPaquete(senales);
  const peor = senales[0];

  if (senales.length === 0) {
    return (
      <Pantalla>
        <Encabezado meta="Salir" onVolver={onVolver} />
        <Veredicto
          color={COLOR.rutinaria}
          palabra={"Todo\nen orden"}
          detalle="Ninguna de tus mediciones se salió de rango. No hay nada que hacer hoy."
          simbolo="listo"
        />
        <Etiqueta>Lo que revisé</Etiqueta>
        <Text style={s.sanoTexto}>
          {usuario.mediciones.length} mediciones de los últimos meses, contra las 14 reglas de
          referencia. Te aviso solo cuando algo se salga de rango.
        </Text>
        {onSubirExamen ? (
          <Boton texto="Subir un examen de laboratorio" tono="borde" onPress={onSubirExamen} />
        ) : null}

        <Pie>
          Estar en rango no descarta una enfermedad. Si te sientes mal, ve al centro de salud sin
          esperar a que esta app diga nada.
        </Pie>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado meta="Salir" onVolver={onVolver} />

      <Veredicto
        color={COLOR_URGENCIA[peor.urgencia]}
        palabra={VERBO_URGENCIA[peor.urgencia]}
        detalle={peor.ruta.ahora ?? peor.ruta.examen ?? peor.ruta.donde}
        simbolo={peor.urgencia === "Rutinaria" ? "listo" : "alerta"}
      />

      <View style={s.contexto}>
        <Text style={s.contextoCifra}>{senales.length}</Text>
        <Text style={s.contextoTexto}>
          {senales.length === 1 ? "señal en tus mediciones" : "señales en tus mediciones"}
          {"\n"}
          <Text style={s.contextoMeta}>
            {usuario.sexo === "mujer" ? "Mujer" : "Hombre"}, {usuario.edad} años, {usuario.mediciones.length} mediciones
          </Text>
        </Text>
      </View>

      {/*
        La franja solo sale en una urgencia. Cada tarjeta ya lleva su propio
        "ve de inmediato si aparece", así que ponerla siempre repetía el mismo
        texto dos veces en la misma pantalla: se veía al renderizar. Cuando la
        señal es Inmediata sí gana el sitio de arriba, porque ahí lo que importa
        no es la tarjeta sino salir.
      */}
      {peor.urgencia === "Inmediata" && peor.ruta.vigilar ? (
        <Franja
          color={COLOR.inmediata}
          titulo="Ve ya si aparece"
          texto={peor.ruta.vigilar}
        />
      ) : null}

      <View style={s.tarjetas}>
        {senales.map(x => <Tarjeta key={x.codigo} senal={x} />)}
      </View>

      {paquete ? <BloqueP paquete={paquete} onPedir={onPedirCredito} /> : null}

      {onSubirExamen ? (
        <View style={s.examen}>
          <Etiqueta>¿Te hiciste un examen?</Etiqueta>
          <Text style={s.examenTexto}>
            Si traes un examen de laboratorio en papel, la app te dice qué significa cada número.
          </Text>
          <Boton texto="Subir un examen de laboratorio" tono="borde" onPress={onSubirExamen} />
        </View>
      ) : null}

      <Pie>{DISCLAIMER}</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  contexto: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: ESPACIO.borde, paddingTop: 18, paddingBottom: 16,
    borderBottomWidth: 3, borderBottomColor: COLOR.tinta,
  },
  contextoCifra: { ...DISPLAY, fontSize: 46, lineHeight: 42, letterSpacing: -2, color: COLOR.tinta },
  contextoTexto: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "700", color: COLOR.tinta },
  contextoMeta: { fontSize: 13.5, fontWeight: "400", color: COLOR.gris },

  sanoTexto: {
    fontSize: 15, lineHeight: 21, color: COLOR.gris, paddingHorizontal: ESPACIO.borde,
  },

  tarjetas: { marginTop: 4 },
  tarjeta: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  barraColor: { width: 10 },
  tarjetaCuerpo: { flex: 1, paddingVertical: 15, paddingLeft: 14, paddingRight: ESPACIO.borde },
  tarjetaUrgencia: { ...TIPO.etiqueta, marginBottom: 4 },
  tarjetaDescripcion: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: COLOR.tinta },
  tarjetaAhora: { fontSize: 15, lineHeight: 20, fontWeight: "900", marginTop: 8 },

  tarjetaDatos: { marginTop: 12, gap: 7 },
  dato: { flexDirection: "row", gap: 12 },
  datoK: { ...TIPO.etiqueta, fontSize: 11, color: COLOR.gris, width: 62, paddingTop: 2 },
  datoV: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "600", color: COLOR.tinta },

  vigilar: { marginTop: 12, borderLeftWidth: 4, borderLeftColor: COLOR.inmediata, paddingLeft: 10, gap: 1 },
  vigilarK: { ...TIPO.etiqueta, fontSize: 11, color: COLOR.inmediata },
  vigilarV: { fontSize: 13.5, lineHeight: 18, color: COLOR.tinta },

  fuente: { ...TIPO.pie, color: COLOR.gris, marginTop: 12 },

  examen: { marginTop: 26 },
  examenTexto: {
    fontSize: 14.5, lineHeight: 20, color: COLOR.gris,
    paddingHorizontal: ESPACIO.borde, marginBottom: 4,
  },

  paquete: { marginTop: 22 },
  paqueteTitulo: {
    ...TIPO.titulo, color: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde, paddingTop: 16, paddingBottom: 12,
  },
  lineas: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  credito: {
    fontSize: 14.5, lineHeight: 20, fontWeight: "600", color: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde, marginTop: 14,
  },
});
