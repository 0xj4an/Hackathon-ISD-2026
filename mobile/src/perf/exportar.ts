/**
 * Sacar los registros del telefono.
 *
 * `perf.jsonl` y `qvac.jsonl` se escriben en `Paths.document`, que es la carpeta
 * privada de la app. Ahi dentro no le sirven a nadie: `C10` pide el archivo con
 * una linea por inferencia, `C2` pide los TTFT medidos, y el reto Tether Psy
 * exige log de rendimiento estructurado. Los tres se entregan fuera del
 * telefono.
 *
 * Sin esto, los numeros existen, se escriben, y se pierden al desinstalar la
 * app. Es la unica evidencia del proyecto que no se puede regenerar: nace de
 * haber corrido de verdad en un aparato de verdad.
 */
import { File, Paths } from "expo-file-system";
import { PERF_FILE, QVAC_FILE, getAppLogger, recordError } from "./logger";

export type Registro = {
  nombre: string;
  existe: boolean;
  lineas: number;
  bytes: number;
};

const LIBROS = [PERF_FILE, QVAC_FILE];

function leer(nombre: string): { file: File; texto: string | null } {
  const file = new File(Paths.document, nombre);
  if (!file.exists) return { file, texto: null };
  try {
    return { file, texto: file.textSync() };
  } catch (err) {
    recordError("leerRegistro", err);
    return { file, texto: null };
  }
}

/** Cuantas lineas tiene cada registro, para poder decirlo en pantalla. */
export function estadoRegistros(): Registro[] {
  return LIBROS.map((nombre) => {
    const { file, texto } = leer(nombre);
    return {
      nombre,
      existe: texto !== null,
      lineas: texto ? texto.split("\n").filter((l) => l.trim()).length : 0,
      bytes: texto ? texto.length : (file.exists ? (file.size ?? 0) : 0),
    };
  });
}

/**
 * Abre la hoja de compartir de iOS con el archivo. Desde ahi va a AirDrop,
 * Archivos, correo o lo que el usuario prefiera.
 *
 * Devuelve el motivo si no se pudo, para que la pantalla lo diga en vez de
 * fallar en silencio, que es lo que hace hoy.
 */
export async function compartirRegistro(nombre: string): Promise<string | null> {
  const { file, texto } = leer(nombre);
  if (texto === null) return `Todavía no hay ${nombre}. Corre una inferencia primero.`;
  if (!texto.trim()) return `${nombre} esta vacio.`;
  try {
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return "Este aparato no puede compartir archivos.";
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/x-ndjson",
      dialogTitle: `Registro ${nombre}`,
      UTI: "public.data",
    });
    getAppLogger().info(`registro compartido: ${nombre}`);
    return null;
  } catch (err) {
    recordError("compartirRegistro", err);
    return "No se pudo abrir la hoja de compartir.";
  }
}

/**
 * El contenido en texto, por si compartir falla y toca copiarlo a mano desde
 * la pantalla. Feo, pero recupera la evidencia igual.
 */
export function contenidoRegistro(nombre: string): string {
  return leer(nombre).texto ?? "";
}
