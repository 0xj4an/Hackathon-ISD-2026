// Genera el dataset sintetico del spike de LoRA. Codigo propio del equipo.
//
// Dos tareas mezcladas, con el peso en extraccion (ADR-003):
//   - CEDULA:   texto OCR ruidoso de una cedula panamena -> JSON de campos.
//   - INGRESOS: carta de trabajo, talonario o declaracion jurada -> JSON.
//   - EXTRACTO: estado de cuenta bancario -> JSON.
//   - TRIAJE:   una lectura de laboratorio -> JSON con hallazgo y siguiente paso.
//
// Los tres documentos son los que la app pide de verdad, y sus plantillas usan
// el mismo reparto que las imagenes de `data/documentos/`: entrenar con un
// formato y probar con otro mide el formato, no el modelo.
//
// Los rangos de laboratorio salen de mobile/src/core/marcadores.ts, la misma tabla que usa
// la app, para que el adaptador aprenda exactamente lo que el producto valida.
// Todo es sintetico: ninguna cedula ni resultado corresponde a una persona real.
//
// Uso: node lora-medpsy/make-dataset.mjs

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(import.meta.dirname);

// --- semilla fija: el dataset es identico en cada corrida, y por eso reproducible
let seed = 20260909;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// ---------------------------------------------------------------- MARCADORES
// Se leen de mobile/src/core/marcadores.ts por regex en vez de importar, para no arrastrar
// un paso de compilacion de TypeScript dentro del spike.
const SRC = readFileSync(resolve(DIR, "../../mobile/src/core/marcadores.ts"), "utf8");

// Se extrae campo por campo dentro de cada objeto `{ codigo: ... }`, en vez de
// exigir un orden fijo. Asi el generador no se rompe (ni se salta un marcador
// en silencio) cuando la tabla gana campos nuevos como `porSexo` o `fuente`.
const bloques = SRC.slice(SRC.indexOf("MARCADORES: Marcador[]"))
  .split(/\{\s*codigo:/).slice(1);

const campo = (b, k) => b.match(new RegExp(`${k}:\\s*"([^"]+)"`))?.[1];
const num = (b, k) => {
  const v = b.match(new RegExp(`(?:^|[,{\\s])${k}:\\s*(-?[\\d.]+)`))?.[1];
  return v === undefined ? undefined : Number(v);
};

const MARCADORES = bloques.map((b) => ({
  codigo: b.match(/^\s*"([^"]+)"/)?.[1],
  nombre: campo(b, "nombre"),
  unidad: campo(b, "unidad"),
  min: num(b, "min"),
  max: num(b, "max"),
  hallazgoAlto: campo(b, "hallazgoAlto"),
  hallazgoBajo: campo(b, "hallazgoBajo"),
  pasoAlto: campo(b, "pasoAlto"),
  pasoBajo: campo(b, "pasoBajo"),
})).filter((m) => m.codigo && m.nombre && m.min !== undefined && m.max !== undefined);

if (MARCADORES.length === 0) throw new Error("no pude leer mobile/src/core/marcadores.ts");

// CD4 ya no esta en la tabla (su siguiente paso mencionaba VIH y el brief lo
// prohibe). El filtro se queda como red de seguridad por si alguien lo repone.
const USABLES = MARCADORES.filter((m) => m.codigo !== "CD4");

// ------------------------------------------------------------------ CEDULAS
// Formato panameno, el mismo regex que valida CedulaSchema en mobile/src/core/schemas.ts.
// El sexo va con el nombre: una carta que dice "la senora Jose Manuel" le ensena
// al modelo una incoherencia que ningun documento real tiene.
const MUJERES = ["Ana Lucia", "Maria Elena", "Rosa Idalia", "Yaritza", "Digna Esther", "Marisol"];
const HOMBRES = ["Jose Manuel", "Carlos Alberto", "Luis Fernando", "Ricardo", "Omar", "Eduardo"];
const NOMBRES = [...MUJERES, ...HOMBRES];
const esMujer = (n) => MUJERES.includes(n);
const APELLIDOS = ["Gonzalez", "Rodriguez", "Batista", "Quintero", "Moreno", "Sanchez",
  "Caballero", "Vasquez", "Pinzon", "Aguilar", "Bernal", "Samaniego"];

/**
 * Los 13 prefijos reales del Tribunal Electoral. Los tres ultimos son comarcas
 * indigenas, que es justo donde vive el usuario de esta app, asi que pesan mas
 * que su poblacion: si el modelo se equivoca ahi, se equivoca donde importa.
 * Panama (8) es la mas poblada del pais pero la menos relevante aqui.
 */
const PROVINCIAS = [
  { n: 1, peso: 8 },   // Bocas del Toro
  { n: 2, peso: 6 },   // Cocle
  { n: 3, peso: 4 },   // Colon
  { n: 4, peso: 12 },  // Chiriqui
  { n: 5, peso: 7 },   // Darien
  { n: 6, peso: 6 },   // Herrera
  { n: 7, peso: 6 },   // Los Santos
  { n: 8, peso: 8 },   // Panama
  { n: 9, peso: 12 },  // Veraguas
  { n: 10, peso: 9 },  // Guna Yala, Madugandi, Wargandi
  { n: 11, peso: 8 },  // Embera Wounaan
  { n: 12, peso: 12 }, // Ngabe Bugle
  { n: 13, peso: 4 },  // Panama Oeste (creada en 2014)
];
const TOTAL_PESO = PROVINCIAS.reduce((a, p) => a + p.peso, 0);
const provincia = () => {
  let r = rnd() * TOTAL_PESO;
  for (const p of PROVINCIAS) if ((r -= p.peso) <= 0) return p.n;
  return 8;
};

/** Tomo y asiento como salen de verdad: 8-926-1601, 7-822-1692, PE-5-687. */
const cedulaAleatoria = () => {
  const tipo = rnd();
  // Panameno por nacimiento: sin letra, el primer numero es la provincia.
  if (tipo < 0.86) return `${provincia()}-${int(1, 9999)}-${int(1, 99999)}`;
  // Panameno nacido en el extranjero.
  if (tipo < 0.91) return `PE-${int(1, 99)}-${int(1, 9999)}`;
  // Extranjero residente.
  if (tipo < 0.955) return `E-${int(1, 13)}-${int(1, 99999)}`;
  // Naturalizado. Faltaba, y el esquema lo acepta.
  if (tipo < 0.98) return `N-${int(1, 99)}-${int(1, 9999)}`;
  // Panameno indigena, con el numero de su comarca.
  return `${pick([10, 11, 12])}PI-${int(1, 999)}-${int(1, 99999)}`;
};

// Ruido tipico de OCR: confusiones de forma, tildes perdidas, mayusculas rotas.
const RUIDO = [
  (s) => s.replace(/0/g, "O"),
  (s) => s.replace(/1/g, "I"),
  (s) => s.replace(/5/g, "S"),
  (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, ""),
  (s) => s.replace(/-/g, " - "),
  (s) => s.toUpperCase(),
  (s) => s.replace(/ /g, "  "),
  (s) => s,
];

const fecha = (desdeAnio, hastaAnio) =>
  `${int(desdeAnio, hastaAnio)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;

const PLANTILLAS_CEDULA = [
  (d) => `REPUBLICA DE PANAMA\nTRIBUNAL ELECTORAL\nCEDULA DE IDENTIDAD PERSONAL\n${d.numero}\nNOMBRE: ${d.nombre}\nFECHA DE NACIMIENTO: ${d.nac}\nEXPIRA: ${d.exp}`,
  (d) => `TRIBUNAL ELECTORAL - PANAMA\n${d.nombre}\nCedula ${d.numero}\nNacimiento ${d.nac}\nVence ${d.exp}`,
  (d) => `CEDULA ${d.numero}\n${d.nombre}\nNac. ${d.nac}   Exp. ${d.exp}\nREPUBLICA DE PANAMA`,
  (d) => `${d.numero}\n${d.nombre}\nF. NAC ${d.nac}\nF. EXP ${d.exp}`,
  // El mismo reparto que tienen las imagenes de `data/documentos/`: nombre y
  // apellidos en campos separados, con lugar de nacimiento y sexo en medio.
  // Sin esto entrenamos con un formato y probamos con otro.
  (d) => `CEDULA DE IDENTIDAD PERSONAL\nNOMBRE\n${d.nombres}\nAPELLIDOS\n${d.apellidos}\nFECHA DE NACIMIENTO\n${d.nac}\nSEXO\n${d.sexo}\nEXPIRA\n${d.exp}\n${d.numero}`,
];

const SYSTEM_EXTRACCION = `Recibes el texto OCR (puede tener errores) de una cedula de identidad de Panama.
Extrae: numero (formato como 8-123-4567, PE-12-345, E-8-12345), nombre completo, fecha_nacimiento (YYYY-MM-DD), fecha_expiracion (YYYY-MM-DD si aparece), confianza (0 a 1 segun legibilidad).
Responde SOLO con un JSON valido con esas claves. Si un dato no aparece, usa null. Sin texto adicional.`;

/**
 * La tarea de laboratorio, copiada de SYSTEM_EXTRACCION_LABORATORIO en
 * mobile/src/core/prompts.ts.
 *
 * La version anterior pedia `rango`, `hallazgo` y `siguiente_paso`, o sea le
 * enseñaba al modelo a CLASIFICAR. Eso es justo lo que `ADR-005` le prohibe: en
 * la app quien decide si un valor esta alto o bajo es `clasificar()` contra el
 * catalogo con umbrales citados, nunca el modelo. Medido, el adaptador
 * entrenado asi no mejoraba el triaje (50% a 51% de campos) y de paso rompia la
 * extraccion de ingresos (89% a 70%): aprendio una conducta que la app no usa,
 * a costa de la que si.
 */
const SYSTEM_LABORATORIO = `Recibes el texto OCR (puede tener errores) de un informe de laboratorio de Panama.
Extrae cada marcador medido en "lecturas": un arreglo de objetos con codigo ("GLU"|"HB"|"PLQ"|"CREA"|"COL"|"HTO"|"TSH"), nombre (como aparece impreso), valor (numero) y unidad (como aparece impresa).
Extrae tambien fecha (YYYY-MM-DD si aparece) y confianza (0 a 1 segun legibilidad).
Incluye solo los marcadores cuyo valor numerico leiste de verdad. Nunca inventes un valor, nunca completes un marcador que no esta en el papel, y nunca digas si un valor esta alto o bajo: eso se decide en otra parte.
Responde SOLO con un JSON valido con esas claves. Sin texto adicional.`;

// --------------------------------------------------- CARTA DE TRABAJO
// La app pide tres documentos y hasta aqui solo se entrenaba la cedula. Estos
// dos faltaban, y son los que sostienen la decision de credito.
const SYSTEM_INGRESOS = `Recibes el texto OCR (puede tener errores) de un documento de ingresos de Panama: carta de trabajo, talonario o declaracion de trabajo independiente.
Extrae: empleador_o_actividad, ingreso_mensual_usd (numero, en balboas), tipo ("asalariado"|"independiente"|"jubilado"|"otro"), fecha_documento (YYYY-MM-DD si aparece), confianza (0 a 1 segun legibilidad).
Responde SOLO con un JSON valido con esas claves. Si un dato no aparece, usa null. Sin texto adicional.`;

const SYSTEM_EXTRACTO = `Recibes el texto OCR (puede tener errores) de un estado de cuenta bancario de Panama.
Extrae: banco, saldo_promedio_usd (numero, en balboas), meses_cubiertos (entero), confianza (0 a 1 segun legibilidad).
Responde SOLO con un JSON valido con esas claves. Sin texto adicional.`;

/** Empresas y bancos inventados, con sabor local. Ninguno existe. */
const EMPRESAS = [
  "Agroservicios del Istmo, S.A.", "Beneficiadora de Cafe Chiriqui, S.A.",
  "Transporte Interiorano Veraguas", "Cooperativa Agropecuaria La Esperanza",
  "Pesquera Golfo de Montijo, S.A.", "Ferreteria y Deposito El Cruce",
  "Empacadora del Pacifico, S.A.", "Constructora Rio Chico",
];
const OFICIOS = [
  "OPERARIA DE EMPAQUE", "AYUDANTE GENERAL", "CONDUCTOR", "SECRETARIA",
  "OBRERO AGRICOLA", "CAJERA", "VIGILANTE", "AUXILIAR DE BODEGA",
];
const ACTIVIDADES = [
  "venta de verduras en el mercado", "mototaxi", "costura por encargo",
  "venta de comida preparada", "agricultura de subsistencia y venta de excedente",
];
const BANCOS = [
  "Banco Istmeno de Ahorros", "Caja de Credito del Interior",
  "Banco Agropecuario Nacional", "Cooperativa de Ahorro y Credito San Jose",
];
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** En balboas, y con la coma de miles que a veces confunde al OCR. */
const plata = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

const PLANTILLAS_INGRESOS = [
  // Carta de trabajo, el mismo reparto que la imagen de `data/documentos/`.
  (d) => `${d.empresa.toUpperCase()}\n${d.lugar}\nRUC 000000-0-000000 DV 00\n\n${d.lugar}, ${d.dia} de ${d.mesTexto} de ${d.anio}\n\nA QUIEN CORRESPONDA:\n\nPor medio de la presente hacemos constar que ${d.tratamiento} ${d.nombre}, con cedula de identidad personal numero ${d.cedula}, labora en esta empresa en el cargo de ${d.oficio}, bajo contrato por tiempo indefinido.\n\nSu salario mensual es de B/. ${plata(d.monto)}, pagaderos en dos quincenas.`,
  // Talonario de pago quincenal: el ingreso mensual hay que deducirlo.
  (d) => `${d.empresa}\nCOMPROBANTE DE PAGO\nColaborador: ${d.nombre}\nCedula: ${d.cedula}\nPeriodo: quincena del ${d.dia}/${String(d.mes).padStart(2, "0")}/${d.anio}\nSalario quincenal  B/. ${plata(d.monto / 2)}\nSalario mensual    B/. ${plata(d.monto)}`,
  // Declaracion de trabajo independiente: no hay empleador.
  (d) => `DECLARACION JURADA DE INGRESOS\n${d.lugar}, ${d.dia} de ${d.mesTexto} de ${d.anio}\nYo, ${d.nombre}, con cedula ${d.cedula}, declaro que me dedico a ${d.actividad} y que percibo un ingreso mensual aproximado de B/. ${plata(d.monto)}.`,
];

const PLANTILLAS_EXTRACTO = [
  // El mismo reparto que la imagen de `data/documentos/`.
  (d) => `${d.banco.toUpperCase()}\nESTADO DE CUENTA DE AHORROS\nCliente  ${d.nombre}\nCuenta  ${d.cuenta}\nPeriodo  ${d.desde} al ${d.hasta}  (${d.meses} meses)\nSaldo promedio del periodo  B/. ${plata(d.saldo)}`,
  (d) => `${d.banco}\nCuenta de ahorros ${d.cuenta}\nTitular: ${d.nombre}\nResumen de ${d.meses} meses\nSaldo promedio: B/. ${plata(d.saldo)}\nSaldo final: B/. ${plata(d.saldo * 0.8)}`,
  (d) => `ESTADO DE CUENTA\n${d.banco}\n${d.nombre}   ${d.cuenta}\nPeriodo cubierto: ${d.meses} meses\nPromedio del periodo B/. ${plata(d.saldo)}`,
];

const LABORATORIOS = [
  "Laboratorio Clinico San Marcos", "Centro de Salud de Sona",
  "Laboratorio Chiriqui", "Policlinica de Santiago", "Lab. Clinico El Istmo",
];

/**
 * Un informe de laboratorio real trae varios marcadores en una tabla, no una
 * linea suelta. Antes se generaba un marcador por ejemplo, que no se parece a
 * lo que la persona fotografia.
 */
const PLANTILLAS_LAB = [
  (d) => `${d.lab.toUpperCase()}\nINFORME DE RESULTADOS\nPaciente: ${d.nombre}\nFecha: ${d.fecha}\n\n` +
    d.lecturas.map((l) => `${l.nombre}          ${l.valor} ${l.unidad}`).join("\n"),
  (d) => `${d.lab}\n${d.fecha}\n` +
    d.lecturas.map((l) => `${l.nombre}: ${l.valor}${l.unidad}`).join("\n"),
  (d) => `RESULTADOS DE LABORATORIO   ${d.fecha}\n${d.lab}\nPaciente ${d.nombre}\n\nPRUEBA               RESULTADO\n` +
    d.lecturas.map((l) => `${l.nombre.padEnd(20)} ${l.valor} ${l.unidad}`).join("\n"),
];

const filas = [];
const linea = (system, user, assistant) =>
  JSON.stringify({ messages: [
    { role: "system", content: system },
    { role: "user", content: user },
    { role: "assistant", content: JSON.stringify(assistant) },
  ] });

/** Aplica de 0 a 2 capas de ruido y devuelve el texto con su confianza. */
const ensuciar = (limpio) => {
  const capas = int(0, 2);
  let texto = limpio;
  for (let k = 0; k < capas; k++) texto = pick(RUIDO)(texto);
  return { texto, confianza: Number((0.95 - capas * 0.18 + rnd() * 0.05).toFixed(2)) };
};

// ---- 110 ejemplos de CEDULA
for (let i = 0; i < 110; i++) {
  const nombres = pick(NOMBRES);
  const apellidos = `${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
  const mujer = esMujer(nombres);
  const d = {
    numero: cedulaAleatoria(),
    nombres, apellidos,
    nombre: `${nombres} ${apellidos}`,
    sexo: mujer ? "F" : "M",
    nac: fecha(1950, 2006),
    exp: fecha(2026, 2034),
  };
  const { texto, confianza } = ensuciar(pick(PLANTILLAS_CEDULA)(d));
  filas.push(linea(SYSTEM_EXTRACCION, texto, {
    numero: d.numero, nombre: d.nombre,
    fecha_nacimiento: d.nac, fecha_expiracion: d.exp,
    confianza,
  }));
}

// ---- 55 ejemplos de INGRESOS
for (let i = 0; i < 55; i++) {
  const mes = int(1, 12);
  const independiente = rnd() < 0.35;
  const pila = pick(NOMBRES);
  const d = {
    empresa: pick(EMPRESAS), oficio: pick(OFICIOS), actividad: pick(ACTIVIDADES),
    nombre: `${pila} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    tratamiento: esMujer(pila) ? "la senora" : "el senor",
    cedula: cedulaAleatoria(),
    lugar: pick(["Sona", "David", "Santiago", "Changuinola", "Chitre", "Las Tablas", "Bugaba"]),
    dia: int(1, 28), mes, mesTexto: MESES_ES[mes - 1], anio: 2026,
    // Salario minimo panameno para arriba, que es donde vive el usuario.
    monto: int(280, 1400),
  };
  // La declaracion jurada es la unica plantilla sin empleador.
  const plantilla = independiente ? PLANTILLAS_INGRESOS[2] : pick(PLANTILLAS_INGRESOS.slice(0, 2));
  const { texto, confianza } = ensuciar(plantilla(d));
  filas.push(linea(SYSTEM_INGRESOS, texto, {
    empleador_o_actividad: independiente ? d.actividad : d.empresa,
    ingreso_mensual_usd: d.monto,
    tipo: independiente ? "independiente" : "asalariado",
    fecha_documento: `${d.anio}-${String(d.mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`,
    confianza,
  }));
}

// ---- 55 ejemplos de EXTRACTO
for (let i = 0; i < 55; i++) {
  const meses = int(1, 12);
  const d = {
    banco: pick(BANCOS),
    nombre: `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    cuenta: `${int(1, 99)}-${int(1000, 9999)}-${int(100000, 999999)}`,
    meses,
    desde: `01-${MESES_ES[0].slice(0, 3).toUpperCase()}-2026`,
    hasta: `28-${MESES_ES[Math.min(11, meses)].slice(0, 3).toUpperCase()}-2026`,
    saldo: Number((int(40, 2500) + rnd()).toFixed(2)),
  };
  const { texto, confianza } = ensuciar(pick(PLANTILLAS_EXTRACTO)(d));
  filas.push(linea(SYSTEM_EXTRACTO, texto, {
    banco: d.banco, saldo_promedio_usd: d.saldo, meses_cubiertos: d.meses, confianza,
  }));
}

// ---- 110 informes de LABORATORIO
// La salida NO dice si el valor esta alto o bajo: eso lo decide `clasificar()`
// contra el catalogo (`ADR-005`). El modelo solo transcribe lo que leyo.
for (let i = 0; i < 110; i++) {
  const cuantos = int(2, 5);
  const elegidos = [];
  for (const m of [...USABLES].sort(() => rnd() - 0.5).slice(0, cuantos)) {
    const span = m.max - m.min || m.max;
    const estado = int(0, 2); // normal, alto, bajo: el modelo transcribe igual
    let v = estado === 0 ? m.min + rnd() * span
          : estado === 1 ? m.max * (1.1 + rnd() * 1.2)
          : Math.max(0.1, m.min * (0.3 + rnd() * 0.6));
    elegidos.push({
      codigo: m.codigo, nombre: m.nombre, unidad: m.unidad,
      valor: Number(v.toFixed(v < 10 ? 1 : 0)),
    });
  }
  const d = {
    lab: pick(LABORATORIOS),
    nombre: `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    fecha: fecha(2026, 2026),
    lecturas: elegidos,
  };
  const { texto, confianza } = ensuciar(pick(PLANTILLAS_LAB)(d));
  filas.push(linea(SYSTEM_LABORATORIO, texto, {
    lecturas: elegidos, fecha: d.fecha, confianza,
  }));
}

// Barajado determinista dentro de cada tarea.
const barajar = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * El corte es estratificado: 20% de CADA tarea va a evaluacion.
 *
 * Con un corte plano el barajado dejo 3 casos de ingresos y 2 de extracto, y
 * ahi un solo acierto mueve el resultado 33 o 50 puntos. La tabla antes/despues
 * es el entregable: tiene que medir, no oscilar.
 */
// El generador puede repetir un ejemplo por azar, y un duplicado que cae a los
// dos lados del corte le regala al modelo un caso que ya memorizo. Fuera antes
// de repartir.
const unicas = [...new Set(filas)];
const duplicados = filas.length - unicas.length;

const porTarea = {};
for (const f of unicas) {
  const t = JSON.parse(f).messages[0].content;
  const k = t.includes("cedula de identidad") ? "cedula"
          : t.includes("documento de ingresos") ? "ingresos"
          : t.includes("estado de cuenta") ? "extracto" : "triaje";
  (porTarea[k] ??= []).push(f);
}

const train = [], evalu = [];
for (const k of Object.keys(porTarea).sort()) {
  const g = barajar(porTarea[k]);
  const nEval = Math.max(8, Math.round(g.length * 0.2));
  evalu.push(...g.slice(0, nEval));
  train.push(...g.slice(nEval));
}
barajar(train); barajar(evalu);

writeFileSync(resolve(DIR, "train.jsonl"), train.join("\n") + "\n");
writeFileSync(resolve(DIR, "eval.jsonl"), evalu.join("\n") + "\n");
const filasTrain = train, filasEval = evalu;
writeFileSync(resolve(DIR, "system-extraccion.txt"), SYSTEM_EXTRACCION);
writeFileSync(resolve(DIR, "system-laboratorio.txt"), SYSTEM_LABORATORIO);
writeFileSync(resolve(DIR, "system-ingresos.txt"), SYSTEM_INGRESOS);
writeFileSync(resolve(DIR, "system-extracto.txt"), SYSTEM_EXTRACTO);

console.log(`marcadores usados: ${USABLES.length} de ${MARCADORES.length} (CD4 excluido por el brief)`);
console.log(`train ${filasTrain.length} / eval ${filasEval.length} ejemplos (corte estratificado, 20% de cada tarea)`);
console.log(`duplicados eliminados: ${duplicados}`);
console.log(`mezcla: 110 cedula + 55 ingresos + 55 extracto + 110 laboratorio`);
