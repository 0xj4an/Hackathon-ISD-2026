// Genera una cartera sintetica de solicitantes y entrena el scorecard.
//
// Los datos son 100% sinteticos. No hay ni un dato real de ningun cliente
// panameno, y el modelo que sale de aqui esta calibrado sobre esta cartera
// inventada, no sobre el mercado. Se declara en pantalla y en el README.
//
// El proceso generador (VERDAD) esta escrito arriba a proposito: se sabe cual
// es la respuesta correcta, asi que se puede verificar que el entrenamiento la
// recupera. Semilla fija: misma cartera y mismo modelo en cada corrida.
//
// Uso: node data/cartera-sintetica.mjs
// Escribe mobile/src/core/credito/modelo.ts

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SEMILLA = 20260910;
let seed = SEMILLA;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const entre = (a, b) => a + rnd() * (b - a);
const elige = (ops) => {
  const u = rnd(); let acc = 0;
  for (const [v, p] of ops) { acc += p; if (u <= acc) return v; }
  return ops[ops.length - 1][0];
};
const sigmoide = (z) => 1 / (1 + Math.exp(-z));

/** Coeficientes verdaderos del proceso generador. El entrenamiento no los ve. */
const VERDAD = {
  intercepto: -2.4,
  tipo: { asalariado: -0.45, jubilado: -0.75, independiente: 0.30, otro: 0.65 },
  antiguedad: -0.010, deuda_ing: 3.0, monto_ing: 0.55,
  meses_extracto: -0.09, saldo_ing: -0.85, edad: -0.012,
};

function solicitante() {
  const tipo = elige([["asalariado", 0.45], ["independiente", 0.35], ["jubilado", 0.12], ["otro", 0.08]]);
  const ingreso = Math.round(entre(250, 1400));
  const antiguedad = Math.round(tipo === "jubilado" ? entre(12, 240) : entre(1, 120));
  const deuda_ing = Math.max(0, entre(-0.10, 0.55));
  const monto_ing = entre(0.05, 2.2);
  const con_extracto = rnd() < 0.45;
  const meses_extracto = con_extracto ? Math.round(entre(1, 12)) : 0;
  const saldo_ing = con_extracto ? Math.max(0, entre(-0.2, 1.5)) : 0;
  const edad = Math.round(tipo === "jubilado" ? entre(60, 78) : entre(18, 64));
  return { tipo, ingreso, antiguedad, deuda_ing, monto_ing, meses_extracto, saldo_ing, edad };
}

function pdVerdadera(s) {
  const v = VERDAD;
  return sigmoide(
    v.intercepto + v.tipo[s.tipo] + v.antiguedad * Math.min(s.antiguedad, 60) +
    v.deuda_ing * s.deuda_ing + v.monto_ing * s.monto_ing +
    v.meses_extracto * s.meses_extracto + v.saldo_ing * s.saldo_ing +
    v.edad * (s.edad - 40),
  );
}

const N = 3000;
const cartera = [];
for (let i = 0; i < N; i++) {
  const s = solicitante();
  s.mora = rnd() < pdVerdadera(s) ? 1 : 0;
  cartera.push(s);
}

/**
 * Cortes de bin fijos y declarados, no aprendidos. Auditables de un vistazo.
 *
 * Los de `antiguedad` y `saldo_ing` salieron de re-binar: con cortes mas finos
 * los puntos no quedaban monotonos (antiguedad daba 87, 65, 70, 72, 83, o sea
 * que menos de 6 meses puntuaba mejor que 2 anos, que es ruido y no senal).
 * Re-binar hasta que el WOE sea monotono es el procedimiento normal en el
 * desarrollo de un scorecard, y aqui ademas subio el AUC de holdout.
 */
const BINS = {
  tipo: { clase: "categorica", valores: ["asalariado", "jubilado", "independiente", "otro"] },
  antiguedad: { clase: "numerica", cortes: [24, 60] },
  deuda_ing: { clase: "numerica", cortes: [0.05, 0.15, 0.30] },
  monto_ing: { clase: "numerica", cortes: [0.30, 0.80, 1.50] },
  meses_extracto: { clase: "numerica", cortes: [0.5, 3, 6] },
  saldo_ing: { clase: "numerica", cortes: [0.05, 0.50] },
  // La edad NO puntua, a proposito. El proceso generador si la usa (la gente
  // mayor incumple menos en esta cartera), asi que el modelo podria explotarla,
  // pero puntuar por edad es discriminar y medido no aporta: sacarla dejo el
  // AUC de holdout en 0.723 contra 0.722 con ella. La edad se queda solo como
  // regla de elegibilidad en `motor.ts`, que es una politica declarada y no un
  // puntaje escondido.
};
const VARS = Object.keys(BINS);
const nBins = (d) => (d.clase === "categorica" ? d.valores.length : d.cortes.length + 1);
function indiceBin(valor, d) {
  if (d.clase === "categorica") {
    const i = d.valores.indexOf(valor);
    return i < 0 ? d.valores.length - 1 : i;
  }
  let i = 0;
  for (const c of d.cortes) if (valor >= c) i++;
  return i;
}

const entrena = cartera.slice(0, 2400);
const prueba = cartera.slice(2400);

// Weight of Evidence e Information Value, con suavizado de Laplace para que un
// bin vacio no reviente el logaritmo.
const woe = {}, iv = {};
const malosT = entrena.filter((s) => s.mora).length;
const buenosT = entrena.length - malosT;
for (const v of VARS) {
  const d = BINS[v], k = nBins(d);
  const buenos = Array(k).fill(0), malos = Array(k).fill(0);
  for (const s of entrena) {
    const i = indiceBin(s[v], d);
    if (s.mora) malos[i]++; else buenos[i]++;
  }
  woe[v] = []; iv[v] = 0;
  for (let i = 0; i < k; i++) {
    const pb = (buenos[i] + 0.5) / (buenosT + 0.5 * k);
    const pm = (malos[i] + 0.5) / (malosT + 0.5 * k);
    woe[v][i] = Math.log(pb / pm);
    iv[v] += (pb - pm) * woe[v][i];
  }
}

/** IV bajo 0.02 no discrimina. Se descarta y se dice cual. */
const usadas = VARS.filter((v) => iv[v] >= 0.02);
const descartadas = VARS.filter((v) => iv[v] < 0.02);

const fila = (s) => usadas.map((v) => woe[v][indiceBin(s[v], BINS[v])]);
const X = entrena.map(fila), y = entrena.map((s) => s.mora);
let b = Array(usadas.length).fill(0), b0 = 0;
for (let paso = 0; paso < 3000; paso++) {
  const g = Array(usadas.length).fill(0); let g0 = 0;
  for (let i = 0; i < X.length; i++) {
    const p = sigmoide(b0 + X[i].reduce((a, x, j) => a + x * b[j], 0));
    const e = p - y[i];
    g0 += e;
    for (let j = 0; j < b.length; j++) g[j] += e * X[i][j];
  }
  b0 -= (0.5 * g0) / X.length;
  for (let j = 0; j < b.length; j++) b[j] -= (0.5 * g[j]) / X.length;
}

const pd = (s) => sigmoide(b0 + fila(s).reduce((a, x, j) => a + x * b[j], 0));

function auc(set) {
  const c = set.map((s) => ({ p: pd(s), y: s.mora })).sort((a, z) => a.p - z.p);
  let r = 0, n1 = 0, n0 = 0;
  c.forEach((x, i) => { if (x.y) { r += i + 1; n1++; } else n0++; });
  return (r - (n1 * (n1 + 1)) / 2) / (n1 * n0);
}
function ks(set) {
  const c = set.map((s) => ({ p: pd(s), y: s.mora })).sort((a, z) => a.p - z.p);
  const n1 = c.filter((x) => x.y).length, n0 = c.length - n1;
  let c1 = 0, c0 = 0, m = 0;
  for (const x of c) { if (x.y) c1++; else c0++; m = Math.max(m, Math.abs(c1 / n1 - c0 / n0)); }
  return m;
}

// De log odds a puntos. PDO 20: cada 20 puntos se duplican las odds.
const FACTOR = 20 / Math.log(2);
const OFFSET = 600 - FACTOR * Math.log(50);
const n = usadas.length;
const puntos = {};
for (let j = 0; j < n; j++) {
  const v = usadas[j];
  puntos[v] = woe[v].map((w) => Math.round(-(b[j] * w + b0 / n) * FACTOR + OFFSET / n));
}
const score = (s) => usadas.reduce((a, v) => a + puntos[v][indiceBin(s[v], BINS[v])], 0);

const ordenados = entrena.map(score).sort((a, z) => a - z);
const q = (p) => ordenados[Math.floor(p * ordenados.length)];
const BANDAS = { A: q(0.80), B: q(0.55), C: q(0.30), D: q(0.10) };
const grado = (sc) => (sc >= BANDAS.A ? "A" : sc >= BANDAS.B ? "B" : sc >= BANDAS.C ? "C" : sc >= BANDAS.D ? "D" : "E");

console.log("tasa de mora de la cartera:", ((100 * cartera.filter((s) => s.mora).length) / N).toFixed(2) + "%");
console.log("\nIV por variable:");
for (const v of VARS) console.log(" ", v.padEnd(16), iv[v].toFixed(3), iv[v] < 0.02 ? "(descartada)" : "");
console.log("\nAUC entrena", auc(entrena).toFixed(3), " AUC prueba", auc(prueba).toFixed(3));
console.log("KS  entrena", ks(entrena).toFixed(3), "  KS prueba", ks(prueba).toFixed(3));
console.log("\ngrado  n     mora real   PD media   (holdout)");
for (const g of ["A", "B", "C", "D", "E"]) {
  const sub = prueba.filter((s) => grado(score(s)) === g);
  const mora = sub.length ? (100 * sub.filter((s) => s.mora).length) / sub.length : 0;
  const pdm = sub.length ? (100 * sub.reduce((a, s) => a + pd(s), 0)) / sub.length : 0;
  console.log(" ", g, String(sub.length).padStart(5), (mora.toFixed(1) + "%").padStart(10), (pdm.toFixed(1) + "%").padStart(10));
}
console.log("\npuntos por bin (comprobacion de monotonia):");
for (const v of usadas) console.log(" ", v.padEnd(16), puntos[v].join("  "));

const salida = `// GENERADO por data/cartera-sintetica.mjs. No editar a mano.
//
// Scorecard entrenado sobre una cartera SINTETICA de ${N} solicitantes con
// semilla ${SEMILLA}. No hay datos reales de clientes. Las metricas de abajo
// son sobre el holdout de ${prueba.length} casos que el entrenamiento no vio.
//
// AUC ${auc(prueba).toFixed(3)} · KS ${ks(prueba).toFixed(3)} · mora de la cartera ${((100 * cartera.filter((s) => s.mora).length) / N).toFixed(2)}%

export type DefinicionBin =
  | { clase: "categorica"; valores: string[] }
  | { clase: "numerica"; cortes: number[] };

export type Modelo = {
  semilla: number;
  n: number;
  variables: string[];
  descartadas: string[];
  bins: Record<string, DefinicionBin>;
  woe: Record<string, number[]>;
  iv: Record<string, number>;
  puntos: Record<string, number[]>;
  coeficientes: Record<string, number>;
  intercepto: number;
  bandas: { A: number; B: number; C: number; D: number };
  metricas: { auc: number; ks: number; mora_cartera: number };
};

export const MODELO: Modelo = ${JSON.stringify({
  semilla: SEMILLA,
  n: N,
  variables: usadas,
  descartadas,
  bins: BINS,
  woe,
  iv,
  puntos,
  coeficientes: Object.fromEntries(usadas.map((v, j) => [v, b[j]])),
  intercepto: b0,
  bandas: BANDAS,
  metricas: {
    auc: Number(auc(prueba).toFixed(4)),
    ks: Number(ks(prueba).toFixed(4)),
    mora_cartera: Number((cartera.filter((s) => s.mora).length / N).toFixed(4)),
  },
}, null, 2)};
`;

const destino = resolve(import.meta.dirname, "../mobile/src/core/credito/modelo.ts");
writeFileSync(destino, salida);
console.log("\nescrito:", destino);
