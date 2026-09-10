// Evaluacion de las reglas de dominio. Codigo propio del equipo.
//
// El reto Tether Psy pide "calidad de dominio medible" y "evidencia
// reproducible". Esto lo mide. No usa el modelo: mide las REGLAS, que son
// quienes deciden (`ADR-005`). La calidad del modelo se mide aparte, en
// `spikes/lora-medpsy`, porque el modelo solo redacta.
//
// Es determinista y no necesita telefono: corre en cualquier maquina en
// segundos y da el mismo resultado.
//
// Uso: node eval/run.mjs
// Sale con codigo 1 si algo falla, para poder colgarlo de un CI.

import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const RAIZ = resolve(import.meta.dirname, "..");

// `core/` es TypeScript y no hay build. Se compila a un temporal para evaluar
// exactamente el mismo codigo que corre la app, en vez de una copia paralela
// que se desincroniza.
const TMP = mkdtempSync(resolve(tmpdir(), "eval-inaigar-"));
execFileSync(resolve(RAIZ, "mobile/node_modules/.bin/tsc"), [
  "--outDir", TMP, "--target", "es2022", "--module", "esnext",
  "--moduleResolution", "bundler", "--skipLibCheck",
  // Dentro de `credito/` los imports llevan extension `.ts` porque los lee
  // Node sin build. Este flag los reescribe a `.js` al emitir.
  "--rewriteRelativeImportExtensions",
  resolve(RAIZ, "mobile/src/core/reglas.ts"),
  resolve(RAIZ, "mobile/src/core/marcadores.ts"),
  resolve(RAIZ, "mobile/src/core/paquete.ts"),
  resolve(RAIZ, "mobile/src/core/credito/motor.ts"),
], { stdio: "pipe" });

const { detectarSenales } = await import(resolve(TMP, "reglas.js"));
const { MARCADORES, clasificar } = await import(resolve(TMP, "marcadores.js"));
const { armarPaquete } = await import(resolve(TMP, "paquete.js"));
const { decidir, preCalificar } = await import(resolve(TMP, "credito/motor.js"));
const { MODELO } = await import(resolve(TMP, "credito/modelo.js"));
const { simular } = await import(resolve(RAIZ, "nodo/cartera.mjs"));

const lineas = [];
const di = (s = "") => { console.log(s); lineas.push(s); };
let fallos = 0;

di("# Evaluacion de las reglas de dominio");
di();
di("Generado por `node eval/run.mjs`. Determinista: mismo resultado en cada corrida.");
di();

// ---------------------------------------------------------------- 1) usuarios
di("## 1. Deteccion por historial (via A)");
di();
di("Cada caso de `data/usuarios/` debe producir exactamente las senales que declara.");
di();
di("| Caso | Esperado | Obtenido | |");
di("| --- | --- | --- | --- |");

const DIR_U = resolve(RAIZ, "data/usuarios");
const usuarios = readdirSync(DIR_U)
  .filter(f => f.endsWith(".json") && f !== "index.json").sort()
  .map(f => JSON.parse(readFileSync(resolve(DIR_U, f), "utf8")));

for (const u of usuarios) {
  const got = detectarSenales(u.mediciones).map(s => s.codigo).sort();
  const want = [...u.senales_esperadas].sort();
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fallos++;
  di(`| ${u.nombre} | ${want.join(", ") || "ninguna"} | ${got.join(", ") || "ninguna"} | ${ok ? "OK" : "**FALLA**"} |`);
}

const sano = usuarios.find(u => u.senales_esperadas.length === 0);
const senalesSano = sano ? detectarSenales(sano.mediciones).length : -1;
if (senalesSano !== 0) fallos++;
di();
di(`**C3c, el caso sano no dispara nada:** ${senalesSano === 0 ? "OK, cero senales" : `FALLA, ${senalesSano} senales`}`);

// ---------------------------------------------------------------- 2) marcadores
di();
di("## 2. Clasificacion de laboratorio (via B)");
di();
di("Cada marcador debe clasificar alto, bajo y dentro de rango. Se prueban tres");
di("valores por marcador: justo por encima del maximo, justo por debajo del minimo,");
di("y el centro del rango.");
di();
di("| Marcador | Rango | Alto | Bajo | Normal | |");
di("| --- | --- | --- | --- | --- | --- |");

for (const m of MARCADORES) {
  const alto = clasificar(m, m.max * 1.3);
  const medio = clasificar(m, (m.min + m.max) / 2);
  const okAlto = alto.hallazgo === m.hallazgoAlto;
  // Los marcadores sin `hallazgoBajo` no tienen estado "bajo" con sentido
  // clinico: en colesterol total, menos es mejor.
  const bajo = m.hallazgoBajo ? clasificar(m, Math.max(0.01, m.min * 0.7)) : null;
  const okBajo = bajo ? bajo.hallazgo === m.hallazgoBajo : true;
  const okMedio = medio.hallazgo === "dentro de rango";
  const ok = okAlto && okBajo && okMedio;
  if (!ok) fallos++;
  di(`| ${m.nombre} | ${m.min} a ${m.max} ${m.unidad} | ${okAlto ? "OK" : "FALLA"} | ${!m.hallazgoBajo ? "n/a" : okBajo ? "OK" : "FALLA"} | ${okMedio ? "OK" : "FALLA"} | ${ok ? "" : "**revisar**"} |`);
}

// Hemoglobina por sexo: el defecto que la OMS corrigio. Un hombre con 12.5
// tiene anemia; con el rango unico anterior salia "dentro de rango".
const hb = MARCADORES.find(m => m.codigo === "HB");
if (hb) {
  const hombre = clasificar(hb, 12.5, "hombre");
  const mujer = clasificar(hb, 12.5, "mujer");
  const ok = hombre.hallazgo === "anemia" && mujer.hallazgo === "dentro de rango";
  if (!ok) fallos++;
  di();
  di("**Hemoglobina por sexo (OMS 2024).** Con 12.5 g/dL:");
  di();
  di(`- hombre: ${hombre.hallazgo} ${hombre.hallazgo === "anemia" ? "OK" : "FALLA"}`);
  di(`- mujer: ${mujer.hallazgo} ${mujer.hallazgo === "dentro de rango" ? "OK" : "FALLA"}`);
}

// ---------------------------------------------------------------- 3) rutas
di();
di("## 3. Integridad de las rutas");
di();
di("Toda senal tiene que decir que hacer, no solo que algo anda mal.");
di();

const todas = usuarios.flatMap(u => detectarSenales(u.mediciones));
const unicas = [...new Map(todas.map(s => [s.codigo, s])).values()];
const sinDonde = unicas.filter(s => !s.ruta?.donde);
const sinQuien = unicas.filter(s => !s.ruta?.especialista);
const sinFuente = unicas.filter(s => !s.fuente);
const costoSinFuente = unicas.filter(s => s.costo && !s.costo.fuente);

for (const [etiqueta, malas] of [
  ["senales sin `donde`", sinDonde],
  ["senales sin `especialista`", sinQuien],
  ["senales sin `fuente` del umbral", sinFuente],
  ["costos sin fuente citada", costoSinFuente],
]) {
  if (malas.length) fallos++;
  di(`- ${etiqueta}: ${malas.length === 0 ? "0, OK" : `${malas.length} (${malas.map(s => s.codigo).join(", ")})`}`);
}
di();
di(`Senales distintas ejercitadas por los casos: **${unicas.length}** (${unicas.map(s => s.codigo).sort().join(", ")}).`);

// ---------------------------------------------------------------- cierre
di();
// ---------------------------------------------------------------- 4) paquetes
di("## 4. El paquete de cada caso");
di();
di("El credito se ofrece SIEMPRE que haya algo que atender, sin importar el monto");
di("ni la urgencia. La atencion de urgencia tambien cuesta, y es justo por eso que");
di("la gente no va. Lo unico sin paquete es no tener ningun hallazgo.");
di();
di("| Caso | Paquete | Total | Credito | |");
di("| --- | --- | --- | --- | --- |");

for (const u of usuarios) {
  const senales = detectarSenales(u.mediciones);
  const p = armarPaquete(senales);

  // Lo que se exige: nunca credito en urgencia, nunca por debajo del minimo,
  // nunca sin tratamiento sostenido, y toda linea con su fuente.
  let mal = null;
  if (!p) {
    if (senales.length > 0) mal = "hay senales y no hay paquete";
  } else {
    if (p.total_max < p.total_min) mal = "rango invertido";
    else if (p.total_min <= 0) mal = "paquete sin costo";
    else if (p.lineas.some(l => !l.fuente)) mal = "linea sin fuente";
    else if (p.lineas.some(l => l.max < l.min)) mal = "linea con rango invertido";
  }
  if (mal) fallos++;

  const desc = p ? p.titulo : "sin hallazgos";
  const total = p ? `B/. ${p.total_min} a ${p.total_max}` : "-";
  const cred = p ? "si" : "no";
  di(`| ${u.nombre} | ${desc} | ${total} | ${cred} | ${mal ? "FALLA: " + mal : "OK"} |`);
}
di();

const conCredito = usuarios.filter(u => armarPaquete(detectarSenales(u.mediciones)) !== null).length;
di(`Casos que ofrecen credito: **${conCredito} de ${usuarios.length}**. El unico que no, es el caso sano: no hay nada que atender.`);
di();

di("Toda senal tiene que tener paquete. Si falta uno, hay un caso donde la app");
di("detecta algo y no sabe decir cuanto cuesta atenderlo.");
di();

const CODIGOS = [
  "GLU_MUY_BAJA", "GLU_BAJA", "GLU_ALTA", "GLU_LIMITE", "PRES_ALTA", "TAQUI",
  "SAT_CRITICA", "SAT_BAJA", "RESP_MUY_ALTA", "RESP_ALTA", "FIEBRE",
  "IMC_OBESIDAD", "IMC_SOBREPESO", "PESO_BAJA",
];
const sinPaquete = CODIGOS.filter(c => armarPaquete([{ codigo: c, urgencia: "Rutinaria" }]) === null);
if (sinPaquete.length) fallos++;
di(`- senales sin paquete: ${sinPaquete.length}${sinPaquete.length ? " (" + sinPaquete.join(", ") + ") FALLA" : ", OK"} (de ${CODIGOS.length})`);
di();

// ---------------------------------------------------------------- 5) credito
di("## 5. Modelo de credito");
di();
di("El scorecard esta entrenado sobre **cartera sintetica** de " + MODELO.n +
   " solicitantes con semilla " + MODELO.semilla + ". No hay ni un dato real de ningun cliente.");
di();
di(`Holdout: AUC ${MODELO.metricas.auc}, KS ${MODELO.metricas.ks}, mora de la cartera ${(MODELO.metricas.mora_cartera * 100).toFixed(2)}%.`);
di();

di("### Monotonia de los puntos");
di();
di("| Variable | IV | Puntos por bin | |");
di("| --- | --- | --- | --- |");
for (const v of MODELO.variables) {
  const pts = MODELO.puntos[v];
  const esCategorica = MODELO.bins[v].clase === "categorica";
  const sube = pts.every((p, i) => i === 0 || p >= pts[i - 1]);
  const baja = pts.every((p, i) => i === 0 || p <= pts[i - 1]);
  const ok = esCategorica || sube || baja;
  if (!ok) fallos++;
  di(`| ${v} | ${MODELO.iv[v].toFixed(3)} | ${pts.join(", ")} | ${ok ? (esCategorica ? "categorica" : "OK") : "**FALLA**"} |`);
}
di();

const puntuaEdad = MODELO.variables.includes("edad");
if (puntuaEdad) fallos++;
di(`La edad no puntua: ${puntuaEdad ? "**FALLA**" : "OK"}. Solo define elegibilidad.`);
di();

di("### Los montos de la demo");
di();
di("Ingreso de B/. 520, asalariado, una deuda de B/. 40 al mes, sin dependientes.");
di();
di("| Monto | Decision | Grado | Plazo | Tasa | Cuota | |");
di("| --- | --- | --- | --- | --- | --- | --- |");

const HOY_EVAL = new Date("2026-09-10T12:00:00.000Z");
const solBase = (monto) => ({
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  monto_solicitado_usd: monto,
  cedula: { numero: "8-123-4567", nombre: "Demo", fecha_nacimiento: "1990-05-04",
            fecha_expiracion: "2030-01-01", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40, personas_a_cargo: 0,
});

const MONTOS = [920, 812, 530, 170, 120, 28];
const aprobados = [];
for (const monto of MONTOS) {
  const r = decidir(solBase(monto), {}, HOY_EVAL);
  const ok = r.decision === "aprobada";
  if (!ok) fallos++;
  if (ok) aprobados.push({ monto: r.monto_aprobado_usd, pd: r.pd_pct / 100 });
  di(`| ${monto} | ${r.decision} | ${r.grado ?? "-"} | ${r.plazo_meses ?? "-"} | ${r.tasa_anual_pct ?? "-"}% | ${r.cuota_mensual_usd ?? "-"} | ${ok ? "OK" : "**FALLA**"} |`);
}
di();

di("### Invariantes");
di();
const invariantes = [];
for (const monto of MONTOS) {
  const r = decidir(solBase(monto), {}, HOY_EVAL);
  if (r.decision !== "aprobada") continue;
  invariantes.push(["la cuota nunca pasa la capacidad", r.cuota_mensual_usd <= 138.84]);
  invariantes.push(["el monto nunca pasa 3 veces el ingreso", r.monto_aprobado_usd <= 1560]);
  invariantes.push(["la tasa esta entre el piso y el techo", r.tasa_anual_pct >= 9.5 && r.tasa_anual_pct <= 24]);
  invariantes.push(["toda decision trae version de politica", Boolean(r.politica_version)]);
}
const rechazo = decidir({ ...solBase(920), ingresos: { ...solBase(920).ingresos, ingreso_mensual_usd: 260 }, personas_a_cargo: 3 }, {}, HOY_EVAL);
invariantes.push(["el rechazo dice cuanto puede pagar", /B\/\./.test(rechazo.motivo)]);
invariantes.push(["el rechazo trae factores accionables", rechazo.factores.every(f => f.que_cambiaria.length > 0)]);
const pre = preCalificar(solBase(920), HOY_EVAL);
invariantes.push(["la precalificacion se declara estimada", pre.estimado === true]);
invariantes.push(["precalificacion y decision coinciden en el monto", pre.monto === decidir(solBase(920), {}, HOY_EVAL).monto_aprobado_usd]);

const agrupadas = new Map();
for (const [nombre, ok] of invariantes) agrupadas.set(nombre, (agrupadas.get(nombre) ?? true) && ok);
di("| Invariante | |");
di("| --- | --- |");
for (const [nombre, ok] of agrupadas) {
  if (!ok) fallos++;
  di(`| ${nombre} | ${ok ? "OK" : "**FALLA**"} |`);
}
di();

di("### El precio contra la perdida");
di();
const sim = simular(aprobados);
const cobrado = aprobados.reduce((a, c) => a + c.monto * c.pd * 0.75, 0);
const cubre = cobrado >= sim.perdida_esperada;
if (!cubre) fallos++;
di(`Expuesto B/. ${sim.expuesto}. Perdida simulada B/. ${sim.perdida_esperada} (${sim.perdida_pct}%). ` +
   `Prima de riesgo cobrada B/. ${Math.round(cobrado * 100) / 100}. Provision B/. ${sim.provision}.`);
di();
di(`El precio cubre la perdida: ${cubre ? "OK" : "**FALLA**"}.`);
di();

di("## Resultado");
di();
di(fallos === 0
  ? "**Todo pasa.** Los casos producen exactamente sus senales declaradas, los marcadores clasifican en los tres estados, ninguna senal sale sin ruta ni sin fuente, y todo paquete sale con su costo y su fuente."
  : `**${fallos} comprobacion(es) fallan.** Ver arriba.`);

writeFileSync(resolve(import.meta.dirname, "resultados.md"), lineas.join("\n") + "\n");
console.log(`\n-> eval/resultados.md`);
process.exit(fallos ? 1 : 0);
