// Genera el historial de los seis usuarios ficticios de la demo.
//
// Datos 100% sinteticos. Formato normalizado que consume
// `mobile/src/core/reglas.ts` (el mismo al que traduciria un importador desde
// Google Health o Apple Health).
//
// Cada usuario cuenta UNA historia clinica coherente a lo largo de ~un ano,
// con densidades creibles por variable. Un cuadro creible convence mas que
// seis alertas a la vez.
//
// Semilla fija: historial identico en cada corrida (demo + eval reproducibles).
//
// Uso: node data/generar-usuarios.mjs
// Escribe data/usuarios/ y copia a mobile/src/datos/ para Metro.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(import.meta.dirname);
const OUT = resolve(DIR, "usuarios");
const MOBILE = resolve(DIR, "../mobile/src/datos");
mkdirSync(OUT, { recursive: true });
mkdirSync(MOBILE, { recursive: true });

let seed = 20260911;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cerca = (centro, amplitud) => centro + (rnd() - 0.5) * 2 * amplitud;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rampa = (desde, hasta) => (t) => desde + t * (hasta - desde);

/** Ancla de la demo: "hoy". El historial mira ~365 dias atras. */
const HOY = new Date("2026-09-09T08:00:00-05:00");
const diaAntes = (n, hora = 8) => {
  const d = new Date(HOY.getTime() - n * 86400000);
  d.setHours(hora, Math.floor(rnd() * 40), 0, 0);
  return d.toISOString();
};

/**
 * Serie a lo largo del ano. `cadaDias` = paso base; `jitter` salta alguna toma
 * para que no parezca una grilla perfecta. `valorEn(t)` recibe t in [0,1]
 * (0 = mas antiguo, 1 = mas reciente).
 */
function serieAnual(tipo, { cadaDias, dias = 365, jitter = 0.12, hora = 8 }, valorEn) {
  const out = [];
  for (let atras = dias; atras >= 0; atras -= cadaDias) {
    if (jitter > 0 && rnd() < jitter && atras > cadaDias && atras < dias - cadaDias) continue;
    const t = 1 - atras / dias;
    out.push({
      ts: diaAntes(atras, hora),
      tipo,
      valor: Number(valorEn(t, atras).toFixed(tipo === "estatura" ? 2 : 1)),
    });
  }
  return out;
}

/** Tomas diarias (o cada N dias) solo en una ventana reciente. Para agudos. */
function serieVentana(tipo, { desdeAtras, hastaAtras = 0, cadaDias = 1, hora = 8 }, valorEn) {
  const out = [];
  for (let atras = desdeAtras; atras >= hastaAtras; atras -= cadaDias) {
    const span = Math.max(1, desdeAtras - hastaAtras);
    const t = 1 - (atras - hastaAtras) / span;
    out.push({
      ts: diaAntes(atras, hora),
      tipo,
      valor: Number(valorEn(t, atras).toFixed(1)),
    });
  }
  return out;
}

const normal = {
  glucosa: (t) => clamp(cerca(88, 6), 75, 98),
  sist: () => clamp(cerca(116, 6), 105, 128),
  diast: () => clamp(cerca(74, 5), 62, 85),
  pulso: () => clamp(cerca(70, 7), 58, 88),
  sat: () => clamp(cerca(97.5, 1.0), 96, 99),
  resp: () => clamp(cerca(15, 1.5), 12, 18),
  temp: () => clamp(cerca(36.6, 0.25), 36.1, 37.2),
};

const USUARIOS = [
  {
    id: "sano", correo: "control@gmail.com", nombre: "Sin hallazgos", sexo: "mujer", edad: 34,
    caso: "Sana",
    descripcion: "Historial de un ano: todas las mediciones dentro de rango.",
    contexto: "Vive en una comunidad rural. Se mide en el puesto de salud cuando baja al pueblo.",
    porQue: "Es el control de la demo. Que la app NO diga nada vale tanto como la alerta: responde de una a la critica obvia de cualquier app de salud, que asusta por gusto.",
    esperadas: [],
    build() {
      const estatura = 1.60;
      return [
        ...serieAnual("glucosa_ayunas", { cadaDias: 28, jitter: 0.08, hora: 7 }, () => normal.glucosa()),
        ...serieAnual("presion_sist", { cadaDias: 14, hora: 9 }, () => normal.sist()),
        ...serieAnual("presion_diast", { cadaDias: 14, hora: 9 }, () => normal.diast()),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, () => normal.pulso()),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, () => normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, () => normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, () => normal.temp()),
        ...serieAnual("peso", { cadaDias: 14, hora: 8 }, () => clamp(cerca(58, 0.7), 56.5, 59.5)),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ];
    },
  },
  {
    id: "diabetes", correo: "insulina@gmail.com", nombre: "Diabetes sin diagnosticar", sexo: "hombre", edad: 52,
    caso: "Diabetes tipo 2 sin diagnosticar",
    descripcion: "Un ano de glucosa que sube, diastolica alta y perdida de peso involuntaria.",
    contexto: "Trabaja en el campo. Se mide en casa con un glucometro prestado desde que se siente cansado.",
    porQue: "El caso principal. La perdida de peso es sintoma clasico de diabetes sin tratar, y la diastolica alta con sistolica normal es justo el caso que la app no detectaba antes.",
    esperadas: ["GLU_ALTA", "PRES_ALTA", "PESO_BAJA", "IMC_SOBREPESO"],
    build() {
      const estatura = 1.68;
      // Peso: ~82 -> ~75 en el ano (>5%). IMC final ~26.6 (sobrepeso).
      const pesoEn = (t) => clamp(cerca(rampa(82, 75)(t), 0.35), 74.2, 83);
      return [
        ...serieAnual("glucosa_ayunas", { cadaDias: 3.5, jitter: 0.1, hora: 7 }, (t) =>
          clamp(cerca(rampa(102, 138)(t), 4), 95, 148)),
        ...serieAnual("presion_sist", { cadaDias: 7, hora: 9 }, () => clamp(cerca(131, 4), 122, 138)),
        ...serieAnual("presion_diast", { cadaDias: 7, hora: 9 }, () => clamp(cerca(94.5, 1.8), 90.5, 99)),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, () => clamp(cerca(84, 5), 72, 96)),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, () => normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, () => normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, () => normal.temp()),
        ...serieAnual("peso", { cadaDias: 7, hora: 8 }, pesoEn),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ];
    },
  },
  {
    id: "hipertension", correo: "presion@gmail.com", nombre: "Hipertension no controlada", sexo: "mujer", edad: 61,
    caso: "Hipertension no controlada con obesidad",
    descripcion: "Un ano con sistolica sostenida por encima de 140 y IMC por encima de 30.",
    contexto: "Sabe que tiene la presion alta pero hace dos anos que no va a control.",
    porQue: "Hipertension es la enfermedad numero uno de Panama, 42% de la poblacion, y obesidad es el tercer factor que MINSA nombra junto al riesgo de morir por dengue.",
    esperadas: ["PRES_ALTA", "IMC_OBESIDAD"],
    build() {
      const estatura = 1.58;
      return [
        ...serieAnual("glucosa_ayunas", { cadaDias: 28, hora: 7 }, () => clamp(cerca(92, 5), 80, 99)),
        ...serieAnual("presion_sist", { cadaDias: 3.5, jitter: 0.08, hora: 9 }, () =>
          clamp(cerca(147, 3.5), 140.5, 156)),
        ...serieAnual("presion_diast", { cadaDias: 3.5, jitter: 0.08, hora: 9 }, () =>
          clamp(cerca(88, 3), 80, 96)),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, () => clamp(cerca(76, 6), 64, 92)),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, () => normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, () => normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, () => normal.temp()),
        ...serieAnual("peso", { cadaDias: 14, hora: 8 }, () => clamp(cerca(84, 0.55), 82.5, 85.5)),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ];
    },
  },
  {
    id: "respiratorio", correo: "fiebre@gmail.com", nombre: "Cuadro respiratorio agudo", sexo: "hombre", edad: 28,
    caso: "Cuadro respiratorio agudo",
    descripcion: "Once meses sano y cinco dias de fiebre, respiracion rapida, saturacion baja y pulso acelerado.",
    contexto: "Lleva cuatro dias con fiebre. En temporada de dengue, en una zona donde el centro de salud queda a dos horas.",
    porQue: "Muestra el camino agudo y las tres senales que van juntas de verdad. Aqui es donde importa el texto de que vigilar: los signos de alarma de dengue de la OMS, sin que la app nombre la enfermedad.",
    esperadas: ["FIEBRE", "RESP_ALTA", "SAT_BAJA", "TAQUI"],
    build() {
      const estatura = 1.75;
      // Baseline del ano (sin los ultimos 6 dias: ahi entra el episodio).
      const base = [
        ...serieAnual("glucosa_ayunas", { cadaDias: 30, dias: 365, jitter: 0.05, hora: 7 }, (t, atras) =>
          atras <= 6 ? 88 : normal.glucosa()),
        ...serieAnual("presion_sist", { cadaDias: 14, hora: 9 }, (t, atras) =>
          atras <= 6 ? clamp(cerca(118, 4), 110, 128) : normal.sist()),
        ...serieAnual("presion_diast", { cadaDias: 14, hora: 9 }, (t, atras) =>
          atras <= 6 ? clamp(cerca(76, 4), 68, 84) : normal.diast()),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, (t, atras) =>
          atras <= 6 ? 70 : normal.pulso()),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, (t, atras) =>
          atras <= 6 ? 97 : normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, (t, atras) =>
          atras <= 6 ? 15 : normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, (t, atras) =>
          atras <= 6 ? 36.6 : normal.temp()),
        ...serieAnual("peso", { cadaDias: 30, hora: 8 }, () => clamp(cerca(70, 0.5), 68.5, 71.5)),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ].filter((m) => {
        // Quitar del baseline las tomas que caen en la ventana aguda; se reponen densas.
        const atras = (HOY.getTime() - Date.parse(m.ts)) / 86400000;
        if (atras > 6.5) return true;
        return m.tipo === "peso" || m.tipo === "estatura" || m.tipo === "glucosa_ayunas"
          || m.tipo === "presion_sist" || m.tipo === "presion_diast";
      });

      const agudo = [
        ...serieVentana("pulso_reposo", { desdeAtras: 5, hastaAtras: 0, cadaDias: 1, hora: 8 }, () =>
          clamp(cerca(106, 3), 101, 114)),
        ...serieVentana("saturacion_o2", { desdeAtras: 4, hastaAtras: 0, cadaDias: 1, hora: 10 }, () =>
          clamp(cerca(93, 0.8), 91, 94.5)),
        ...serieVentana("frecuencia_respiratoria", { desdeAtras: 4, hastaAtras: 0, cadaDias: 1, hora: 10 }, () =>
          clamp(cerca(22.5, 0.8), 20.5, 24.5)),
        ...serieVentana("temperatura", { desdeAtras: 4, hastaAtras: 0, cadaDias: 1, hora: 18 }, () =>
          clamp(cerca(38.4, 0.25), 38.0, 39.1)),
      ];
      return [...base, ...agudo];
    },
  },
  {
    id: "hipoglucemia", correo: "azucar@gmail.com", nombre: "Hipoglucemia", sexo: "mujer", edad: 45,
    caso: "Hipoglucemia",
    descripcion: "Un ano en tratamiento con glucosa estable y una lectura reciente por debajo de 54.",
    contexto: "Esta en tratamiento por diabetes. Se salto el almuerzo trabajando.",
    porQue: "El unico caso de urgencia Inmediata del roster, y el unico que usa la ruta de autocuidado: el mensaje dice que tome azucar AHORA, no solo que algo anda mal. Basta una lectura, no espera tendencia.",
    esperadas: ["GLU_MUY_BAJA"],
    build() {
      const estatura = 1.62;
      // Ultimas 3 glucosas: controladas + un pico bajo. Promedio < 100 para no
      // disparar GLU_LIMITE/GLU_ALTA (el contrato solo espera GLU_MUY_BAJA).
      const glucosas = serieAnual("glucosa_ayunas", { cadaDias: 3.5, jitter: 0.1, hora: 7 }, () =>
        clamp(cerca(95, 8), 78, 108));
      // Forzar las tres mas recientes: penultima = 48.
      const gluSorted = glucosas.sort((a, b) => a.ts.localeCompare(b.ts));
      const n = gluSorted.length;
      gluSorted[n - 3].valor = 92;
      gluSorted[n - 2].valor = 48;
      gluSorted[n - 1].valor = 88;

      return [
        ...gluSorted,
        ...serieAnual("presion_sist", { cadaDias: 14, hora: 9 }, () => normal.sist()),
        ...serieAnual("presion_diast", { cadaDias: 14, hora: 9 }, () => normal.diast()),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, () => normal.pulso()),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, () => normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, () => normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, () => normal.temp()),
        ...serieAnual("peso", { cadaDias: 14, hora: 8 }, () => clamp(cerca(64, 0.55), 62.5, 65.5)),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ];
    },
  },
  {
    id: "prediabetes", correo: "limite@gmail.com", nombre: "Prediabetes", sexo: "hombre", edad: 39,
    caso: "Prediabetes",
    descripcion: "Un ano con glucosa en el limite y sobrepeso. Nada urgente.",
    contexto: "Se hizo un chequeo por el trabajo y quedo con la duda.",
    porQue: "El caso rutinario, que es el mas comun de todos. Demuestra que la app distingue entre 'anda ya' y 'mencionalo en tu proxima consulta', en vez de alarmar por cualquier cosa.",
    esperadas: ["GLU_LIMITE", "IMC_SOBREPESO"],
    build() {
      const estatura = 1.74;
      return [
        ...serieAnual("glucosa_ayunas", { cadaDias: 7, jitter: 0.08, hora: 7 }, () =>
          clamp(cerca(112, 4), 102, 122)),
        ...serieAnual("presion_sist", { cadaDias: 14, hora: 9 }, () => clamp(cerca(124, 5), 112, 135)),
        ...serieAnual("presion_diast", { cadaDias: 14, hora: 9 }, () => clamp(cerca(78, 4), 68, 86)),
        ...serieAnual("pulso_reposo", { cadaDias: 7, hora: 8 }, () => normal.pulso()),
        ...serieAnual("saturacion_o2", { cadaDias: 30, hora: 10 }, () => normal.sat()),
        ...serieAnual("frecuencia_respiratoria", { cadaDias: 30, hora: 10 }, () => normal.resp()),
        ...serieAnual("temperatura", { cadaDias: 30, hora: 10 }, () => normal.temp()),
        ...serieAnual("peso", { cadaDias: 14, hora: 8 }, () => clamp(cerca(79, 0.55), 77.5, 80.5)),
        { ts: diaAntes(360, 8), tipo: "estatura", valor: estatura },
      ];
    },
  },
];

for (const u of USUARIOS) {
  const mediciones = u.build().sort((x, y) => x.ts.localeCompare(y.ts));
  const doc = {
    id: u.id,
    correo: u.correo,
    nombre: u.nombre,
    sexo: u.sexo,
    edad: u.edad,
    caso: u.caso,
    descripcion: u.descripcion,
    contexto: u.contexto,
    por_que_esta_en_la_demo: u.porQue,
    periodo_dias: 365,
    senales_esperadas: u.esperadas,
    mediciones,
  };
  const json = JSON.stringify(doc, null, 2) + "\n";
  writeFileSync(resolve(OUT, `${u.id}.json`), json);
  writeFileSync(resolve(MOBILE, `${u.id}.json`), json);
  console.log(
    `${u.id.padEnd(14)} ${String(mediciones.length).padStart(4)} med · ${u.esperadas.length ? u.esperadas.join(", ") : "sin senales"}`,
  );
}

const indice = USUARIOS.map((u) => ({
  id: u.id,
  correo: u.correo,
  nombre: u.nombre,
  caso: u.caso,
  descripcion: u.descripcion,
  senales_esperadas: u.esperadas,
}));
const indiceJson = JSON.stringify(indice, null, 2) + "\n";
writeFileSync(resolve(OUT, "index.json"), indiceJson);
writeFileSync(resolve(MOBILE, "index.json"), indiceJson);
console.log(`\nindice: ${USUARIOS.length} usuarios → data/usuarios/ y mobile/src/datos/`);
