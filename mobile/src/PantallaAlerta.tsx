/**
 * Resultado del historial en tres pasos: qué te pasa, qué conviene hacer, y cuánto cuesta.
 *
 * Las señales las deciden las reglas de `core/reglas.ts`, no el modelo
 * (`ADR-005`). Esta pantalla muestra esas reglas de inmediato. MedPsy entra
 * después, solo para redactar `mensaje`: primero en el teléfono, si no puede
 * pide al pueblo. Si los dos fallan, se queda lo de las reglas.
 *
 * Por qué tres pasos y no uno. La primera versión ponía el hallazgo, las cuatro
 * señales completas, la ruta y las diez líneas del paquete en la misma pantalla.
 * Verla en el teléfono dejó claro que no se entendía nada: cuando todo compite,
 * no gana el hallazgo, que es lo único que hay que leer si no hay tiempo. Ahora
 * cada paso responde una pregunta y ofrece un botón para la siguiente.
 *
 * El orden de `ADR-010` se conserva: la señal primero con su instrucción
 * inmediata, el costo después. En una urgencia el precio no compite con el
 * "anda ya", pero tampoco se calla, y ahora está a un toque en vez de a media
 * pantalla de scroll.
 *
 * Los tres pasos viven en este archivo y no en `App.tsx` a propósito: son un
 * solo asunto (el resultado del historial), y el enrutado de arriba no tiene por qué enterarse.
 */
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Usuario } from "./usuarios";
import { detectarSenales, type Senal } from "./core/reglas";
import { redactarAlerta } from "./redactarAlerta";
import { fichaModo, saltarMedPsyLocal } from "./modo";
import { armarPaquete, mensajeCredito, type Paquete } from "./core/paquete";
import { fraseLecturas, fraseMeses, resumenHistorial } from "./historial";
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

type Paso = "alerta" | "ruta" | "costo";
type FalloRedaccion = { motivo: string; tecnico: string };

export default function PantallaAlerta({
  usuario, onVolver, onPedirCredito, onSubirExamen,
}: {
  usuario: Usuario;
  onVolver: () => void;
  onPedirCredito?: (costoMin: number, costoMax: number) => void;
  onSubirExamen?: () => void;
}) {
  const senales = useMemo(
    () => detectarSenales(usuario.mediciones)
      .sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia]),
    [usuario.mediciones],
  );
  const peor = senales[0];
  const [paso, setPaso] = useState<Paso>("alerta");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fallo, setFallo] = useState<FalloRedaccion | null>(null);
  const [intento, setIntento] = useState(0);
  const [redactando, setRedactando] = useState(senales.length > 0);

  useEffect(() => {
    if (!peor) return;
    let vivo = true;
    setRedactando(true);
    setMensaje(null);
    setFallo(null);
    void redactarAlerta(peor, usuario.mediciones).then(r => {
      if (!vivo) return;
      if (r.ok) setMensaje(r.alerta.mensaje);
      else setFallo({ motivo: r.motivo, tecnico: r.tecnico });
      setRedactando(false);
    });
    return () => { vivo = false; };
  }, [peor, usuario.mediciones, intento]);

  const paquete = armarPaquete(senales);

  if (senales.length === 0) {
    return <Sano usuario={usuario} onVolver={onVolver} onSubirExamen={onSubirExamen} />;
  }

  const demas = senales.slice(1);
  const resumen = resumenHistorial(usuario.mediciones);

  if (paso === "ruta") {
    return (
      <Ruta
        peor={peor}
        demas={demas}
        hayCosto={!!paquete}
        onVolver={() => setPaso("alerta")}
        onVerCosto={() => setPaso("costo")}
        onSubirExamen={onSubirExamen}
      />
    );
  }

  if (paso === "costo" && paquete) {
    return (
      <Costo
        paquete={paquete}
        onVolver={() => setPaso("ruta")}
        onPedirCredito={onPedirCredito}
      />
    );
  }

  return (
    <Alerta
      peor={peor}
      demas={demas}
      lecturas={resumen.mediciones}
      periodo={fraseMeses(resumen)}
      mensaje={mensaje}
      fallo={fallo}
      redactando={redactando}
      onSalir={onVolver}
      onVerRuta={() => setPaso("ruta")}
      onReintentar={() => setIntento(n => n + 1)}
    />
  );
}

/**
 * Paso 1. Qué encontré, todo, y nada más.
 *
 * Todos los hallazgos salen aquí: esconder tres de cuatro es ocultarle a alguien
 * algo suyo, y encima la lista es corta. Lo que hacia ilegible la versión
 * anterior no era el número de hallazgos, era que cada uno venía como una ficha
 * clínica entera con ruta, costo y fuente. Un titulo y su cifra ocupan una fila.
 *
 * Lo que sí espera al siguiente paso es qué hacer con cada uno, que es una
 * pregunta distinta.
 */
function Alerta({ peor, demas, lecturas, periodo, mensaje, fallo, redactando, onSalir, onVerRuta, onReintentar }: {
  peor: Senal; demas: Senal[]; lecturas: number; periodo: string;
  mensaje: string | null; fallo: FalloRedaccion | null; redactando: boolean;
  onSalir: () => void; onVerRuta: () => void; onReintentar: () => void;
}) {
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  return (
    <Pantalla>
      <Encabezado meta="Salir" onVolver={onSalir} />
      <Franja color={fichaModo().color} titulo={fichaModo().titulo} texto={fichaModo().franja} />

      <Veredicto
        color={COLOR_URGENCIA[peor.urgencia]}
        antetitulo={VERBO_URGENCIA[peor.urgencia]}
        palabra={peor.titulo}
        detalle={mensaje ?? (redactando
          ? (saltarMedPsyLocal()
            ? "Este teléfono no carga el modelo. Delegando al nodo…"
            : "El modelo está explicando esto en el teléfono.")
          : undefined)}
        mayusculas={false}
        simbolo={peor.urgencia === "Rutinaria" ? "listo" : "alerta"}
      />

      <Cifra valor={peor.medida.valor} unidad={peor.medida.unidad} nota={peor.medida.referencia} />

      {fallo && !redactando ? (
        <View style={s.falloCaja}>
          <Franja
            color={COLOR.tinta}
            titulo="La explicación falló"
            texto={`El hallazgo sí vale: lo decidieron las reglas. ${fallo.motivo}`}
          />
          <Pressable
            onPress={() => setDetalleAbierto(v => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detalleAbierto }}
            style={s.falloToggle}
          >
            <Text style={s.falloToggleTexto}>
              {detalleAbierto ? "Ocultar detalle técnico" : "Ver detalle técnico"}
            </Text>
            <Text style={s.falloChevron}>{detalleAbierto ? "▴" : "▾"}</Text>
          </Pressable>
          {detalleAbierto ? (
            <Text selectable style={s.falloTecnico}>{fallo.tecnico}</Text>
          ) : null}
          <Boton texto="Reintentar la explicación" tono="borde" onPress={onReintentar} />
        </View>
      ) : null}

      {peor.ruta.ahora ? (
        <Franja color={COLOR_URGENCIA[peor.urgencia]} titulo="Hazlo ahora" texto={peor.ruta.ahora} />
      ) : null}

      {peor.ruta.vigilar ? (
        <Franja color={COLOR.inmediata} titulo="Ve ya si aparece" texto={peor.ruta.vigilar} />
      ) : null}

      {/*
        El rotulo tiene que decir tres cosas o no dice ninguna: que son, de donde
        salieron y que se va a hacer con ellas. "Y esto también" no decía nada, y
        se noto en que hubo que preguntarlo.
      */}
      {demas.length > 0 ? (
        <>
          <Etiqueta>
            {demas.length === 1
              ? "También encontré esto en el mismo historial"
              : `También encontré estas ${demas.length} en el mismo historial`}
          </Etiqueta>
          <Text style={s.deDonde}>
            Misma persona, {lecturas} lecturas. {periodo}. Arriba va lo más urgente; aquí el resto. Qué hacer con cada una, en el siguiente paso.
          </Text>
          <View style={s.resumenes}>
            {demas.map(x => <Resumen key={x.codigo} senal={x} />)}
          </View>
        </>
      ) : null}

      <Boton texto="Ver qué conviene hacer" onPress={onVerRuta} />

      <Pie>{peor.fuente}</Pie>
      {mensaje ? <Pie>Redactado en el teléfono por MedPsy. El umbral lo deciden las reglas.</Pie> : null}
      {fallo && !mensaje ? <Pie>Sin explicación del modelo. Lo que ves sale solo de las reglas.</Pie> : null}
      <Pie>{DISCLAIMER}</Pie>
    </Pantalla>
  );
}

/** Paso 2. Qué conviene hacer, con qué examen, dónde y con quién. */
function Ruta({ peor, demas, hayCosto, onVolver, onVerCosto, onSubirExamen }: {
  peor: Senal;
  demas: Senal[];
  hayCosto: boolean;
  onVolver: () => void;
  onVerCosto: () => void;
  onSubirExamen?: () => void;
}) {
  const r = peor.ruta;
  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      {/*
        "Conviene" y no "recomendamos": la ruta sale de una guía citada, no de un
        criterio nuestro. La app no receta.
      */}
      <BarraVeredicto color={COLOR_URGENCIA[peor.urgencia]} texto="Qué conviene hacer" />

      <View style={s.arriba}>
        <Text style={s.titular}>{peor.titulo}</Text>
      </View>

      <View style={s.ruta}>
        {r.examen ? <FilaRuta simbolo="documento" etiqueta="El examen" valor={r.examen} /> : null}
        <FilaRuta simbolo="salud" etiqueta="Dónde" valor={r.donde} />
        <FilaRuta simbolo="persona" etiqueta="Quién" valor={r.especialista} ultima />
      </View>

      {onSubirExamen && r.examen ? (
        <Boton texto="Ya me hice el examen" tono="borde" onPress={onSubirExamen} />
      ) : null}

      {demas.length > 0 ? (
        <>
          <Etiqueta>Qué hacer con lo demás</Etiqueta>
          <View style={s.resumenes}>
            {demas.map(x => <Resumen key={x.codigo} senal={x} conRuta />)}
          </View>
        </>
      ) : null}

      {hayCosto ? <Boton texto="Ver cuánto cuesta" tono="prioritaria" onPress={onVerCosto} /> : null}

      <Pie>{DISCLAIMER}</Pie>
    </Pantalla>
  );
}

/**
 * Paso 3. Lo que cuesta atenderlo, en modo denso: la barra reemplaza al bloque
 * de veredicto y el total en negro toma el relevo como elemento dominante. Sin
 * este paso el crédito no se puede ofrecer con honestidad, porque nadie sabe
 * por cuánto pedirlo (`ADR-010`).
 */
function Costo({ paquete, onVolver, onPedirCredito }: {
  paquete: Paquete;
  onVolver: () => void;
  onPedirCredito?: (min: number, max: number) => void;
}) {
  const p = paquete;
  const hayEstimados = p.lineas.some(l => l.estimado);
  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />
      <BarraVeredicto
        color={COLOR.prioritaria}
        texto={p.meses > 0 ? "Lo que cuesta el año" : "Lo que cuesta"}
        derecha={p.meses > 0 ? `${p.meses} meses` : undefined}
      />

      <View style={s.arriba}>
        <Text style={s.titular}>{p.titulo}</Text>
      </View>

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

      {onPedirCredito ? (
        <Boton
          texto="Pedir un crédito de salud"
          tono="prioritaria"
          onPress={() => onPedirCredito(p.total_min, p.total_max)}
        />
      ) : null}

      <Pie>{p.nota}</Pie>
    </Pantalla>
  );
}

/** Que no diga nada vale tanto como la alerta, y por eso tiene su pantalla. */
function Sano({ usuario, onVolver, onSubirExamen }: {
  usuario: Usuario; onVolver: () => void; onSubirExamen?: () => void;
}) {
  const resumen = resumenHistorial(usuario.mediciones);
  return (
    <Pantalla>
      <Encabezado meta="Salir" onVolver={onVolver} />
      <Franja color={fichaModo().color} titulo={fichaModo().titulo} texto={fichaModo().franja} />
      <Veredicto
        color={COLOR.rutinaria}
        palabra={"Todo\nen orden"}
        detalle="Ninguna de tus mediciones se salió de rango. No hay nada que hacer hoy."
        simbolo="listo"
      />
      <Etiqueta>Lo que revisé</Etiqueta>
      <View style={s.sanoBloque}>
        <Text style={s.sanoTexto}>{fraseLecturas(resumen)}</Text>
        <Text style={[s.sanoTexto, s.sanoHueco]}>
          {fraseMeses(resumen)}. Contra las 14 reglas de referencia.
          Te aviso solo cuando algo se salga de rango.
        </Text>
      </View>

      {onSubirExamen ? (
        <Boton texto="Tengo un examen de laboratorio" tono="borde" onPress={onSubirExamen} />
      ) : null}
      <Pie>
        Estar en rango no descarta una enfermedad. Si te sientes mal, ve al centro de salud sin
        esperar a que esta app diga nada.
      </Pie>
    </Pantalla>
  );
}

/**
 * Un hallazgo en una fila: la urgencia por color, el título y su cifra.
 *
 * `conRuta` añade a dónde ir. En el paso 1 sobra, porque ahí la pregunta es qué
 * encontré; en el paso 2 es justo lo que se viene a leer.
 */
function Resumen({ senal, conRuta }: { senal: Senal; conRuta?: boolean }) {
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
        {conRuta ? (
          <Text style={s.resumenRuta}>{senal.ruta.examen ?? senal.ruta.donde}</Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  deDonde: {
    fontSize: 13.5, lineHeight: 18, color: COLOR.gris,
    paddingHorizontal: ESPACIO.borde, marginTop: -4, marginBottom: 12,
  },

  falloCaja: { marginBottom: 4 },
  falloToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ESPACIO.borde,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.separador,
  },
  falloToggleTexto: { ...TIPO.etiqueta, color: COLOR.gris, fontSize: 11 },
  falloChevron: { fontSize: 14, color: COLOR.gris },
  falloTecnico: {
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 15,
    color: COLOR.tinta,
    backgroundColor: COLOR.hundido,
    paddingHorizontal: ESPACIO.borde,
    paddingVertical: 12,
  },

  arriba: { paddingHorizontal: ESPACIO.borde, paddingTop: 16, paddingBottom: 14 },
  titular: { ...DISPLAY, fontSize: 28, lineHeight: 31, letterSpacing: -1, color: COLOR.tinta },

  sanoBloque: {
    borderTopWidth: 3, borderTopColor: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde, paddingTop: 14,
  },
  sanoTexto: { fontSize: 15, lineHeight: 21, color: COLOR.gris },
  sanoHueco: { marginTop: 8 },

  ruta: { borderTopWidth: 3, borderTopColor: COLOR.tinta },

  resumenes: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  resumen: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.separador },
  barraColor: { width: 10 },
  resumenCuerpo: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: ESPACIO.borde },
  resumenUrgencia: { ...TIPO.etiqueta, fontSize: 11, marginBottom: 3 },
  resumenTitulo: { ...DISPLAY, fontSize: 19, lineHeight: 23, color: COLOR.tinta },
  resumenMedida: { fontSize: 14, lineHeight: 19, fontWeight: "600", color: COLOR.tinta, marginTop: 3 },
  resumenRuta: { fontSize: 14, lineHeight: 19, color: COLOR.gris, marginTop: 4 },

  lineas: { borderTopWidth: 3, borderTopColor: COLOR.tinta },
  credito: {
    fontSize: 14.5, lineHeight: 20, fontWeight: "600", color: COLOR.tinta,
    paddingHorizontal: ESPACIO.borde, marginTop: 14,
  },
});
