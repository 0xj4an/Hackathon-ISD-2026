// Genera el dataset sintetico del spike de LoRA. Codigo propio del equipo.
//
// Dos tareas mezcladas, con el peso en extraccion (ADR-003):
//   - EXTRACCION: texto OCR ruidoso de una cedula panamena -> JSON de campos.
//   - TRIAJE:     una lectura de laboratorio -> JSON con hallazgo y siguiente paso.
//
// Los rangos de laboratorio salen de core/marcadores.ts, la misma tabla que usa
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
// Se leen de core/marcadores.ts por regex en vez de importar, para no arrastrar
// un paso de compilacion de TypeScript dentro del spike.
const SRC = readFileSync(resolve(DIR, "../../core/marcadores.ts"), "utf8");
const MARCADORES = [...SRC.matchAll(
  /\{\s*codigo:\s*"([^"]+)",\s*nombre:\s*"([^"]+)",\s*unidad:\s*"([^"]+)",\s*min:\s*([\d.]+),\s*max:\s*([\d.]+),\s*hallazgoAlto:\s*"([^"]+)",\s*hallazgoBajo:\s*"([^"]+)",\s*pasoAlto:\s*"([^"]+)",\s*pasoBajo:\s*"([^"]+)"/g
)].map((m) => ({
  codigo: m[1], nombre: m[2], unidad: m[3],
  min: Number(m[4]), max: Number(m[5]),
  hallazgoAlto: m[6], hallazgoBajo: m[7], pasoAlto: m[8], pasoBajo: m[9],
}));

if (MARCADORES.length === 0) throw new Error("no pude leer core/marcadores.ts");

// CD4 fuera del dataset: su siguiente paso menciona VIH y el brief lo prohibe
// en la demo publica. Ver 03-specification.md.
const USABLES = MARCADORES.filter((m) => m.codigo !== "CD4");

// ------------------------------------------------------------------ CEDULAS
// Formato panameno, el mismo regex que valida CedulaSchema en core/schemas.ts.
const NOMBRES = ["Ana Lucia", "Jose Manuel", "Maria Elena", "Carlos Alberto", "Rosa Idalia",
  "Luis Fernando", "Yaritza", "Ricardo", "Digna Esther", "Omar", "Marisol", "Eduardo"];
const APELLIDOS = ["Gonzalez", "Rodriguez", "Batista", "Quintero", "Moreno", "Sanchez",
  "Caballero", "Vasquez", "Pinzon", "Aguilar", "Bernal", "Samaniego"];

const cedulaAleatoria = () => {
  const tipo = rnd();
  if (tipo < 0.75) return `${int(1, 13)}-${int(100, 9999)}-${int(1, 999999)}`;
  if (tipo < 0.85) return `PE-${int(1, 99)}-${int(1, 9999)}`;
  if (tipo < 0.93) return `E-${int(1, 13)}-${int(1, 99999)}`;
  return `${int(1, 13)}${pick(["AV", "PI"])}-${int(1, 999)}-${int(1, 99999)}`;
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
];

const SYSTEM_EXTRACCION = `Recibes el texto OCR (puede tener errores) de una cedula de identidad de Panama.
Extrae: numero (formato como 8-123-4567, PE-12-345, E-8-12345), nombre completo, fecha_nacimiento (YYYY-MM-DD), fecha_expiracion (YYYY-MM-DD si aparece), confianza (0 a 1 segun legibilidad).
Responde SOLO con un JSON valido con esas claves. Si un dato no aparece, usa null. Sin texto adicional.`;

const SYSTEM_TRIAJE = `Eres un triaje local de laboratorio. Recibes una lectura y respondes SOLO con un JSON valido con las claves: marcador, valor, unidad, rango, hallazgo, siguiente_paso. Sin texto adicional.`;

const FRASEOS_LAB = [
  (m, v) => `${m.nombre} ${v} ${m.unidad}`,
  (m, v) => `Paciente con ${m.nombre} de ${v} ${m.unidad}`,
  (m, v) => `Resultado: ${m.nombre}: ${v}${m.unidad}`,
  (m, v) => `Me salio ${m.nombre} en ${v} ${m.unidad}, que hago?`,
  (m, v) => `Lab del puesto de salud: ${m.nombre}=${v} ${m.unidad}`,
];

const filas = [];
const linea = (system, user, assistant) =>
  JSON.stringify({ messages: [
    { role: "system", content: system },
    { role: "user", content: user },
    { role: "assistant", content: JSON.stringify(assistant) },
  ] });

// ---- 200 ejemplos de EXTRACCION
for (let i = 0; i < 200; i++) {
  const d = {
    numero: cedulaAleatoria(),
    nombre: `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    nac: fecha(1950, 2006),
    exp: fecha(2026, 2034),
  };
  const limpio = pick(PLANTILLAS_CEDULA)(d);
  // 0, 1 o 2 capas de ruido. Mas ruido, menos confianza declarada.
  const capas = int(0, 2);
  let texto = limpio;
  for (let k = 0; k < capas; k++) texto = pick(RUIDO)(texto);
  const confianza = Number((0.95 - capas * 0.18 + rnd() * 0.05).toFixed(2));
  filas.push(linea(SYSTEM_EXTRACCION, texto, {
    numero: d.numero, nombre: d.nombre,
    fecha_nacimiento: d.nac, fecha_expiracion: d.exp,
    confianza,
  }));
}

// ---- 100 ejemplos de TRIAJE
for (let i = 0; i < 100; i++) {
  const m = USABLES[i % USABLES.length];
  const span = m.max - m.min || m.max;
  const estado = i % 3; // 0 normal, 1 alto, 2 bajo
  let v = estado === 0 ? m.min + rnd() * span
        : estado === 1 ? m.max * (1.1 + rnd() * 1.2)
        : Math.max(0.1, m.min * (0.3 + rnd() * 0.6));
  v = Number(v.toFixed(v < 10 ? 1 : 0));
  const dentro = v >= m.min && v <= m.max;
  filas.push(linea(SYSTEM_TRIAJE, pick(FRASEOS_LAB)(m, v), {
    marcador: m.nombre, valor: v, unidad: m.unidad,
    rango: `${m.min}-${m.max}`,
    hallazgo: dentro ? "dentro de rango" : v > m.max ? m.hallazgoAlto : m.hallazgoBajo,
    siguiente_paso: dentro ? "control habitual" : v > m.max ? m.pasoAlto : m.pasoBajo,
  }));
}

// Barajado determinista, para que train y eval mezclen las dos tareas.
for (let i = filas.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [filas[i], filas[j]] = [filas[j], filas[i]];
}

const CORTE = 270;
writeFileSync(resolve(DIR, "train.jsonl"), filas.slice(0, CORTE).join("\n") + "\n");
writeFileSync(resolve(DIR, "eval.jsonl"), filas.slice(CORTE).join("\n") + "\n");
writeFileSync(resolve(DIR, "system-extraccion.txt"), SYSTEM_EXTRACCION);
writeFileSync(resolve(DIR, "system-triaje.txt"), SYSTEM_TRIAJE);

console.log(`marcadores usados: ${USABLES.length} de ${MARCADORES.length} (CD4 excluido por el brief)`);
console.log(`train ${CORTE} / eval ${filas.length - CORTE} ejemplos`);
console.log(`mezcla: 200 extraccion + 100 triaje`);
