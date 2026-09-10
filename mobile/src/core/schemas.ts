import { z } from "zod";

/** 1) Alerta de salud (salida de MedPsy). Orientativa, nunca diagnóstico. */
export const AlertaSchema = z.object({
  senal: z.string().describe("Qué se observa en las mediciones, en lenguaje simple"),
  /**
   * La ruta: qué hacer. Viene de `Senal.ruta` y se copia tal cual, el modelo no
   * la inventa. Es lo único que de verdad le importa a la persona.
   */
  ruta_tipo: z.enum(["emergencia", "autocuidado", "consulta", "examen", "examen_y_consulta"]),
  ruta_ahora: z.string().optional().describe("Qué hacer en este momento, antes de moverse"),
  ruta_examen: z.string().optional().describe("Qué examen, si la ruta lo incluye"),
  ruta_donde: z.string().describe("Casa, centro de salud o laboratorio"),
  ruta_especialista: z.string().describe("A quién le corresponde"),
  ruta_vigilar: z.string().optional().describe("Síntomas que obligan a ir de inmediato aunque la ruta diga otra cosa"),
  /** Rango, no un número exacto: los precios de laboratorio varían por sede. Ausente si no hay precio con fuente. */
  costo_min_usd: z.number().min(0).max(2000).optional(),
  costo_max_usd: z.number().min(0).max(2000).optional(),
  costo_nota: z.string().optional().describe("Aviso de que el precio es un rango aproximado y varía por laboratorio"),
  urgencia: z.enum(["Rutinaria", "Prioritaria", "Inmediata"]),
  mensaje: z.string().describe("Plain-language text for the person, max 3 sentences (English)"),
  /**
   * De dónde sale el umbral que disparó la alerta. Viene de `Senal.fuente` y se
   * copia tal cual: el modelo no la redacta. Va en pantalla para que la app
   * cite en vez de afirmar, que es lo que exige el reto Tether Psy (`ADR-008`).
   */
  fuente: z.string(),
  disclaimer: z.string(),
});
export type Alerta = z.infer<typeof AlertaSchema>;

/** 2) Campos extraídos de documentos (salida del LLM tras OCR). Las imágenes se borran. */
export const CedulaSchema = z.object({
  numero: z.string().regex(/^(\d{1,2}|PE|E|N|\d{1,2}(AV|PI))-\d{1,4}-\d{1,6}$/, "formato de cédula panameña"),
  nombre: z.string().min(3),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_expiracion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confianza: z.number().min(0).max(1),
});
export const IngresosSchema = z.object({
  empleador_o_actividad: z.string(),
  ingreso_mensual_usd: z.number().min(100).max(20000),
  tipo: z.enum(["asalariado", "independiente", "jubilado", "otro"]),
  fecha_documento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confianza: z.number().min(0).max(1),
});
export const ExtractoSchema = z.object({
  banco: z.string(),
  saldo_promedio_usd: z.number().min(0),
  meses_cubiertos: z.number().int().min(1).max(12),
  confianza: z.number().min(0).max(1),
});

/**
 * Examen de laboratorio fotografiado (vía B). El modelo transcribe lo que dice
 * el papel y nada más: quién está alto o bajo lo decide `clasificar()` de
 * `marcadores.ts` contra su rango citado.
 */
export const LaboratorioSchema = z.object({
  lecturas: z.array(z.object({
    codigo: z.enum(["GLU", "HB", "PLQ", "CREA", "COL", "HTO", "TSH"]),
    nombre: z.string(),
    valor: z.number(),
    unidad: z.string(),
  })).min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confianza: z.number().min(0).max(1),
});
export type Laboratorio = z.infer<typeof LaboratorioSchema>;

/** 3) Solicitud que viaja al banco. Solo JSON; sin imágenes ni motivo de salud. */
export const SolicitudSchema = z.object({
  id: z.string().uuid(),
  creada: z.string().datetime(),
  proposito: z.literal("salud"), // categoría genérica; el detalle clínico NUNCA sale del dispositivo
  /** Piso por debajo del paquete mas barato (sobrepeso, B/. 28): la app
   * ofrece credito por cualquier monto y el nodo tiene que poder recibirlo. */
  monto_solicitado_usd: z.number().min(25).max(5000),
  cedula: CedulaSchema,
  ingresos: IngresosSchema,
  extracto: ExtractoSchema.optional(),
  firma_hash: z.string().optional(),
  estado: z.enum(["borrador", "pendiente", "enviada", "respondida", "aceptada", "rechazada"]),
});
export type Solicitud = z.infer<typeof SolicitudSchema>;

/** 4) Respuesta del banco (nodo mock). */
export const RespuestaBancoSchema = z.object({
  solicitud_id: z.string().uuid(),
  decision: z.enum(["aprobada", "rechazada", "revision"]),
  monto_aprobado_usd: z.number().optional(),
  plazo_meses: z.number().int().optional(),
  tasa_anual_pct: z.number().optional(),
  cuota_mensual_usd: z.number().optional(),
  motivo: z.string(),
  ts: z.string().datetime(),
});
export type RespuestaBanco = z.infer<typeof RespuestaBancoSchema>;

/** JSON Schema para responseFormat del SDK (json_schema). */
export const toJsonSchema = (s: z.ZodTypeAny) => {
  // zod-to-json-schema se agrega si hace falta; por ahora los prompts incluyen el shape explícito.
  return s;
};
