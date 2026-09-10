// Genera el historial de los usuarios ficticios de la demo.
//
// Los datos son 100% sinteticos: ninguna medicion corresponde a una persona
// real. El formato es el normalizado que consume `core/reglas.ts`, el mismo al
// que traduciria un importador desde un export de Google Health o Apple Health.
//
// Cada usuario cuenta UNA historia clinica coherente, no valores sueltos que
// disparen reglas. Un cuadro creible convence mucho mas que seis alertas a la
// vez, y el jurado incluye gente de salud.
//
// Semilla fija: el historial es identico en cada corrida, asi la demo es
// reproducible y los numeros del eval comparables.
//
// Uso: node data/generar-usuarios.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(import.meta.dirname);
const OUT = resolve(DIR, "usuarios");
mkdirSync(OUT, { recursive: true });

let seed = 20260911;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/** Ruido pequeno alrededor de un centro, para que no parezca generado. */
const cerca = (centro, amplitud) => centro + (rnd() - 0.5) * 2 * amplitud;
/** Rampa de `desde` a `hasta` a lo largo de la serie. */
const rampa = (desde, hasta, amplitud = 2) => (i, n) =>
  cerca(desde + (i / Math.max(1, n - 1)) * (hasta - desde), amplitud);
/** Valor estable. */
const fijo = (v, amplitud = 2) => () => cerca(v, amplitud);

const HOY = new Date("2026-09-09T08:00:00-05:00");
const diaAntes = (n) => new Date(HOY.getTime() - n * 86400000).toISOString();

const serie = (tipo, n, cada, valorEn) =>
  Array.from({ length: n }, (_, i) => ({
    ts: diaAntes((n - 1 - i) * cada),
    tipo,
    valor: Number(valorEn(i, n).toFixed(1)),
  }));

/** Serie con un pico puntual en la penultima medicion. Para eventos agudos. */
const serieConPico = (tipo, n, cada, base, pico) =>
  serie(tipo, n, cada, (i, k) => (i === k - 2 ? pico : base()));

// Constantes que no cambian entre usuarios, para no repetirlas.
const normal = {
  glucosa: fijo(88, 6),
  sist: fijo(116, 6),
  diast: fijo(74, 5),
  pulso: fijo(70, 7),
  sat: fijo(97.5, 1.2),
  resp: fijo(15, 2),
  temp: fijo(36.6, 0.3),
};

const USUARIOS = [
  {
    id: "A", nombre: "Sin hallazgos", sexo: "mujer", edad: 34,
    caso: "Sana",
    descripcion: "Todas las mediciones dentro de rango.",
    contexto: "Vive en una comunidad rural. Se mide en el puesto de salud cuando baja al pueblo.",
    porQue: "Es el control de la demo. Que la app NO diga nada vale tanto como la alerta: responde de una a la critica obvia de cualquier app de salud, que asusta por gusto.",
    esperadas: [],
    perfil: { ...normal, peso: fijo(58, 0.8), estatura: 1.60 },
  },
  {
    id: "B", nombre: "Diabetes sin diagnosticar", sexo: "hombre", edad: 52,
    caso: "Diabetes tipo 2 sin diagnosticar",
    descripcion: "Glucosa que sube, diastolica alta y perdida de peso involuntaria.",
    contexto: "Trabaja en el campo. Se mide en casa con un glucometro prestado desde que se siente cansado.",
    porQue: "El caso principal. La perdida de peso es sintoma clasico de diabetes sin tratar, y la diastolica alta con sistolica normal es justo el caso que la app no detectaba antes.",
    esperadas: ["GLU_ALTA", "PRES_ALTA", "PESO_BAJA", "IMC_SOBREPESO"],
    perfil: {
      ...normal,
      glucosa: rampa(104, 137, 3),
      sist: fijo(131, 4), diast: fijo(94.5, 2),
      pulso: fijo(84, 6),
      peso: rampa(80.5, 75, 0.4), estatura: 1.68,
    },
  },
  {
    id: "C", nombre: "Hipertension no controlada", sexo: "mujer", edad: 61,
    caso: "Hipertension no controlada con obesidad",
    descripcion: "Sistolica sostenida por encima de 140 y un IMC por encima de 30.",
    contexto: "Sabe que tiene la presion alta pero hace dos anos que no va a control.",
    porQue: "Hipertension es la enfermedad numero uno de Panama, 42% de la poblacion, y obesidad es el tercer factor que MINSA nombra junto al riesgo de morir por dengue.",
    esperadas: ["PRES_ALTA", "IMC_OBESIDAD"],
    perfil: {
      ...normal,
      sist: fijo(147, 4), diast: fijo(88, 3),
      peso: fijo(84, 0.6), estatura: 1.58,
    },
  },
  {
    id: "D", nombre: "Cuadro respiratorio agudo", sexo: "hombre", edad: 28,
    caso: "Cuadro respiratorio agudo",
    descripcion: "Fiebre, respiracion rapida, saturacion baja y pulso acelerado.",
    contexto: "Lleva cuatro dias con fiebre. En temporada de dengue, en una zona donde el centro de salud queda a dos horas.",
    porQue: "Muestra el camino agudo y las tres senales que van juntas de verdad. Aqui es donde importa el texto de que vigilar: los signos de alarma de dengue de la OMS, sin que la app nombre la enfermedad.",
    esperadas: ["FIEBRE", "RESP_ALTA", "SAT_BAJA", "TAQUI"],
    perfil: {
      ...normal,
      temp: fijo(38.4, 0.3),
      resp: fijo(22.5, 1),
      sat: fijo(93, 1),
      pulso: fijo(106, 4),
      peso: fijo(70, 0.5), estatura: 1.75,
    },
  },
  {
    id: "E", nombre: "Hipoglucemia", sexo: "mujer", edad: 45,
    caso: "Hipoglucemia",
    descripcion: "Una lectura de glucosa por debajo de 54.",
    contexto: "Esta en tratamiento por diabetes. Se salto el almuerzo trabajando.",
    porQue: "El unico caso de urgencia Inmediata del roster, y el unico que usa la ruta de autocuidado: el mensaje dice que tome azucar AHORA, no solo que algo anda mal. Basta una lectura, no espera tendencia.",
    esperadas: ["GLU_MUY_BAJA"],
    perfil: {
      ...normal,
      glucosaSerie: () => serieConPico("glucosa_ayunas", 7, 3, fijo(112, 8), 48),
      peso: fijo(64, 0.6), estatura: 1.62,
    },
  },
  {
    id: "F", nombre: "Prediabetes", sexo: "hombre", edad: 39,
    caso: "Prediabetes",
    descripcion: "Glucosa en el limite y sobrepeso. Nada urgente.",
    contexto: "Se hizo un chequeo por el trabajo y quedo con la duda.",
    porQue: "El caso rutinario, que es el mas comun de todos. Demuestra que la app distingue entre 'anda ya' y 'mencionalo en tu proxima consulta', en vez de alarmar por cualquier cosa.",
    esperadas: ["GLU_LIMITE", "IMC_SOBREPESO"],
    perfil: {
      ...normal,
      glucosa: fijo(112, 5),
      peso: fijo(79, 0.6), estatura: 1.74,
    },
  },
];

for (const u of USUARIOS) {
  const p = u.perfil;
  const mediciones = [
    ...(p.glucosaSerie ? p.glucosaSerie() : serie("glucosa_ayunas", 7, 14, p.glucosa)),
    ...serie("presion_sist", 8, 10, p.sist),
    ...serie("presion_diast", 8, 10, p.diast),
    ...serie("pulso_reposo", 12, 7, p.pulso),
    ...serie("saturacion_o2", 8, 10, p.sat),
    ...serie("frecuencia_respiratoria", 6, 14, p.resp),
    ...serie("temperatura", 6, 14, p.temp),
    ...serie("peso", 9, 30, p.peso),
    { ts: diaAntes(240), tipo: "estatura", valor: p.estatura },
  ].sort((x, y) => x.ts.localeCompare(y.ts));

  const doc = {
    id: u.id, nombre: u.nombre, sexo: u.sexo, edad: u.edad,
    caso: u.caso, descripcion: u.descripcion, contexto: u.contexto,
    por_que_esta_en_la_demo: u.porQue,
    senales_esperadas: u.esperadas,
    mediciones,
  };
  writeFileSync(resolve(OUT, `${u.id.toLowerCase()}.json`), JSON.stringify(doc, null, 2) + "\n");
  console.log(`${u.id}  ${u.caso.padEnd(42)} ${mediciones.length} med · ${u.esperadas.length ? u.esperadas.join(", ") : "sin senales"}`);
}

writeFileSync(resolve(OUT, "index.json"), JSON.stringify(
  USUARIOS.map(u => ({ id: u.id, nombre: u.nombre, caso: u.caso, descripcion: u.descripcion, senales_esperadas: u.esperadas })),
  null, 2) + "\n");
console.log(`\nindice en data/usuarios/index.json (${USUARIOS.length} usuarios)`);
