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
 *
 * La jerarquía la corrigió una captura del teléfono. La versión anterior
 * arrancaba con la frase clínica de `descripcion` ("glucosa en ayunas promedio
 * 131 mg/dL en las últimas 3 tomas") y con las cuatro señales apiladas, y no se
 * entendía qué te pasaba. Ahora manda una: su título en llano, su cifra grande,
 * y qué hacer. Las demás quedan debajo, resumidas.
 */
import { View, Text, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales, type Senal } from "./core/reglas";
import { armarPaquete, mensajeCredito, type Paquete } from "./core/paquete";
import {
  Pantalla, Encabezado, Veredicto, BarraVeredicto, Cifra, FilaRuta, FilaLista,
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

/** Las demás señales: título, cifra y a dónde ir. El detalle clínico no cabe. */
function Resumen({ senal }: { senal: Senal }) {
  const color = COLOR_URGENCIA[senal.urgencia];
  return (
    <View style={s.resumen}>
      <View style={[s.barraColor, { backgroundColor: color }]} />
      <View style={s.resumenCuerpo}>
        <Text style={[s.resumenUrgencia, { color }]}>{VERBO_URGENCIA[senal.urgencia]}</Text>
        <Text style={s.resumenTitulo}>{senal.titulo}</Text>
        <Text style={s.resumenMedida}>
          {senal.medida.valor} {senal.medida.unidad}. {senal.medida.referencia}.
        </Text>
        <Text style={s.resumenRuta}>{senal.ruta.examen ?? senal.ruta.donde}</Text>
        <Text style={s.fuente}>{senal.fuente}</Text>
      </View>
    </View>
  );
}

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

      <BandaTotal
        etiqueta={p.meses > 0 ? "Todo el año" : "Todo junto"}
        valor={balboas(p.total_min, p.total_max)}
      />

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
  onSubirExamen?: () => void;
}) {
  const senales = detectarSenales(usuario.mediciones)
    .sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]);
  const paquete = armarPaquete(senales);

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
        <Pie>
          Estar en rango no descarta una enfermedad. Si te sientes mal, ve al centro de salud sin
          esperar a que esta app diga nada.
        </Pie>
      </Pantalla>
    );
  }

  const peor = senales[0];
  const demas = senales.slice(1);
  const r = peor.ruta;

  return (
    <Pantalla>
      <Encabezado meta="Salir" onVolver={onVolver} />

      {/*
        Qué te pasa manda, y la urgencia va encima en pequeño. Al revés, que es
        como estaba, el titular era "ANDA PRONTO" y el hallazgo no aparecía por
        ningún lado: se veía en la captura del teléfono.
      */}
      <Veredicto
        color={COLOR_URGENCIA[peor.urgencia]}
        antetitulo={VERBO_URGENCIA[peor.urgencia]}
        palabra={peor.titulo}
        mayusculas={false}
        simbolo={peor.urgencia === "Rutinaria" ? "listo" : "alerta"}
      />

      <Cifra
        valor={peor.medida.valor}
        unidad={peor.medida.unidad}
        nota={peor.medida.referencia}
      />

      {r.ahora ? (
        <Franja color={COLOR_URGENCIA[peor.urgencia]} titulo="Hazlo ahora" texto={r.ahora} />
      ) : null}

      {/*
        "Conviene" y no "te recomiendo": la ruta sale de una guía citada, no de
        un criterio nuestro. La app no receta.
      */}
      <Etiqueta>Qué conviene hacer</Etiqueta>
      <View style={s.ruta}>
        {r.examen ? <FilaRuta simbolo="documento" etiqueta="El examen" valor={r.examen} /> : null}
        <FilaRuta simbolo="salud" etiqueta="Dónde" valor={r.donde} />
        <FilaRuta
          simbolo="persona"
          etiqueta="Quién"
          valor={r.especialista}
          ultima={!peor.costo}
        />
        {peor.costo ? (
          <FilaRuta
            simbolo="moneda"
            etiqueta="Cuesta"
            valor={`${balboas(peor.costo.min_usd, peor.costo.max_usd)}, aproximado`}
            ultima
          />
        ) : null}
      </View>

      {r.vigilar ? (
        <Franja color={COLOR.inmediata} titulo="Ve ya si aparece" texto={r.vigilar} />
      ) : null}

      {onSubirExamen && peor.ruta.examen ? (
        <Boton texto="Ya me hice el examen" tono="borde" onPress={onSubirExamen} />
      ) : null}

      <Pie>{peor.fuente}</Pie>

      {demas.length > 0 ? (
        <>
          <Etiqueta>
            {demas.length === 1 ? "Una señal más" : `${demas.length} señales más`}
          </Etiqueta>
          <View style={s.resumenes}>
            {demas.map(x => <Resumen key={x.codigo} senal={x} />)}
          </View>
        </>
      ) : null}

      {paquete ? <BloqueP paquete={paquete} onPedir={onPedirCredito} /> : null}

      <Pie>{DISCLAIMER}</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  hallazgo: { ...TIPO.titulo, fontSize: 25, lineHeight: 28, color: COLOR.sobreColor, marginTop: -4 },

  sanoTexto: {
    fontSize: 15, lineHeight: 21, color: COLOR.gris, paddingHorizontal: ESPACIO.borde,
  },

  ruta: { borderTopWidth: 3, borderTopColor: COLOR.tinta },

  resumenes: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  resumen: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  barraColor: { width: 10 },
  resumenCuerpo: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: ESPACIO.borde },
  resumenUrgencia: { ...TIPO.etiqueta, fontSize: 11, marginBottom: 3 },
  resumenTitulo: { ...DISPLAY, fontSize: 19, lineHeight: 23, color: COLOR.tinta },
  resumenMedida: { fontSize: 14, lineHeight: 19, fontWeight: "600", color: COLOR.tinta, marginTop: 3 },
  resumenRuta: { fontSize: 14, lineHeight: 19, color: COLOR.gris, marginTop: 4 },
  fuente: { ...TIPO.pie, color: COLOR.gris, marginTop: 8 },

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
