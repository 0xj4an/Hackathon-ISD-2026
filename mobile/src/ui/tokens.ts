/**
 * Señalética: la dirección visual de Ina Igar.
 *
 * La app no es una interfaz, es un letrero. Bloques de color a sangre, una
 * palabra por pantalla, un solo botón. Está pensada para leerse a pleno sol,
 * de lejos, y a tamaño diminuto en el video del jurado.
 *
 * Dos reglas gobiernan todo lo demás:
 *
 * 1. **Un solo color de señal por pantalla.** Manda el más urgente; los otros
 *    esperan su turno. El negro no es una señal, es el cierre: el total y el
 *    estado del envío.
 * 2. **Un solo elemento dominante por pantalla.** Cuando hay una lista larga
 *    (el paquete son diez líneas) el veredicto se encoge a barra y el total
 *    en negro toma el relevo. Lo que se conserva no es el tamaño de la letra,
 *    es que siempre haya una cosa que mande.
 */

export const COLOR = {
  fondo: "#FFFFFF",
  tinta: "#101010",
  gris: "#6B6B6B",
  separador: "#E2E2E2",
  /** Fondo hundido, para campos y estados apagados. */
  hundido: "#F2F2F2",
  /**
   * Texto que todavía no vale: el placeholder de un campo vacío, el paso de la
   * revisión que no ha ocurrido. Más claro que `gris`, y a propósito: no está
   * pensado para leerse, está pensado para verse como un hueco.
   */
  apagado: "#9A9A9A",

  inmediata: "#C42B18",
  prioritaria: "#A85F00",
  rutinaria: "#0B7A4B",

  /** Texto sobre bloque de color. Blanco puro, siempre. */
  sobreColor: "#FFFFFF",
  /** Texto secundario sobre el bloque negro. */
  sobreTinta: "#B0B0B0",
} as const;

/**
 * La familia de display.
 *
 * El diseño se dibujó con Archivo Black. Meterla de verdad obliga a instalar
 * `expo-font`, que es módulo nativo, y a otro prebuild. El bloque 0 se acaba de
 * cerrar en el 17 Pro Max (`48a73a0`) y Android quedó parqueado tras el abort de
 * Bare: justo después de que un build nativo frágil por fin arranca no es el
 * momento de meterle una dependencia nueva.
 *
 * Mientras tanto el peso 900 del sistema da la SF Pro Black en iOS y la Roboto
 * Black en Android. Las dos son grotescas negras y sostienen la dirección; no
 * son Archivo, que es más estrecha y de remates más secos.
 *
 * Para cambiar a Archivo cuando el bloque 0 esté verde:
 *   1. `npx expo install expo-font`
 *   2. poner los .ttf en `assets/fonts/`
 *   3. cargarlos con `useFonts` en `App.tsx`
 *   4. añadir `fontFamily: "ArchivoBlack"` aquí abajo
 * Nada más cambia: todas las pantallas leen de esta constante.
 */
export const DISPLAY = {
  fontWeight: "900",
  letterSpacing: -0.4,
} as const;

/** Escala tipográfica. El piso es 13: por debajo no baja ni en modo denso. */
export const TIPO = {
  /** El veredicto. Una o dos palabras, nunca más. */
  veredicto: { ...DISPLAY, fontSize: 38, lineHeight: 42, letterSpacing: -1 },
  /** Cifra grande: el valor medido, el total, el monto aprobado. */
  cifra: { ...DISPLAY, fontSize: 54, lineHeight: 58, letterSpacing: -2 },
  cifraMedia: { ...DISPLAY, fontSize: 30, lineHeight: 34, letterSpacing: -1 },
  /** Título de pantalla en modo denso. */
  titulo: { ...DISPLAY, fontSize: 23, lineHeight: 25 },
  /** El wordmark y las barras. */
  barra: { ...DISPLAY, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase" },
  /** Cuerpo en modo señal. Nunca por debajo de 13. */
  cuerpo: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  /** Cuerpo en modo denso, el piso absoluto. */
  denso: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
  /** Etiqueta de campo: DÓNDE, QUIÉN, CUESTA. */
  etiqueta: {
    fontSize: 12, fontWeight: "700", letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  /** Pie: fuentes, disclaimers, avisos legales. */
  pie: { fontSize: 11, lineHeight: 16 },
} as const;

export const ESPACIO = { borde: 20, entre: 14, apretado: 8 } as const;

/** Altura mínima de cualquier cosa que se toque. */
export const TOQUE = 48;

export type Urgencia = "Inmediata" | "Prioritaria" | "Rutinaria";

export const COLOR_URGENCIA: Record<Urgencia, string> = {
  Inmediata: COLOR.inmediata,
  Prioritaria: COLOR.prioritaria,
  Rutinaria: COLOR.rutinaria,
};

/**
 * La urgencia dicha como la diría un letrero, no como la nombra el código.
 * "Prioritaria" no le dice nada a nadie; "anda pronto" sí.
 */
export const VERBO_URGENCIA: Record<Urgencia, string> = {
  Inmediata: "Anda ya",
  Prioritaria: "Anda pronto",
  Rutinaria: "Sin prisa",
};
