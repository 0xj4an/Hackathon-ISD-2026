/**
 * Nombres de marca para la demo / video.
 *
 * - Teléfono: QVAC MedPsy de verdad (extracción tras OCR).
 * - Banco: motor de reglas `decidir()` — no es LLM; el nombre es del producto.
 */
export const MODELO_TELEFONO = {
  id: "INA-PULSE",
  linea: "MedPsy 1.7B · Q8",
  chip: "QVAC on-device",
  frase: "INA-PULSE · MedPsy 1.7B",
} as const;

export const MODELO_BANCO = {
  id: "ISTMO-RISK",
  linea: "Motor 4-2013 · v2026.09",
  chip: "estudio en el banco",
  frase: "ISTMO-RISK · Motor 4-2013",
} as const;
