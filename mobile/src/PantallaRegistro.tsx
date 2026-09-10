/**
 * Pantalla de registros. No es para el usuario de la app: es para nosotros.
 *
 * `perf.jsonl` se escribe dentro del telefono y ahi no le sirve a nadie. Esta
 * pantalla es la unica forma de sacarlo. La necesitan `C2` (los TTFT medidos),
 * `C10` (una linea por inferencia) y el reto Tether Psy, que exige log de
 * rendimiento estructurado.
 *
 * Se llega desde la pantalla de entrada. Queda fuera del camino de la demo a
 * proposito: no aparece en el flujo que se graba.
 */
import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Pantalla, Encabezado, BarraVeredicto, Boton, Etiqueta, Franja, Pie } from "./ui/componentes";
import { COLOR, TIPO, ESPACIO } from "./ui/tokens";
import { estadoRegistros, compartirRegistro, type Registro } from "./perf/exportar";
import { SDK_VERSION } from "./perf/logger";

export default function PantallaRegistro({ onVolver }: { onVolver: () => void }) {
  const [registros, setRegistros] = useState<Registro[]>(estadoRegistros);
  const [error, setError] = useState("");

  const compartir = async (nombre: string) => {
    setError("");
    const fallo = await compartirRegistro(nombre);
    if (fallo) setError(fallo);
    setRegistros(estadoRegistros());
  };

  const vacios = registros.every(r => r.lineas === 0);

  return (
    <Pantalla>
      <Encabezado meta="Volver" onVolver={onVolver} />

      <Etiqueta>Registros del aparato</Etiqueta>
      <Text style={s.parrafo}>
        Lo que la app midió corriendo aquí dentro. Sácalo del teléfono antes de
        desinstalar: es la única evidencia que no se puede volver a generar.
      </Text>

      {error ? <Franja color={COLOR.inmediata} titulo="No se pudo" texto={error} /> : null}

      {vacios ? (
        <Franja
          titulo="Todavía no hay nada"
          texto="Los registros se escriben cuando corre una inferencia. Lee un documento o abre una alerta y vuelve."
        />
      ) : null}

      {registros.map(r => (
        <View key={r.nombre} style={s.bloque}>
          <View style={s.fila}>
            <Text style={s.nombre}>{r.nombre}</Text>
            <Text style={s.cuenta}>
              {r.existe ? `${r.lineas} ${r.lineas === 1 ? "línea" : "líneas"}` : "sin crear"}
            </Text>
          </View>
          {r.existe ? <Text style={s.peso}>{(r.bytes / 1024).toFixed(1)} KB</Text> : null}
          <Boton
            texto={`Compartir ${r.nombre}`}
            onPress={() => void compartir(r.nombre)}
            tono={r.lineas ? "tinta" : "borde"}
          />
        </View>
      ))}

      <Boton texto="Actualizar" onPress={() => setRegistros(estadoRegistros())} tono="borde" />

      <Pie>SDK {SDK_VERSION}. Los archivos salen por la hoja de compartir de iOS: AirDrop, Archivos o correo.</Pie>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  parrafo: { ...TIPO.cuerpo, fontWeight: "400", color: COLOR.gris, marginBottom: ESPACIO.entre },
  bloque: { marginBottom: ESPACIO.entre },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  nombre: { ...TIPO.cuerpo, fontWeight: "700", color: COLOR.tinta },
  cuenta: { ...TIPO.cuerpo, fontWeight: "400", color: COLOR.gris, fontVariant: ["tabular-nums"] as const },
  peso: { ...TIPO.pie, color: COLOR.gris, marginBottom: ESPACIO.apretado },
});
