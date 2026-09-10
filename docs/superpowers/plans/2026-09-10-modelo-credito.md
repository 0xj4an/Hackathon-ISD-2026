# Modelo de análisis de crédito · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo de crédito de juguete de `nodo/credito.mjs` por un motor que mida capacidad de pago real, estime probabilidad de incumplimiento con un scorecard entrenado, descomponga la tasa en sus costos, despeje el plazo de la cuota y clasifique la cartera según el Acuerdo 4-2013.

**Architecture:** Un solo hogar en `mobile/src/core/credito/`, TypeScript sin dependencias. El nodo importa esos `.ts` por ruta relativa, sin build (verificado en Node v22.23.2). El scorecard se entrena offline sobre cartera sintética con semilla fija y se emite como `modelo.ts`. Dos entradas al motor: `preCalificar()` para el teléfono (estimado, sin bureau) y `decidir()` para el nodo (vinculante, con bureau y cartera).

**Tech Stack:** TypeScript sin dependencias, Node 22 con borrado de tipos nativo, `node --test` con `node:assert` para las pruebas, `tsc 5.9.3` (el del repo) solo para el eval.

**Spec:** `docs/superpowers/specs/2026-09-10-modelo-credito-design.md`

---

## Estado de ejecucion (2026-09-10)

Ejecutado inline. **13 de 14 tareas completas.** 48 pruebas pasan, `eval/run.mjs`
sale con codigo 0, el nodo arranca y responde por HTTP.

Lo unico que quedo fuera es el **cableado de `PantallaCuota` en `App.tsx`**
(Task 13, pasos 3 y 4). La pantalla existe y compila, escrita con las primitivas
de `mobile/src/ui/`, pero no se cablea porque `PantallaDocumentos` todavia no
extrae campos: sus props son `{ monto, onVolver }` y su estado son booleanos de
que foto se tomo. Sin ingreso leido no hay cuota que mostrar, y fabricarlo seria
poner un numero falso en pantalla. Se cablea cuando exista la extraccion, que es
el `[A]` del Bloque 2.

Dos correcciones al plan durante la ejecucion, ya aplicadas arriba:
`node --test` necesita el glob del shell, y el test de orden de factores
comparaba puntos crudos en vez de puntos perdidos.

---

## Global Constraints

- **No hacer `git commit` ni `git push`.** El repo tiene dos sesiones trabajando sobre el mismo working tree (ver `JOURNAL.md`, entrada del 2026-09-10). Los puntos de commit están marcados; el commit lo hace 0xj4an cuando quiera.
- **Avisar antes de tocar `mobile/src/core/schemas.ts`.** `SolicitudSchema` y `RespuestaBancoSchema` son el contrato entre teléfono y nodo, y `ADR-004` marca la deriva de schemas como el riesgo principal. Es archivo de Artur.
- **Cero dependencias nuevas.** Ni en `mobile/`, ni en `nodo/`, ni para entrenar.
- **Todo import relativo dentro de `credito/` lleva extensión `.ts` explícita.** Node lo exige. Es la excepción al estilo del resto de `mobile/src/core/`, y va comentada en el código.
- **Sintaxis borrable únicamente:** sin `enum`, sin `namespace`, sin propiedades de parámetro en constructores.
- **Ningún número suelto en el código.** Todo parámetro vive en `politica.ts` con su fuente.
- **Puntuación ASCII.** Sin em dashes, sin comillas curvas, sin flechas unicode. Aplica a código, comentarios y documentos.
- El LLM no participa en ninguna decisión de crédito (`ADR-005`).

---

## File Structure

- Create: `mobile/src/core/credito/politica.ts` - parámetros con su fuente. Única fuente de números.
- Create: `mobile/src/core/credito/finanzas.ts` - `cuota()` y redondeo a centavos.
- Create: `mobile/src/core/credito/capacidad.ts` - ingreso neto, mínimo vital, cuota máxima, exposición máxima.
- Create: `mobile/src/core/credito/modelo.ts` - generado por el entrenamiento. Bins, WOE, puntos, coeficientes, métricas, bandas de grado.
- Create: `mobile/src/core/credito/scorecard.ts` - aplica `modelo.ts` a una solicitud: score, PD, grado, detalle por variable.
- Create: `mobile/src/core/credito/precio.ts` - tasa descompuesta en fondeo, riesgo, opex, capital, margen.
- Create: `mobile/src/core/credito/estructura.ts` - elige plazo y recorta monto hasta que la cuota quepa.
- Create: `mobile/src/core/credito/explicacion.ts` - los tres factores que más movieron el puntaje.
- Create: `mobile/src/core/credito/motor.ts` - `preCalificar()` y `decidir()`.
- Create: `data/cartera-sintetica.mjs` - genera la cartera, entrena y emite `modelo.ts`.
- Create: `nodo/cartera.mjs` - clasificación y provisiones del Acuerdo 4-2013.
- Create: `eval/credito/*.test.mjs` - pruebas unitarias con `node --test`.
- Modify: `mobile/src/core/schemas.ts` - tres campos nuevos y la respuesta ampliada.
- Modify: `nodo/credito.mjs` - pasa de tener la política a ser la cáscara que llama al motor.
- Modify: `eval/run.mjs` - sección 5 y el flag `--rewriteRelativeImportExtensions`.
- Modify: `mobile/src/PantallaDocumentos.tsx` y `mobile/App.tsx` - pantalla nueva "Tu cuota".
- Create: `mobile/src/PantallaCuota.tsx` - la precalificación en pantalla.
- Create: `.ai/adr/ADR-011-el-modelo-de-credito.md` - la decisión y sus fuentes.

---

### Task 1: Política y finanzas

Los cimientos: los parámetros con su fuente, y la fórmula de cuota que usa todo lo demás.

**Files:**
- Create: `mobile/src/core/credito/politica.ts`
- Create: `mobile/src/core/credito/finanzas.ts`
- Create: `eval/credito/finanzas.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/finanzas.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { cuota, centavos } from "../../mobile/src/core/credito/finanzas.ts";
import { POLITICA } from "../../mobile/src/core/credito/politica.ts";

test("la cuota de un prestamo frances sale correcta", () => {
  // 920 a 14.5% anual en 12 meses. Verificado a mano: 82.82
  assert.equal(centavos(cuota(920, 14.5, 12)), 82.82);
});

test("tasa cero reparte el capital en partes iguales", () => {
  assert.equal(centavos(cuota(1200, 0, 12)), 100);
});

test("la politica declara fuente para cada parametro numerico", () => {
  for (const clave of Object.keys(POLITICA.valores)) {
    assert.ok(POLITICA.fuentes[clave], `falta la fuente de ${clave}`);
  }
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/*.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` sobre `finanzas.ts`.

- [ ] **Step 3: Escribir `finanzas.ts`**

```ts
// Aritmetica del prestamo. Sin dependencias: la usan el telefono y el nodo.
//
// OJO: dentro de `credito/` los imports relativos llevan extension `.ts`
// explicita, al reves que el resto de `mobile/src/core/`. Node lo exige para
// importar TypeScript sin build, que es como el nodo consume este motor.

/** Cuota fija de un prestamo frances. */
export function cuota(monto: number, tasaAnualPct: number, meses: number): number {
  const r = tasaAnualPct / 100 / 12;
  if (r === 0) return monto / meses;
  return (monto * r) / (1 - Math.pow(1 + r, -meses));
}

/** Redondeo a centavos. Todo lo que se le muestra a una persona pasa por aqui. */
export function centavos(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Escribir `politica.ts`**

```ts
// Los parametros del modelo de credito, cada uno con su fuente.
//
// Regla: ningun numero de politica vive en el codigo, todos viven aqui. Lo que
// no tiene cifra publicada que citar va marcado en `fuentes` como estimado,
// igual que hace `core/paquete.ts` con los precios sin fuente.

export type TipoIngreso = "asalariado" | "independiente" | "jubilado" | "otro";

export type ValoresPolitica = {
  deduccion_asalariado: number;
  deduccion_independiente: number;
  deduccion_jubilado: number;
  deduccion_otro: number;
  cbfa_per_capita: number;
  factor_no_alimentos: number;
  tope_dti: number;
  exposicion_x_ingreso: number;
  monto_min: number;
  monto_max: number;
  confianza_min: number;
  edad_min: number;
  edad_max: number;
  fondeo: number;
  lgd: number;
  opex_solicitud: number;
  capital_pct: number;
  retorno_exigido: number;
  margen: number;
  tasa_piso: number;
  tasa_techo: number;
  prima_plazo: number;
};

export type Politica = {
  version: string;
  valores: ValoresPolitica;
  plazos: number[];
  plazo_preferente: number;
  fuentes: Record<string, string>;
};

export const POLITICA: Politica = {
  version: "2026-09-10",
  plazos: [6, 12, 18, 24],
  plazo_preferente: 12,
  valores: {
    deduccion_asalariado: 0.11,
    deduccion_independiente: 0.05,
    deduccion_jubilado: 0,
    deduccion_otro: 0.05,
    cbfa_per_capita: 94.95,
    factor_no_alimentos: 1.6,
    tope_dti: 0.30,
    exposicion_x_ingreso: 3,
    monto_min: 25,
    monto_max: 5000,
    confianza_min: 0.5,
    edad_min: 18,
    edad_max: 75,
    fondeo: 0.045,
    lgd: 0.75,
    opex_solicitud: 6,
    capital_pct: 0.10,
    retorno_exigido: 0.15,
    margen: 0.02,
    tasa_piso: 0.095,
    tasa_techo: 0.24,
    prima_plazo: 0.005,
  },
  fuentes: {
    deduccion_asalariado: "CSS 9.75% mas seguro educativo 1.25% sobre el salario",
    deduccion_independiente: "Estimado. Provision de impuesto sobre la renta",
    deduccion_jubilado: "Las pensiones no cotizan a la CSS",
    deduccion_otro: "Estimado. Mismo criterio que independiente",
    cbfa_per_capita:
      "MEF, Canasta Basica Familiar de Alimentos, Resto Urbano del pais, marzo 2026: " +
      "B/. 341.81 para un hogar promedio de 3.6 miembros. 341.81 / 3.6 = 94.95",
    factor_no_alimentos:
      "Estimado. El MEF publica la canasta de alimentos; el gasto no alimentario " +
      "del hogar no tiene cifra mensual citable en la misma fuente",
    tope_dti: "Practica de mercado: regla 28/36, Fannie Mae 36% en suscripcion manual",
    exposicion_x_ingreso:
      "Ley 81 de 2009 de Panama: el limite de una tarjeta no puede pasar de tres " +
      "veces el ingreso mensual demostrado. Adaptado a prestamo personal",
    monto_min: "Politica del producto. Piso fijado en ADR-010",
    monto_max: "Politica del producto",
    confianza_min: "Politica. Debajo de esto la solicitud va a revision humana",
    edad_min: "Mayoria de edad",
    edad_max: "Politica. Edad al vencimiento del credito",
    fondeo: "Costo de depositos en la banca panamena, 2025 a 2026",
    lgd: "Perdida dado el incumplimiento en credito sin garantia",
    opex_solicitud: "Estimado. Originacion digital sin sucursal ni oficial en campo",
    capital_pct: "Ponderacion de capital para cartera de consumo",
    retorno_exigido: "Politica. Retorno sobre el capital asignado",
    margen: "Politica",
    tasa_piso:
      "Politica. Apenas encima del promedio de prestamos personales en Panama " +
      "(8.92%, SBP octubre 2025), porque ese promedio es de creditos con " +
      "descuento directo de planilla y este no lo tiene",
    tasa_techo:
      "Politica. Entre el promedio de tarjetas de credito (22.02%, SBP octubre " +
      "2025) y el maximo observado en el mercado panameno (27.12%)",
    prima_plazo: "Estimado. Recargo por plazo mayor al preferente",
  },
};

/** La deduccion de ley que aplica a cada tipo de ingreso. */
export function deduccionLey(tipo: TipoIngreso, pol: Politica = POLITICA): number {
  const v = pol.valores;
  if (tipo === "asalariado") return v.deduccion_asalariado;
  if (tipo === "independiente") return v.deduccion_independiente;
  if (tipo === "jubilado") return v.deduccion_jubilado;
  return v.deduccion_otro;
}
```

- [ ] **Step 5: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/*.test.mjs`
Expected: `# pass 3`, `# fail 0`.

- [ ] **Step 6: Punto de commit**

Listo para commitear como `feat: politica de credito con sus fuentes`. **No commitear:** lo hace 0xj4an.

---

### Task 2: Capacidad de pago

Reemplaza el `ing * 0.3`. Es la pieza que más cambia la respuesta del modelo.

**Files:**
- Create: `mobile/src/core/credito/capacidad.ts`
- Create: `eval/credito/capacidad.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/capacidad.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { capacidadDePago } from "../../mobile/src/core/credito/capacidad.ts";

const CASO = {
  ingreso_mensual_usd: 520,
  tipo: "asalariado",
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
};

test("el caso de la demo da los numeros esperados", () => {
  const c = capacidadDePago(CASO);
  assert.equal(c.neto, 462.80);          // 520 menos 11% de ley
  assert.equal(c.minimo_vital, 151.92);  // 94.95 por 1 persona por 1.6
  assert.equal(c.disponible, 270.88);    // 462.80 - 40 - 151.92
  assert.equal(c.cuota_max, 138.84);     // manda el techo del 30%, no el residual
  assert.equal(c.monto_max, 1560);       // 3 veces el ingreso
});

test("con ingreso bajo manda el residual y no el ratio", () => {
  // 300 de ingreso: neto 267, minimo vital 151.92, deuda 40 -> disponible 75.08.
  // El techo del 30% seria 80.10, mas alto. Ata el residual.
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 300 });
  assert.equal(c.disponible, 75.08);
  assert.equal(c.cuota_max, 75.08);
  assert.equal(c.ata, "residual");
});

test("con ingreso alto manda el ratio y no el residual", () => {
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 520 });
  assert.equal(c.cuota_max, 138.84);
  assert.equal(c.ata, "ratio");
});

test("las deudas vigentes bajan la capacidad peso por peso", () => {
  const sin = capacidadDePago({ ...CASO, deudas_mensuales_usd: 0 });
  const con = capacidadDePago({ ...CASO, deudas_mensuales_usd: 200 });
  assert.equal(sin.disponible - con.disponible, 200);
});

test("cada persona a cargo sube el minimo vital", () => {
  const solo = capacidadDePago(CASO);
  const con_dos = capacidadDePago({ ...CASO, personas_a_cargo: 2 });
  assert.equal(con_dos.minimo_vital, 455.76); // 94.95 por 3 por 1.6
  assert.ok(con_dos.disponible < solo.disponible);
});

test("la capacidad nunca es negativa", () => {
  const c = capacidadDePago({ ...CASO, ingreso_mensual_usd: 250, personas_a_cargo: 4 });
  assert.equal(c.disponible, 0);
  assert.equal(c.cuota_max, 0);
});

test("el jubilado no paga deducciones de ley", () => {
  const c = capacidadDePago({ ...CASO, tipo: "jubilado" });
  assert.equal(c.neto, 520);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/capacidad.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` sobre `capacidad.ts`.

- [ ] **Step 3: Escribir `capacidad.ts`**

```ts
// Capacidad de pago: cuanto puede pagar al mes esta persona.
//
// El Acuerdo 4-2013 de la Superintendencia de Bancos de Panama la define en su
// articulo 2 numeral 4 como "el resultado de la medicion objetiva que realiza
// el banco para cada deudor de las fuentes de recursos de que dispone para el
// pago de sus obligaciones". Objetiva y por deudor: por eso no es un porcentaje
// del ingreso puesto a dedo.
//
// Se mide de dos formas y manda la mas restrictiva:
//   1. Ingreso residual: lo que sobra despues de deudas y del minimo vital.
//   2. Ratio de servicio de deuda: un techo sobre el ingreso neto.
// Con ingresos bajos el ratio miente y el residual es el que ata. Con ingresos
// altos pasa al reves.

import { POLITICA, deduccionLey, type Politica, type TipoIngreso } from "./politica.ts";
import { centavos } from "./finanzas.ts";

export type EntradaCapacidad = {
  ingreso_mensual_usd: number;
  tipo: TipoIngreso;
  /** Suma de las cuotas mensuales que la persona ya paga. Back-end, no front-end. */
  deudas_mensuales_usd: number;
  personas_a_cargo: number;
};

export type Capacidad = {
  neto: number;
  minimo_vital: number;
  disponible: number;
  cuota_max: number;
  monto_max: number;
  /** Cual de las dos medidas ato la cuota. Va en la explicacion del rechazo. */
  ata: "residual" | "ratio";
};

export function capacidadDePago(e: EntradaCapacidad, pol: Politica = POLITICA): Capacidad {
  const v = pol.valores;
  const neto = centavos(e.ingreso_mensual_usd * (1 - deduccionLey(e.tipo, pol)));
  const minimo_vital = centavos(
    v.cbfa_per_capita * (1 + e.personas_a_cargo) * v.factor_no_alimentos,
  );
  const disponible = Math.max(0, centavos(neto - e.deudas_mensuales_usd - minimo_vital));
  const techo_ratio = centavos(neto * v.tope_dti);
  const cuota_max = Math.min(disponible, techo_ratio);
  const monto_max = Math.min(v.exposicion_x_ingreso * e.ingreso_mensual_usd, v.monto_max);
  return {
    neto,
    minimo_vital,
    disponible,
    cuota_max: centavos(cuota_max),
    monto_max,
    ata: disponible <= techo_ratio ? "residual" : "ratio",
  };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/capacidad.test.mjs`
Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Comprobar el contraste con el modelo viejo**

Run:
```bash
node -e '
import("./mobile/src/core/credito/capacidad.ts").then(({capacidadDePago}) => {
  const c = capacidadDePago({ingreso_mensual_usd:520, tipo:"asalariado", deudas_mensuales_usd:40, personas_a_cargo:0});
  console.log("modelo viejo (30% del bruto):", (520*0.3).toFixed(2));
  console.log("modelo nuevo:", c.cuota_max.toFixed(2), "ata:", c.ata);
});'
```
Expected: viejo `156.00`, nuevo `138.84`, ata `ratio`. Anotar el contraste para el ADR.

- [ ] **Step 6: Punto de commit**

`feat: capacidad de pago back-end con piso de subsistencia`. **No commitear.**

---

### Task 3: Los tres campos nuevos en el contrato

**AVISAR A ARTUR ANTES DE EMPEZAR.** `schemas.ts` es el contrato entre teléfono y nodo, y `ADR-004` marca su deriva como el riesgo principal de la demo.

**Files:**
- Modify: `mobile/src/core/schemas.ts`
- Create: `eval/credito/schemas.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/schemas.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { SolicitudSchema, RespuestaBancoSchema } from "../../mobile/src/core/schemas.ts";

const BASE = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  creada: "2026-09-10T12:00:00.000Z",
  proposito: "salud",
  monto_solicitado_usd: 920,
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
  estado: "pendiente",
};

test("la solicitud acepta los tres campos nuevos", () => {
  const s = SolicitudSchema.parse(BASE);
  assert.equal(s.deudas_mensuales_usd, 40);
  assert.equal(s.personas_a_cargo, 0);
  assert.equal(s.ingresos.antiguedad_meses, 36);
});

test("las deudas y las personas a cargo tienen valor por defecto", () => {
  const sin = { ...BASE };
  delete sin.deudas_mensuales_usd;
  delete sin.personas_a_cargo;
  const s = SolicitudSchema.parse(sin);
  assert.equal(s.deudas_mensuales_usd, 0);
  assert.equal(s.personas_a_cargo, 0);
});

test("la respuesta del banco acepta grado, componentes y factores", () => {
  const r = RespuestaBancoSchema.parse({
    solicitud_id: BASE.id, decision: "aprobada", monto_aprobado_usd: 920,
    plazo_meses: 12, tasa_anual_pct: 10.08, cuota_mensual_usd: 80.92,
    grado: "A", pd_pct: 2.5,
    tasa_componentes: { fondeo: 4.5, riesgo: 1.88, opex: 0.65, capital: 1.05, margen: 2 },
    factores: [{ variable: "saldo_sobre_ingreso", valor: 0.4, puntos: 12,
                 que_cambiaria: "Mantener saldo en la cuenta sube tu puntaje" }],
    politica_version: "2026-09-10",
    motivo: "aprobado por capacidad de pago", ts: "2026-09-10T12:00:01.000Z",
  });
  assert.equal(r.grado, "A");
  assert.equal(r.factores.length, 1);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/schemas.test.mjs`
Expected: FAIL. `antiguedad_meses` no existe y `zod` rechaza `grado`.

Nota: si falla por no resolver `zod` desde un `.mjs` de `eval/`, correr con `node --test --experimental-strip-types` desde `mobile/` o añadir `NODE_PATH=mobile/node_modules`. `zod` está instalado en `mobile/node_modules`.

- [ ] **Step 3: Ampliar `IngresosSchema`**

En `mobile/src/core/schemas.ts`, dentro de `IngresosSchema`, después de `tipo`:

```ts
  /** De la carta laboral. Es la variable mas predictiva despues del ingreso. */
  antiguedad_meses: z.number().int().min(0).max(600).optional(),
```

- [ ] **Step 4: Ampliar `SolicitudSchema`**

Después de `ingresos`:

```ts
  /**
   * Lo que la persona ya paga al mes en otras deudas. Sin este campo la
   * capacidad de pago seria front-end (solo sobre el ingreso) y mentiria: el
   * Acuerdo 4-2013 mide las fuentes de recursos disponibles, no el ingreso.
   * Lo declara la persona; si hay extracto se contrasta y manda el mayor.
   */
  deudas_mensuales_usd: z.number().min(0).max(20000).default(0),
  /** Escala el minimo vital del hogar. */
  personas_a_cargo: z.number().int().min(0).max(15).default(0),
```

- [ ] **Step 5: Ampliar `RespuestaBancoSchema`**

Antes de `motivo`, y añadir el tipo `FactorSchema` justo encima de `RespuestaBancoSchema`:

```ts
/** Por que salio esta decision. Lo que un banco llama adverse action. */
export const FactorSchema = z.object({
  variable: z.string(),
  valor: z.number(),
  puntos: z.number().int(),
  que_cambiaria: z.string(),
});
```

y dentro de `RespuestaBancoSchema`:

```ts
  grado: z.enum(["A", "B", "C", "D", "E"]).optional(),
  pd_pct: z.number().min(0).max(100).optional(),
  tasa_componentes: z.object({
    fondeo: z.number(), riesgo: z.number(), opex: z.number(),
    capital: z.number(), margen: z.number(),
  }).optional(),
  factores: z.array(FactorSchema).default([]),
  politica_version: z.string().optional(),
```

- [ ] **Step 6: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/schemas.test.mjs`
Expected: `# pass 3`, `# fail 0`.

- [ ] **Step 7: Punto de commit**

`feat: tres campos que el modelo de credito necesita`. **No commitear.**

---

### Task 4: Cartera sintética y entrenamiento del scorecard

Este script no corre en la app ni en el nodo: corre a mano, y su salida (`modelo.ts`) es la que se versiona.

**Files:**
- Create: `data/cartera-sintetica.mjs`
- Create: `mobile/src/core/credito/modelo.ts` (generado por el script)

- [ ] **Step 1: Escribir el generador**

Crear `data/cartera-sintetica.mjs`. El código de abajo está verificado: corrido tal cual da 13.27% de mora, AUC de 0.712 en holdout y KS de 0.364.

```js
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
 * desarrollo de un scorecard, y aqui ademas subio el AUC de holdout de 0.712 a
 * 0.722.
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

// Swap set: que se gana y que se pierde en cada corte. El cutoff es decision de
// negocio, no estadistica, y esta tabla es la que la sostiene.
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
```

- [ ] **Step 2: Correr el entrenamiento**

Run: `node data/cartera-sintetica.mjs`

Expected, exacto porque la semilla es fija:

```text
tasa de mora de la cartera: 13.27%

IV por variable:
  tipo             0.245
  antiguedad       0.030
  deuda_ing        0.241
  monto_ing        0.074
  meses_extracto   0.309
  saldo_ing        0.304

AUC entrena 0.758  AUC prueba 0.723
KS  entrena 0.403   KS prueba 0.379

grado  n     mora real   PD media   (holdout)
  A   112       3.6%       2.7%
  B   147       4.8%       6.4%
  C   160      10.6%      12.3%
  D   127      22.8%      23.0%
  E    54      29.6%      39.9%

puntos por bin (comprobacion de monotonia):
  tipo             101  116  84  59
  antiguedad        85   85  95
  deuda_ing        112  109  91  75
  monto_ing         99   99  91  82
  meses_extracto    84   93  95  109
  saldo_ing         84  101  105
```

- [ ] **Step 3: Verificar la monotonía, dos veces**

Primero, la mora real tiene que subir de A a E sin retrocesos: 3.6, 4.8, 10.6, 22.8, 29.6.

Segundo, los puntos de cada variable **numérica** tienen que ser monótonos (`tipo` es categórica y queda exenta): más deuda nunca puede sumar puntos, más meses de extracto nunca puede restarlos. Si un bin rompe el orden, el arreglo es re-binar esa variable con cortes más gruesos y volver a correr, no ignorarlo.

- [ ] **Step 4: Verificar que el archivo generado existe y parsea**

Run: `node -e 'import("./mobile/src/core/credito/modelo.ts").then(m => console.log(m.MODELO.variables.join(", "), "| AUC", m.MODELO.metricas.auc))'`
Expected: `tipo, antiguedad, deuda_ing, monto_ing, meses_extracto, saldo_ing | AUC 0.723`

- [ ] **Step 5: Punto de commit**

`feat: scorecard entrenado sobre cartera sintetica`. **No commitear.**

---

### Task 5: Aplicar el scorecard

**Files:**
- Create: `mobile/src/core/credito/scorecard.ts`
- Create: `eval/credito/scorecard.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/scorecard.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { variablesDe, evaluar } from "../../mobile/src/core/credito/scorecard.ts";

const SOL = {
  monto_solicitado_usd: 920,
  cedula: { fecha_nacimiento: "1990-05-04" },
  ingresos: { ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36 },
  deudas_mensuales_usd: 40,
};

test("las variables salen de la solicitud", () => {
  const v = variablesDe(SOL, new Date("2026-09-10T12:00:00Z"));
  assert.equal(v.tipo, "asalariado");
  assert.equal(v.antiguedad, 36);
  assert.equal(Number(v.deuda_ing.toFixed(4)), 0.0769); // 40 / 520
  assert.equal(Number(v.monto_ing.toFixed(4)), 1.7692); // 920 / 520
  assert.equal(v.meses_extracto, 0);
  assert.equal(v.saldo_ing, 0);
  assert.equal(v.edad, 36);
});

test("el extracto entra cuando existe", () => {
  const v = variablesDe({ ...SOL, extracto: { saldo_promedio_usd: 208, meses_cubiertos: 6 } },
                        new Date("2026-09-10T12:00:00Z"));
  assert.equal(v.meses_extracto, 6);
  assert.equal(Number(v.saldo_ing.toFixed(2)), 0.4);
});

test("el extracto mejora el puntaje", () => {
  // Verificado contra el modelo entrenado: 545 -> 587 puntos, grado C -> A,
  // PD de 12.3% a 3.2%. Es la promesa que PantallaCredito ya le hace a la
  // persona ("si lo tienes, baja la tasa"), ahora cumplida de verdad.
  const hoy = new Date("2026-09-10T12:00:00Z");
  const sin = evaluar(variablesDe(SOL, hoy));
  const con = evaluar(variablesDe({ ...SOL, extracto: { saldo_promedio_usd: 208, meses_cubiertos: 6 } }, hoy));
  assert.equal(sin.grado, "C");
  assert.equal(con.grado, "A");
  assert.ok(con.score > sin.score, "el extracto tiene que sumar puntos");
  assert.ok(con.pd < sin.pd, "y bajar la probabilidad de incumplimiento");
});

test("la edad no puntua", () => {
  const r = evaluar(variablesDe(SOL, new Date("2026-09-10T12:00:00Z")));
  assert.ok(!r.detalle.some(d => d.variable === "edad"),
    "la edad se usa para elegibilidad, nunca para puntuar");
});

test("el detalle explica cada variable", () => {
  const r = evaluar(variablesDe(SOL, new Date("2026-09-10T12:00:00Z")));
  assert.equal(r.detalle.length, 6);
  assert.equal(r.detalle.reduce((a, d) => a + d.puntos, 0), r.score);
  assert.ok(["A", "B", "C", "D", "E"].includes(r.grado));
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/scorecard.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` sobre `scorecard.ts`.

- [ ] **Step 3: Escribir `scorecard.ts`**

```ts
// Aplica el scorecard entrenado. No entrena nada: lee `modelo.ts`.
//
// Un scorecard es una suma de enteros. Eso lo hace explicable de un vistazo y
// es la razon por la que cumple `ADR-005` mientras que un modelo de lenguaje
// decidiendo credito no lo cumpliria.

import { MODELO, type Modelo, type DefinicionBin } from "./modelo.ts";
import type { TipoIngreso } from "./politica.ts";

export type Variables = {
  tipo: TipoIngreso;
  antiguedad: number;
  deuda_ing: number;
  monto_ing: number;
  meses_extracto: number;
  saldo_ing: number;
  edad: number;
};

export type DetalleVariable = {
  variable: string;
  valor: number | string;
  bin: number;
  puntos: number;
  woe: number;
};

export type Puntuacion = {
  score: number;
  pd: number;
  grado: "A" | "B" | "C" | "D" | "E";
  detalle: DetalleVariable[];
};

/** Solo lo que el scorecard necesita de una solicitud. */
export type EntradaScorecard = {
  monto_solicitado_usd: number;
  deudas_mensuales_usd?: number;
  cedula: { fecha_nacimiento: string };
  ingresos: { ingreso_mensual_usd: number; tipo: TipoIngreso; antiguedad_meses?: number };
  extracto?: { saldo_promedio_usd: number; meses_cubiertos: number };
};

export function edadEn(fechaNacimiento: string, hoy: Date): number {
  const n = new Date(fechaNacimiento);
  let edad = hoy.getUTCFullYear() - n.getUTCFullYear();
  const mes = hoy.getUTCMonth() - n.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < n.getUTCDate())) edad--;
  return edad;
}

export function variablesDe(sol: EntradaScorecard, hoy: Date = new Date()): Variables {
  const ingreso = sol.ingresos.ingreso_mensual_usd;
  return {
    tipo: sol.ingresos.tipo,
    antiguedad: sol.ingresos.antiguedad_meses ?? 0,
    deuda_ing: (sol.deudas_mensuales_usd ?? 0) / ingreso,
    monto_ing: sol.monto_solicitado_usd / ingreso,
    meses_extracto: sol.extracto?.meses_cubiertos ?? 0,
    saldo_ing: sol.extracto ? sol.extracto.saldo_promedio_usd / ingreso : 0,
    edad: edadEn(sol.cedula.fecha_nacimiento, hoy),
  };
}

function indiceBin(valor: number | string, d: DefinicionBin): number {
  if (d.clase === "categorica") {
    const i = d.valores.indexOf(String(valor));
    return i < 0 ? d.valores.length - 1 : i;
  }
  let i = 0;
  for (const c of d.cortes) if (Number(valor) >= c) i++;
  return i;
}

export function evaluar(v: Variables, modelo: Modelo = MODELO): Puntuacion {
  const detalle: DetalleVariable[] = [];
  let z = modelo.intercepto;
  let score = 0;
  for (const nombre of modelo.variables) {
    const valor = v[nombre as keyof Variables];
    const bin = indiceBin(valor, modelo.bins[nombre]);
    const woe = modelo.woe[nombre][bin];
    const puntos = modelo.puntos[nombre][bin];
    z += modelo.coeficientes[nombre] * woe;
    score += puntos;
    detalle.push({ variable: nombre, valor, bin, puntos, woe });
  }
  const pd = 1 / (1 + Math.exp(-z));
  const bd = modelo.bandas;
  const grado = score >= bd.A ? "A" : score >= bd.B ? "B" : score >= bd.C ? "C" : score >= bd.D ? "D" : "E";
  return { score, pd, grado, detalle };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/scorecard.test.mjs`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Punto de commit**

`feat: aplicar el scorecard a una solicitud`. **No commitear.**

---

### Task 6: Precio

**Files:**
- Create: `mobile/src/core/credito/precio.ts`
- Create: `eval/credito/precio.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/precio.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { precio } from "../../mobile/src/core/credito/precio.ts";

test("el caso bueno de la demo sale en 10.08%", () => {
  // PD 2.5% (grado A), 920 a 12 meses. Verificado a mano.
  const p = precio(0.025, 920, 12);
  assert.equal(p.tasa_anual_pct, 10.08);
  assert.equal(p.bajo_costo, false);
  assert.equal(p.componentes.fondeo, 4.5);
  assert.equal(p.componentes.riesgo, 1.88);
  assert.equal(p.componentes.opex, 0.65);
});

test("el opex se come los montos chicos", () => {
  const grande = precio(0.025, 920, 12);
  const chico = precio(0.025, 28, 6);
  assert.ok(chico.componentes.opex > 40, "28 balboas a 6 meses son mas de 40% solo de opex");
  assert.ok(chico.componentes.opex > grande.componentes.opex * 50);
});

test("la tasa se acota al techo y se marca bajo costo", () => {
  const p = precio(0.231, 920, 12); // grado D
  assert.equal(p.tasa_anual_pct, 24);
  assert.equal(p.bajo_costo, true);
  assert.ok(p.bruta_pct > 24);
});

test("nunca baja del piso", () => {
  const p = precio(0.001, 5000, 24);
  assert.ok(p.tasa_anual_pct >= 9.5);
});

test("el plazo largo cobra prima", () => {
  const corto = precio(0.05, 1000, 12);
  const largo = precio(0.05, 1000, 24);
  assert.ok(largo.bruta_pct > corto.bruta_pct);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/precio.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` sobre `precio.ts`.

- [ ] **Step 3: Escribir `precio.ts`**

```ts
// La tasa no es un numero, es una suma de costos.
//
//   tasa = fondeo + perdida esperada + costo de originar + cargo de capital + margen
//
// El termino de opex es el que ensena la tesis del proyecto: con 920 a 12 meses
// pesa 0.65% anual, con 28 a 6 meses pesa 42.86%. Por eso el microcredito real
// cuesta 20 a 40 por ciento, y por eso originar sin sucursal es lo unico que
// permite cobrar menos.
//
// Cuando el costo real pasa del techo la tasa se acota y el banco absorbe la
// diferencia: el credito pequeno se sostiene con el grande. Es decision de
// producto, y por eso se marca `bajo_costo` en vez de esconderlo.

import { POLITICA, type Politica } from "./politica.ts";
import { centavos } from "./finanzas.ts";

export type Componentes = {
  fondeo: number; riesgo: number; opex: number; capital: number; margen: number;
};

export type Precio = {
  tasa_anual_pct: number;
  bruta_pct: number;
  bajo_costo: boolean;
  componentes: Componentes;
};

export function precio(pd: number, monto: number, meses: number, pol: Politica = POLITICA): Precio {
  const v = pol.valores;
  const anios = meses / 12;
  const riesgo = pd * v.lgd;
  const opex = v.opex_solicitud / (monto * anios);
  const capital = v.capital_pct * (v.retorno_exigido - v.fondeo);
  const extra = meses > pol.plazo_preferente
    ? v.prima_plazo * ((meses - pol.plazo_preferente) / 12)
    : 0;
  const bruta = v.fondeo + riesgo + opex + capital + v.margen + extra;
  const tasa = Math.min(Math.max(bruta, v.tasa_piso), v.tasa_techo);
  return {
    tasa_anual_pct: centavos(tasa * 100),
    bruta_pct: centavos(bruta * 100),
    bajo_costo: bruta > v.tasa_techo,
    componentes: {
      fondeo: centavos(v.fondeo * 100),
      riesgo: centavos(riesgo * 100),
      opex: centavos(opex * 100),
      capital: centavos(capital * 100),
      margen: centavos(v.margen * 100),
    },
  };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/precio.test.mjs`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Punto de commit**

`feat: tasa descompuesta en sus costos`. **No commitear.**

---

### Task 7: Estructura, el plazo sale de la cuota

**Files:**
- Create: `mobile/src/core/credito/estructura.ts`
- Create: `eval/credito/estructura.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/estructura.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { estructurar } from "../../mobile/src/core/credito/estructura.ts";

const CAPACIDAD = { cuota_max: 138.84, monto_max: 1560 };

test("el paquete anual cae en 12 meses", () => {
  // 920 con PD pasada a mano como 0.123. El motor usa la PD exacta del modelo
  // (0.122651) y da 17.40% y 84.08: la diferencia es el redondeo de la PD, no
  // un error. Aqui se prueba la funcion, no el modelo.
  const r = estructurar(0.123, 920, CAPACIDAD);
  assert.equal(r.monto, 920);
  assert.equal(r.meses, 12);
  assert.equal(r.tasa_anual_pct, 17.43);
  assert.equal(r.cuota, 84.10);
});

test("el extracto baja la cuota del mismo monto", () => {
  const sin = estructurar(0.123, 920, CAPACIDAD);
  const con = estructurar(0.032, 920, CAPACIDAD);
  assert.equal(con.tasa_anual_pct, 10.60);
  assert.equal(con.cuota, 81.14);
  assert.ok(con.cuota < sin.cuota);
});

test("el monto chico toma el plazo mas corto que quepa", () => {
  const r = estructurar(0.123, 170, CAPACIDAD);
  assert.equal(r.meses, 6);
  assert.equal(r.cuota, 30.33);
});

test("cuando no cabe, recorta el monto", () => {
  const r = estructurar(0.123, 920, { cuota_max: 40, monto_max: 1560 });
  assert.ok(r !== null);
  assert.ok(r.monto < 920, "tuvo que recortar");
  assert.ok(r.cuota <= 40);
});

test("si ni el minimo cabe, no hay estructura", () => {
  assert.equal(estructurar(0.123, 920, { cuota_max: 1, monto_max: 1560 }), null);
});

test("nunca pasa del tope de exposicion", () => {
  const r = estructurar(0.032, 5000, { cuota_max: 500, monto_max: 1560 });
  assert.ok(r.monto <= 1560);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/estructura.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Escribir `estructura.ts`**

```ts
// Monto y plazo. El plazo NO se escalona por monto: sale de la cuota que cabe.
//
// El modelo viejo hacia lo contrario (<=300 seis meses, <=1000 doce, arriba
// veinticuatro), que es poner la causa despues del efecto.
//
// La tasa depende del monto y del plazo, y la PD tambien depende del monto
// porque `monto_sobre_ingreso` es variable del scorecard. No hace falta punto
// fijo: se recorren candidatos de monto en orden descendente y, dentro de cada
// uno, plazos en orden ascendente, recalculando todo. El primero que cabe gana,
// que ademas es el plazo mas corto y por tanto el que menos intereses paga.

import { POLITICA, type Politica } from "./politica.ts";
import { cuota as cuotaDe, centavos } from "./finanzas.ts";
import { precio, type Componentes } from "./precio.ts";

export type Estructura = {
  monto: number;
  meses: number;
  tasa_anual_pct: number;
  cuota: number;
  bajo_costo: boolean;
  componentes: Componentes;
  recortado: boolean;
};

export function estructurar(
  pd: number,
  pedido: number,
  cap: { cuota_max: number; monto_max: number },
  pol: Politica = POLITICA,
): Estructura | null {
  const inicial = Math.min(pedido, cap.monto_max);
  let monto = inicial;
  while (monto >= pol.valores.monto_min) {
    for (const meses of pol.plazos) {
      const p = precio(pd, monto, meses, pol);
      const c = centavos(cuotaDe(monto, p.tasa_anual_pct, meses));
      if (c <= cap.cuota_max) {
        return {
          monto: Math.round(monto),
          meses,
          tasa_anual_pct: p.tasa_anual_pct,
          cuota: c,
          bajo_costo: p.bajo_costo,
          componentes: p.componentes,
          recortado: Math.round(monto) < Math.round(pedido),
        };
      }
    }
    monto = Math.floor(monto * 0.9);
  }
  return null;
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/estructura.test.mjs`
Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Punto de commit**

`feat: el plazo sale de la cuota, no del monto`. **No commitear.**

---

### Task 8: Explicación accionable

**Files:**
- Create: `mobile/src/core/credito/explicacion.ts`
- Create: `eval/credito/explicacion.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/explicacion.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { variablesDe, evaluar } from "../../mobile/src/core/credito/scorecard.ts";
import { factoresDe } from "../../mobile/src/core/credito/explicacion.ts";
import { MODELO } from "../../mobile/src/core/credito/modelo.ts";

const SOL = {
  monto_solicitado_usd: 920,
  cedula: { fecha_nacimiento: "1990-05-04" },
  ingresos: { ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36 },
  deudas_mensuales_usd: 40,
};
const hoy = new Date("2026-09-10T12:00:00Z");

test("devuelve como mucho tres factores", () => {
  const f = factoresDe(evaluar(variablesDe(SOL, hoy)), variablesDe(SOL, hoy), SOL);
  assert.ok(f.length <= 3 && f.length > 0);
});

test("el primer factor es el que mas puntos cuesta", () => {
  // El orden es por puntos PERDIDOS (el maximo de esa variable menos lo que
  // saco), no por puntos crudos: cada variable tiene un maximo distinto, asi
  // que 84 puntos en una puede costar mas que 91 en otra.
  const f = factoresDe(evaluar(variablesDe(SOL, hoy)), variablesDe(SOL, hoy), SOL);
  const perdidos = (x) => Math.max(...MODELO.puntos[x.variable]) - x.puntos;
  for (let i = 1; i < f.length; i++) {
    assert.ok(perdidos(f[i - 1]) >= perdidos(f[i]),
      `${f[i - 1].variable} deberia costar mas que ${f[i].variable}`);
  }
});

test("sin extracto, el extracto sale como factor y dice que hacer", () => {
  const v = variablesDe(SOL, hoy);
  const f = factoresDe(evaluar(v), v, SOL);
  const extracto = f.find(x => x.variable === "meses_extracto" || x.variable === "saldo_ing");
  assert.ok(extracto, "sin extracto ese tiene que ser uno de los factores que mas pesan");
  assert.ok(extracto.que_cambiaria.length > 10);
});

test("cada factor trae una accion concreta", () => {
  const v = variablesDe(SOL, hoy);
  for (const factor of factoresDe(evaluar(v), v, SOL)) {
    assert.ok(factor.que_cambiaria.trim().length > 0, `${factor.variable} sin accion`);
    assert.notEqual(factor.variable, "edad", "la edad no se le reprocha a nadie");
  }
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/explicacion.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Escribir `explicacion.ts`**

```ts
// Por que salio esta decision, en algo que la persona pueda hacer.
//
// Un banco llama a esto adverse action: no basta decir "capacidad de pago
// insuficiente", hay que decir que factor peso y que tendria que cambiar. El
// EU AI Act lo exige para sistemas de credito desde agosto de 2026, y aunque
// Panama no lo aplique, decir "no" sin decir "por que" es inutil para quien
// esta del otro lado de la pantalla.
//
// Solo entran variables ACCIONABLES: cosas que la persona puede cambiar. Por
// eso la edad no esta en el scorecard.

import { MODELO, type Modelo } from "./modelo.ts";
import type { Puntuacion, Variables } from "./scorecard.ts";

export type Factor = {
  variable: string;
  valor: number;
  puntos: number;
  que_cambiaria: string;
};

type Contexto = { ingresos: { ingreso_mensual_usd: number } };

function accion(variable: string, gana: number, ctx: Contexto, modelo: Modelo): string {
  const ingreso = ctx.ingresos.ingreso_mensual_usd;
  const def = modelo.bins[variable];
  const corte = def.clase === "numerica" ? def.cortes : [];
  const puntos = `sumaria ${gana} puntos`;
  switch (variable) {
    case "meses_extracto":
      return `Adjuntar un extracto bancario de al menos ${corte[2] ?? 6} meses ${puntos}`;
    case "saldo_ing":
      return `Mantener un saldo promedio de B/. ${Math.ceil((corte[1] ?? 0.5) * ingreso)} en la cuenta ${puntos}`;
    case "deuda_ing":
      return `Bajar tus cuotas de otras deudas a menos de B/. ${Math.floor((corte[0] ?? 0.05) * ingreso)} al mes ${puntos}`;
    case "monto_ing":
      return `Pedir menos de B/. ${Math.floor((corte[1] ?? 0.8) * ingreso)} ${puntos}`;
    case "antiguedad":
      return `Cumplir ${corte[1] ?? 60} meses en la misma actividad ${puntos}`;
    case "tipo":
      return `Un ingreso con carta laboral verificable ${puntos}`;
    default:
      return "";
  }
}

export function factoresDe(
  p: Puntuacion,
  v: Variables,
  ctx: Contexto,
  modelo: Modelo = MODELO,
): Factor[] {
  return p.detalle
    .map((d) => {
      const posibles = modelo.puntos[d.variable];
      const mejor = Math.max(...posibles);
      const gana = mejor - d.puntos;
      return {
        variable: d.variable,
        valor: typeof d.valor === "number" ? Number(d.valor.toFixed(4)) : 0,
        puntos: d.puntos,
        perdidos: gana,
        que_cambiaria: gana > 0 ? accion(d.variable, gana, ctx, modelo) : "",
      };
    })
    .filter((f) => f.que_cambiaria !== "")
    .sort((a, b) => b.perdidos - a.perdidos)
    .slice(0, 3)
    .map(({ variable, valor, puntos, que_cambiaria }) => ({ variable, valor, puntos, que_cambiaria }));
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/explicacion.test.mjs`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Ver la explicación con ojos de persona**

Run:
```bash
node -e '
Promise.all([
  import("./mobile/src/core/credito/scorecard.ts"),
  import("./mobile/src/core/credito/explicacion.ts"),
]).then(([sc, ex]) => {
  const sol = { monto_solicitado_usd: 920, cedula: { fecha_nacimiento: "1990-05-04" },
    ingresos: { ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36 },
    deudas_mensuales_usd: 40 };
  const v = sc.variablesDe(sol, new Date("2026-09-10T12:00:00Z"));
  for (const f of ex.factoresDe(sc.evaluar(v), v, sol)) console.log("-", f.que_cambiaria);
});'
```
Expected: tres frases en español, cada una con una acción y un número. Si alguna suena a jerga de banco, reescribirla: la lee alguien que no terminó la escuela.

- [ ] **Step 6: Punto de commit**

`feat: explicar la decision en algo accionable`. **No commitear.**

---

### Task 9: El motor

**Files:**
- Create: `mobile/src/core/credito/motor.ts`
- Create: `eval/credito/motor.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/motor.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { preCalificar, decidir } from "../../mobile/src/core/credito/motor.ts";

const HOY = new Date("2026-09-10T12:00:00Z");
const SOL = {
  id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
  monto_solicitado_usd: 920,
  cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04",
            fecha_expiracion: "2030-01-01", confianza: 0.9 },
  ingresos: { empleador_o_actividad: "Finca La Union", ingreso_mensual_usd: 520,
              tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
  deudas_mensuales_usd: 40,
  personas_a_cargo: 0,
};

test("precalificar no promete, estima", () => {
  // PD del modelo para este solicitante: 0.122651, grado C. De ahi salen
  // 17.40% y 84.08. Ojo: no son los mismos numeros que en el test de
  // estructura, que pasa la PD a mano redondeada a 0.123.
  const r = preCalificar(SOL, HOY);
  assert.equal(r.estimado, true);
  assert.equal(r.monto, 920);
  assert.equal(r.meses, 12);
  assert.equal(r.cuota, 84.08);
});

test("decidir aprueba el caso de la demo", () => {
  const r = decidir(SOL, {}, HOY);
  assert.equal(r.decision, "aprobada");
  assert.equal(r.monto_aprobado_usd, 920);
  assert.equal(r.plazo_meses, 12);
  assert.equal(r.tasa_anual_pct, 17.40);
  assert.equal(r.cuota_mensual_usd, 84.08);
  assert.equal(r.grado, "C");
  assert.equal(r.politica_version, "2026-09-10");
  assert.ok(r.factores.length > 0);
});

test("con extracto mejora el grado y baja la tasa", () => {
  const r = decidir({ ...SOL, extracto: { banco: "Caja de Ahorros", saldo_promedio_usd: 208,
                                          meses_cubiertos: 6, confianza: 0.9 } }, {}, HOY);
  assert.equal(r.grado, "A");
  assert.equal(r.tasa_anual_pct, 10.60);
});

test("documento ilegible va a revision, no a rechazo", () => {
  const r = decidir({ ...SOL, cedula: { ...SOL.cedula, confianza: 0.3 } }, {}, HOY);
  assert.equal(r.decision, "revision");
});

test("cedula vencida va a revision", () => {
  const r = decidir({ ...SOL, cedula: { ...SOL.cedula, fecha_expiracion: "2020-01-01" } }, {}, HOY);
  assert.equal(r.decision, "revision");
});

test("sin capacidad, rechaza y dice cuanto puede pagar", () => {
  const r = decidir({ ...SOL, ingresos: { ...SOL.ingresos, ingreso_mensual_usd: 260 },
                      personas_a_cargo: 3 }, {}, HOY);
  assert.equal(r.decision, "rechazada");
  assert.match(r.motivo, /B\/\./);
});

test("la mora en el bureau pesa, y se cita la norma", () => {
  const r = decidir(SOL, { bureau: { peor_mora_dias: 95 } }, HOY);
  assert.equal(r.decision, "rechazada");
  assert.match(r.motivo, /comportamiento de pago/);
});

test("la decision es reproducible", () => {
  const a = decidir(SOL, {}, HOY);
  const b = decidir(SOL, {}, HOY);
  assert.deepEqual({ ...a, ts: null }, { ...b, ts: null });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/motor.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Escribir `motor.ts`**

```ts
// El motor de credito. Determinista, auditable, sin modelo de lenguaje.
//
// Dos entradas al mismo codigo:
//   preCalificar(sol)  corre en el telefono, sin senal, con lo que la persona
//                      carga encima. Devuelve un ESTIMADO y lo dice.
//   decidir(sol, ctx)  corre en el nodo del banco y anade lo que la persona no
//                      carga: bureau y costo de fondos. Esa es la que vale.
//
// El corte no es comercial, es de propiedad del dato.

import { POLITICA, type Politica } from "./politica.ts";
import { capacidadDePago, type Capacidad } from "./capacidad.ts";
import { variablesDe, evaluar, edadEn, type EntradaScorecard } from "./scorecard.ts";
import { estructurar } from "./estructura.ts";
import { factoresDe, type Factor } from "./explicacion.ts";
import { MODELO, type Modelo } from "./modelo.ts";
import type { Componentes } from "./precio.ts";

export type Solicitud = EntradaScorecard & {
  id?: string;
  cedula: { fecha_nacimiento: string; fecha_expiracion?: string; confianza?: number };
  ingresos: EntradaScorecard["ingresos"] & { confianza?: number };
  personas_a_cargo?: number;
};

export type Contexto = {
  /** Lo que el telefono no puede saber. En la demo lo simula el nodo. */
  bureau?: { peor_mora_dias: number };
};

export type PreCalificacion = {
  estimado: true;
  viable: boolean;
  monto: number;
  meses: number;
  tasa_anual_pct: number;
  cuota: number;
  capacidad: Capacidad;
  motivo: string;
};

export type Respuesta = {
  solicitud_id: string | undefined;
  decision: "aprobada" | "rechazada" | "revision";
  monto_aprobado_usd?: number;
  plazo_meses?: number;
  tasa_anual_pct?: number;
  cuota_mensual_usd?: number;
  grado?: "A" | "B" | "C" | "D" | "E";
  pd_pct?: number;
  tasa_componentes?: Componentes;
  factores: Factor[];
  politica_version: string;
  motivo: string;
  ts: string;
};

/** Reglas duras. Devuelve el motivo si algo la frena, o null si pasa. */
function elegibilidad(
  sol: Solicitud, hoy: Date, pol: Politica,
): { decision: "revision" | "rechazada"; motivo: string } | null {
  const v = pol.valores;
  const conf = Math.min(sol.cedula.confianza ?? 1, sol.ingresos.confianza ?? 1);
  if (conf < v.confianza_min) {
    return { decision: "revision", motivo: "documentos poco legibles; un agente los revisara" };
  }
  if (sol.cedula.fecha_expiracion && new Date(sol.cedula.fecha_expiracion) < hoy) {
    return { decision: "revision", motivo: "la cedula esta vencida; hay que renovarla o presentar otra" };
  }
  const edad = edadEn(sol.cedula.fecha_nacimiento, hoy);
  if (edad < v.edad_min || edad > v.edad_max) {
    return { decision: "rechazada", motivo: `la politica cubre de ${v.edad_min} a ${v.edad_max} anos` };
  }
  if (sol.monto_solicitado_usd < v.monto_min || sol.monto_solicitado_usd > v.monto_max) {
    return { decision: "rechazada", motivo: `el monto va de B/. ${v.monto_min} a B/. ${v.monto_max}` };
  }
  return null;
}

function nucleo(sol: Solicitud, hoy: Date, pol: Politica, modelo: Modelo, castigoPd: number) {
  const cap = capacidadDePago({
    ingreso_mensual_usd: sol.ingresos.ingreso_mensual_usd,
    tipo: sol.ingresos.tipo,
    deudas_mensuales_usd: sol.deudas_mensuales_usd ?? 0,
    personas_a_cargo: sol.personas_a_cargo ?? 0,
  }, pol);
  const vars = variablesDe(sol, hoy);
  const punt = evaluar(vars, modelo);
  const pd = Math.min(1, punt.pd + castigoPd);
  const est = estructurar(pd, sol.monto_solicitado_usd, cap, pol);
  return { cap, vars, punt, pd, est };
}

export function preCalificar(
  sol: Solicitud, hoy: Date = new Date(),
  pol: Politica = POLITICA, modelo: Modelo = MODELO,
): PreCalificacion {
  const freno = elegibilidad(sol, hoy, pol);
  const { cap, est } = nucleo(sol, hoy, pol, modelo, 0);
  if (freno || !est) {
    return {
      estimado: true, viable: false, monto: 0, meses: 0, tasa_anual_pct: 0, cuota: 0, capacidad: cap,
      motivo: freno
        ? freno.motivo
        : `con tus ingresos la cuota maxima es B/. ${cap.cuota_max.toFixed(2)} al mes`,
    };
  }
  return {
    estimado: true, viable: true, monto: est.monto, meses: est.meses,
    tasa_anual_pct: est.tasa_anual_pct, cuota: est.cuota, capacidad: cap,
    motivo: "estimado con tus documentos; el banco lo confirma cuando llegue la solicitud",
  };
}

export function decidir(
  sol: Solicitud, ctx: Contexto = {}, hoy: Date = new Date(),
  pol: Politica = POLITICA, modelo: Modelo = MODELO,
): Respuesta {
  const base = {
    solicitud_id: sol.id,
    factores: [] as Factor[],
    politica_version: pol.version,
    ts: hoy.toISOString(),
  };

  const freno = elegibilidad(sol, hoy, pol);
  if (freno) return { ...base, decision: freno.decision, motivo: freno.motivo };

  // Acuerdo 4-2013, articulo 21: hay presuncion de deterioro de la capacidad de
  // pago cuando empeora el comportamiento de pago de la persona en el mercado
  // financiero. Mas de 60 dias es mencion especial o peor (articulo 18).
  const mora = ctx.bureau?.peor_mora_dias ?? 0;
  if (mora > 60) {
    return {
      ...base, decision: "rechazada",
      motivo: `el comportamiento de pago en el sistema financiero muestra ${mora} dias de atraso`,
    };
  }
  const castigo = mora > 30 ? 0.05 : 0;

  const { cap, vars, punt, pd, est } = nucleo(sol, hoy, pol, modelo, castigo);
  const factores = factoresDe(punt, vars, sol, modelo);

  if (!est) {
    return {
      ...base, decision: "rechazada", factores,
      motivo: `con tus ingresos la cuota maxima es B/. ${cap.cuota_max.toFixed(2)} al mes, ` +
              `y el monto minimo de B/. ${pol.valores.monto_min} no cabe`,
    };
  }

  return {
    ...base,
    decision: "aprobada",
    monto_aprobado_usd: est.monto,
    plazo_meses: est.meses,
    tasa_anual_pct: est.tasa_anual_pct,
    cuota_mensual_usd: est.cuota,
    grado: punt.grado,
    pd_pct: Math.round(pd * 1000) / 10,
    tasa_componentes: est.componentes,
    factores,
    motivo: est.recortado
      ? `monto ajustado a tu capacidad de pago: la cuota maxima es B/. ${cap.cuota_max.toFixed(2)}`
      : "aprobado por capacidad de pago",
  };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/motor.test.mjs`
Expected: `# pass 8`, `# fail 0`.

- [ ] **Step 5: Punto de commit**

`feat: el motor de credito, con precalificacion y decision`. **No commitear.**

---

### Task 10: El nodo pasa a ser una cáscara

**Files:**
- Modify: `nodo/credito.mjs`

- [ ] **Step 1: Reemplazar el contenido entero de `nodo/credito.mjs`**

```js
// El banco decide. Este archivo ya no tiene politica: la politica vive en
// mobile/src/core/credito/, y el nodo la importa tal cual.
//
// Node 22 lee TypeScript sin build, asi que no hay copia ni paso de compilacion:
// el nodo corre EXACTAMENTE el mismo codigo que el telefono usa para
// precalificar. Si hubiera dos copias, la del banco y la del telefono podrian
// dar numeros distintos y nadie se enteraria hasta la demo.
//
// El modelo esta entrenado sobre cartera sintetica y no representa la politica
// de ningun banco real. Se declara en pantalla y en el README.

import { decidir as decidirConMotor } from "../mobile/src/core/credito/motor.ts";

/**
 * Contexto que solo el banco tiene. En un banco de verdad esto sale de APC
 * Intelidat (Ley 24 de 2002) y de la tesoreria. Aqui se simula, y se dice.
 */
function contextoDelBanco(sol) {
  // Sin consulta real de bureau: la demo no tiene red garantizada y no vamos a
  // inventar un historial que no existe. Cero dias de mora es el supuesto
  // declarado, no un dato.
  return { bureau: { peor_mora_dias: 0 } };
}

export function decidir(sol) {
  return decidirConMotor(sol, contextoDelBanco(sol), new Date());
}
```

- [ ] **Step 2: Verificar que el nodo arranca y decide**

Run:
```bash
cd nodo && node -e '
import("./credito.mjs").then(({decidir}) => {
  console.log(JSON.stringify(decidir({
    id: "0b7f1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
    monto_solicitado_usd: 920,
    cedula: { numero: "8-123-4567", nombre: "Ana Perez", fecha_nacimiento: "1990-05-04", confianza: 0.9 },
    ingresos: { empleador_o_actividad: "Finca", ingreso_mensual_usd: 520, tipo: "asalariado", antiguedad_meses: 36, confianza: 0.9 },
    deudas_mensuales_usd: 40, personas_a_cargo: 0,
  }), null, 2));
});'
```
Expected: `"decision": "aprobada"`, `"monto_aprobado_usd": 920`, `"plazo_meses": 12`, `"tasa_anual_pct": 17.40`, `"grado": "C"`, y `factores` con tres entradas.

- [ ] **Step 3: Verificar el nodo entero**

Run: `cd nodo && npm run banco`
Expected: arranca sin error de import, imprime `HTTP en :8787` y `rol=banco`. Cortar con Ctrl-C.

- [ ] **Step 4: Punto de commit**

`refactor: el nodo importa el motor en vez de tener su propia politica`. **No commitear.**

---

### Task 11: Cartera y provisiones del Acuerdo 4-2013

**Files:**
- Create: `nodo/cartera.mjs`
- Create: `eval/credito/cartera.test.mjs`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `eval/credito/cartera.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { clasificar, provision, simular } from "../../nodo/cartera.mjs";

test("clasifica consumo por dias de mora, Acuerdo 4-2013 articulo 18", () => {
  assert.equal(clasificar(0), "normal");
  assert.equal(clasificar(60), "normal");
  assert.equal(clasificar(61), "mencion_especial");
  assert.equal(clasificar(90), "mencion_especial");
  assert.equal(clasificar(91), "subnormal");
  assert.equal(clasificar(120), "subnormal");
  assert.equal(clasificar(121), "dudoso");
  assert.equal(clasificar(180), "dudoso");
  assert.equal(clasificar(181), "irrecuperable");
});

test("provisiona segun el articulo 34", () => {
  assert.equal(provision(1000, "normal"), 0);
  assert.equal(provision(1000, "mencion_especial"), 200);
  assert.equal(provision(1000, "subnormal"), 500);
  assert.equal(provision(1000, "dudoso"), 800);
  assert.equal(provision(1000, "irrecuperable"), 1000);
});

test("la garantia baja la base de computo y nunca la vuelve negativa", () => {
  assert.equal(provision(1000, "irrecuperable", 400), 600);
  assert.equal(provision(1000, "irrecuperable", 5000), 0);
});

test("la simulacion es reproducible y devuelve perdida y provision", () => {
  const creditos = [{ monto: 920, pd: 0.123 }, { monto: 170, pd: 0.123 }];
  const a = simular(creditos, 12345);
  const b = simular(creditos, 12345);
  assert.deepEqual(a, b);
  assert.ok(a.perdida_esperada >= 0);
  assert.ok(a.provision >= 0);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `node --test eval/credito/cartera.test.mjs`
Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Escribir `nodo/cartera.mjs`**

```js
// La vista del banco sobre lo que presto: clasificacion y provisiones.
//
// Acuerdo No. 004-2013 de la Superintendencia de Bancos de Panama, que rige la
// gestion del riesgo de credito. Dos articulos:
//
//   Articulo 18, paragrafo 2: los dias de atraso clasifican la cartera. Para
//   prestamos de consumo sin garantia inmueble: normal 0 a 60, mencion especial
//   61 a 90, subnormal 91 a 120, dudoso 121 a 180, irrecuperable mas de 180.
//
//   Articulo 34: la provision especifica es la ponderacion de cada categoria
//   por la base de computo, que es el saldo menos el valor presente de la
//   garantia. Sin garantia, la base es el saldo entero.
//
// Esto no lo consume la app: es la mitad del modelo que mira el banco, y existe
// para poder mostrar que el precio cubre la perdida.

/** Articulo 18, paragrafo 2, columna de consumo. */
export function clasificar(diasMora) {
  if (diasMora <= 60) return "normal";
  if (diasMora <= 90) return "mencion_especial";
  if (diasMora <= 120) return "subnormal";
  if (diasMora <= 180) return "dudoso";
  return "irrecuperable";
}

/** Articulo 34, tabla de ponderaciones. */
export const PONDERACION = {
  normal: 0,
  mencion_especial: 0.20,
  subnormal: 0.50,
  dudoso: 0.80,
  irrecuperable: 1.00,
};

export function provision(saldo, categoria, valorPresenteGarantia = 0) {
  const base = Math.max(0, saldo - valorPresenteGarantia);
  return Math.round(base * PONDERACION[categoria] * 100) / 100;
}

/**
 * Simula 12 meses de comportamiento de la cartera con la misma PD que uso el
 * precio, y compara la perdida realizada contra lo que se cobro por riesgo.
 * Si el precio no cubre la perdida, el modelo no cierra.
 */
export function simular(creditos, semilla = 20260910) {
  let seed = semilla;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const filas = [];
  let perdida = 0, provisionTotal = 0, expuesto = 0;
  for (const c of creditos) {
    const incumple = rnd() < c.pd;
    // Quien incumple lo hace en un mes al azar del ano; el saldo restante es la
    // exposicion. Simplificacion declarada: amortizacion lineal.
    const mes = incumple ? 1 + Math.floor(rnd() * 12) : 0;
    const saldo = incumple ? Math.round(c.monto * (1 - mes / 12) * 100) / 100 : 0;
    const dias = incumple ? 30 * (12 - mes) + 30 : 0;
    const categoria = incumple ? clasificar(dias) : "normal";
    const prov = incumple ? provision(saldo, categoria) : 0;
    // Perdida dado el incumplimiento del 75%, el mismo LGD que uso el precio.
    const perdidaCredito = incumple ? Math.round(saldo * 0.75 * 100) / 100 : 0;
    expuesto += c.monto;
    perdida += perdidaCredito;
    provisionTotal += prov;
    filas.push({ monto: c.monto, pd: c.pd, incumple, dias, categoria, saldo, provision: prov });
  }
  return {
    filas,
    expuesto: Math.round(expuesto * 100) / 100,
    perdida_esperada: Math.round(perdida * 100) / 100,
    provision: Math.round(provisionTotal * 100) / 100,
    perdida_pct: expuesto ? Math.round((perdida / expuesto) * 10000) / 100 : 0,
  };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `node --test eval/credito/cartera.test.mjs`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Punto de commit**

`feat: clasificacion y provisiones del Acuerdo 4-2013`. **No commitear.**

---

### Task 12: Sección 5 del eval

**Files:**
- Modify: `eval/run.mjs`

- [ ] **Step 1: Añadir el flag de compilación y el import**

En la llamada a `tsc` de `eval/run.mjs`, añadir el flag y el archivo nuevo:

```js
execFileSync(resolve(RAIZ, "mobile/node_modules/.bin/tsc"), [
  "--outDir", TMP, "--target", "es2022", "--module", "esnext",
  "--moduleResolution", "bundler", "--skipLibCheck",
  "--rewriteRelativeImportExtensions",
  resolve(RAIZ, "mobile/src/core/reglas.ts"),
  resolve(RAIZ, "mobile/src/core/marcadores.ts"),
  resolve(RAIZ, "mobile/src/core/paquete.ts"),
  resolve(RAIZ, "mobile/src/core/credito/motor.ts"),
], { stdio: "pipe" });
```

`--rewriteRelativeImportExtensions` reescribe `./precio.ts` a `./precio.js` al emitir. Sin ese flag el temporal queda con imports a `.ts` que ya no existen ahí. Requiere TypeScript 5.7 o superior; el repo trae 5.9.3.

Y junto a los otros imports dinámicos:

```js
const { decidir, preCalificar } = await import(resolve(TMP, "credito/motor.js"));
const { MODELO } = await import(resolve(TMP, "credito/modelo.js"));
const { simular } = await import(resolve(RAIZ, "nodo/cartera.mjs"));
```

- [ ] **Step 2: Añadir la sección 5, antes de la línea de cierre**

Insertar antes del bloque `// ---- cierre` (o antes de `process.exit`):

```js
// ---------------------------------------------------------------- 5) credito
di("## 5. Modelo de credito");
di();
di("El scorecard esta entrenado sobre **cartera sintetica** de " + MODELO.n +
   " solicitantes con semilla " + MODELO.semilla + ". No hay ni un dato real de ningun cliente.");
di();
di(`Holdout: AUC ${MODELO.metricas.auc}, KS ${MODELO.metricas.ks}, mora de la cartera ${(MODELO.metricas.mora_cartera * 100).toFixed(2)}%.`);
di();

// 5a) Los puntos de cada variable numerica tienen que ser monotonos.
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

// 5b) La edad no puede estar puntuando.
const puntuaEdad = MODELO.variables.includes("edad");
if (puntuaEdad) fallos++;
di(`La edad no puntua: ${puntuaEdad ? "**FALLA**" : "OK"}. Solo define elegibilidad.`);
di();

// 5c) Los montos que la app puede pedir, contra un ingreso de B/. 520.
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

// 5d) Invariantes que no se pueden romper nunca.
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

// 5e) El precio tiene que cubrir la perdida.
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
```

- [ ] **Step 3: Correr el eval entero**

Run: `node eval/run.mjs`
Expected: sale con código 0, y `eval/resultados.md` trae la sección 5 con la tabla de monotonía en OK, los seis montos aprobados y el precio cubriendo la pérdida.

Si el precio no cubre la pérdida, **no maquillar el resultado**: es un hallazgo, y la respuesta correcta es subir `opex_solicitud` o el margen en `politica.ts` y decir en el ADR por qué.

- [ ] **Step 4: Punto de commit**

`test: el eval verifica el modelo de credito`. **No commitear.**

---

### Task 13: La pantalla que faltaba

Es la pantalla 12 del mapa de diseño: "Cuánto y a qué plazo, con la cuota estimada visible antes de pedir".

**Files:**
- Create: `mobile/src/PantallaCuota.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Crear `mobile/src/PantallaCuota.tsx`**

```tsx
/**
 * La cuota, antes de firmar. Es la pantalla 12 del mapa de diseno.
 *
 * Corre `preCalificar()` en el telefono, sin senal: todo lo que necesita salio
 * de los documentos que ya se leyeron aqui dentro. Por eso puede poner un
 * numero al frente aunque no haya red.
 *
 * Dice ESTIMADO y lo dice dos veces. El banco decide cuando la solicitud
 * llegue, y puede decidir distinto: el banco ve el historial de credito, que
 * este telefono no tiene forma de consultar.
 */
import { SafeAreaView, ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { preCalificar } from "./core/credito/motor";

export default function PantallaCuota({
  solicitud, onFirmar, onVolver,
}: {
  solicitud: Parameters<typeof preCalificar>[0];
  onFirmar: () => void;
  onVolver: () => void;
}) {
  const pre = preCalificar(solicitud);

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Pressable onPress={onVolver} accessibilityRole="button" style={s.volver}>
          <Text style={s.volverTexto}>Volver</Text>
        </Pressable>

        <Text style={s.titulo}>Tu cuota</Text>

        {pre.viable ? (
          <>
            <Text style={s.cifra}>B/. {pre.cuota.toFixed(2)}</Text>
            <Text style={s.parrafo}>al mes, durante {pre.meses} meses</Text>

            <View style={s.filas}>
              <Fila etiqueta="Monto" valor={`B/. ${pre.monto}`} />
              <Fila etiqueta="Plazo" valor={`${pre.meses} meses`} />
              <Fila etiqueta="Tasa anual" valor={`${pre.tasa_anual_pct}%`} />
              <Fila etiqueta="Puedes pagar hasta" valor={`B/. ${pre.capacidad.cuota_max.toFixed(2)} al mes`} />
            </View>
          </>
        ) : (
          <>
            <Text style={s.parrafo}>{pre.motivo}</Text>
            <View style={s.filas}>
              <Fila etiqueta="Puedes pagar hasta" valor={`B/. ${pre.capacidad.cuota_max.toFixed(2)} al mes`} />
            </View>
          </>
        )}

        <View style={s.aviso}>
          <Text style={s.avisoTitulo}>Esto es un estimado</Text>
          <Text style={s.avisoTexto}>
            Lo calculo este telefono con tus documentos. El banco decide cuando reciba la
            solicitud, y puede decidir distinto: el ve tu historial de credito y aqui no
            hay forma de consultarlo.
          </Text>
        </View>

        <Pressable
          onPress={onFirmar}
          accessibilityRole="button"
          accessibilityLabel="Firmar y enviar la solicitud"
          style={({ pressed }) => [s.boton, pressed && s.botonPress]}
        >
          <Text style={s.botonTexto}>Firmar y enviar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <View style={s.fila}>
    <Text style={s.filaEtiqueta}>{etiqueta}</Text>
    <Text style={s.filaValor}>{valor}</Text>
  </View>
);

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F4F6F4" },
  cuerpo: { padding: 20, paddingTop: 40, paddingBottom: 48 },
  volver: { marginBottom: 20 },
  volverTexto: { fontSize: 14, color: "#0E6E6C", fontWeight: "600" },
  titulo: { fontSize: 24, fontWeight: "700", color: "#0F1512" },
  cifra: { fontSize: 44, fontWeight: "700", color: "#0F1512", marginTop: 12 },
  parrafo: { fontSize: 15, lineHeight: 22, color: "#4E5A55", marginTop: 6 },
  filas: { marginTop: 24, gap: 10 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filaEtiqueta: { fontSize: 13.5, color: "#818C87" },
  filaValor: { fontSize: 15, fontWeight: "600", color: "#0F1512" },
  aviso: {
    backgroundColor: "#DCEBEA", borderWidth: 1, borderColor: "#0E6E6C",
    borderRadius: 4, padding: 16, marginTop: 26,
  },
  avisoTitulo: { fontSize: 14, fontWeight: "700", color: "#0E6E6C", marginBottom: 6 },
  avisoTexto: { fontSize: 13.5, lineHeight: 20, color: "#2F4746" },
  boton: {
    backgroundColor: "#0E6E6C", borderRadius: 3,
    paddingVertical: 15, alignItems: "center", marginTop: 26,
  },
  botonPress: { backgroundColor: "#0B5654" },
  botonTexto: { fontSize: 15, fontWeight: "600", color: "#F4F6F4" },
});
```

Nota: el import es `./core/credito/motor` **sin extensión**, que es como resuelve Metro el resto de `mobile/src/`. Dentro de `credito/` los imports entre sí sí llevan `.ts` porque los lee Node.

- [ ] **Step 2: Comprobar el supuesto de Metro**

Este es el único supuesto sin verificar del diseño. Al primer `npx expo run:android --device` después de este paso, si Metro falla al resolver `./precio.ts` desde `motor.ts`, el arreglo es colapsar `credito/` en un solo archivo sin imports internos y que el nodo importe ese. Diez minutos. No hay que rediseñar nada.

- [ ] **Step 3: Cablear la pantalla en `mobile/App.tsx`**

`PantallaCuota` va **después** de documentos, porque la cuota no existe hasta que se lee el ingreso. `PantallaCredito` se queda donde está: ahí se elige el monto, todavía sin cuota.

Añadir el import y un estado:

```tsx
import PantallaCuota from "./src/PantallaCuota";
```

```tsx
const [solicitud, setSolicitud] = useState<Parameters<typeof PantallaCuota>[0]["solicitud"] | null>(null);
```

y al final, reemplazar el `return <PantallaDocumentos ... />` por:

```tsx
  if (!solicitud) {
    return (
      <PantallaDocumentos
        monto={credito.monto}
        onListo={setSolicitud}
        onVolver={() => setCredito({ min: credito.min, max: credito.max })}
      />
    );
  }

  return (
    <PantallaCuota
      solicitud={solicitud}
      onFirmar={() => { /* Bloque 2: cola en SQLite y envio al nodo */ }}
      onVolver={() => setSolicitud(null)}
    />
  );
```

`PantallaDocumentos` tiene que llamar a `onListo` con la solicitud armada cuando termine de extraer los campos. Si ese punto todavía no existe, dejarlo cableado con los campos que sí se extraen y `deudas_mensuales_usd: 0`.

- [ ] **Step 4: Verificar en el teléfono**

Run: `cd mobile && npx expo run:android --device`
Expected: el flujo llega hasta "Tu cuota" y muestra una cifra. Anotar la captura para el video.

- [ ] **Step 5: Punto de commit**

`feat: la cuota estimada antes de firmar`. **No commitear.**

---

### Task 14: Declarar la decisión

**Files:**
- Create: `.ai/adr/ADR-011-el-modelo-de-credito.md`
- Modify: `README.md`
- Modify: `docs/CHECKLIST.md`

- [ ] **Step 1: Escribir el ADR**

Crear `.ai/adr/ADR-011-el-modelo-de-credito.md` siguiendo el formato de los ADR existentes (contexto, decisión, alternativas, consecuencias, se reabre si). Tiene que contener, con números reales de la corrida:

- Qué reemplaza: los cinco huecos del modelo viejo.
- El contraste: capacidad de B/. 156 (30% del bruto) contra B/. 138.84 medida de verdad.
- Lo que gana el extracto: grado C a grado A, 17.40% a 10.60%, B/. 35.28 menos en el año sobre el mismo crédito de 920. Es la promesa que la UI ya hacía.
- Que la edad quedó fuera del scorecard a propósito, y que medido no costó nada (AUC 0.723 contra 0.722).
- Que el scorecard está entrenado sobre cartera sintética, con AUC 0.723 y KS 0.379 en holdout.
- Que el opex hace que los montos chicos salgan bajo costo, y que la política es acotar y absorber.
- Las fuentes: Acuerdo 4-2013 (arts. 2, 18, 21, 34), Ley 81 de 2009, canasta del MEF de marzo 2026, tasas de la SBP.

- [ ] **Step 2: Actualizar el README**

En la sección de seguridad y límites, reemplazar "El modelo de crédito del nodo banco es de juguete" por la declaración honesta nueva:

```markdown
- El modelo de crédito es propio y determinista: mide capacidad de pago, puntúa
  con un scorecard y descompone la tasa en sus costos. El scorecard está
  **entrenado sobre cartera sintética** (`data/cartera-sintetica.mjs`), no sobre
  datos reales de clientes panameños, y no representa la política de ningún
  banco. La edad no puntúa. Ningún modelo de lenguaje participa en la decisión.
```

- [ ] **Step 3: Marcar el CHECKLIST**

En `docs/CHECKLIST.md`, Bloque 2 · Dominio, marcar como hechos los dos puntos `[J]`: el de revisar la política de crédito y el de decidir qué campos se piden, con una línea de qué se hizo, siguiendo el estilo de los otros puntos ya marcados.

- [ ] **Step 4: Barrido final**

Run:
```bash
grep -rnP '[\x{2014}\x{2013}\x{2018}\x{2019}\x{201C}\x{201D}\x{2026}\x{2192}]' \
  mobile/src/core/credito/ nodo/cartera.mjs nodo/credito.mjs \
  data/cartera-sintetica.mjs .ai/adr/ADR-011-el-modelo-de-credito.md
```
Expected: sin resultados. Cero puntuación de máquina.

- [ ] **Step 5: Verificación completa**

Run:
```bash
node --test eval/credito/*.test.mjs && node eval/run.mjs && echo "VERIFICACION COMPLETA"
```
Expected: todas las pruebas pasan, el eval sale con código 0, y se imprime `VERIFICACION COMPLETA`.

- [ ] **Step 6: Punto de commit**

`docs: ADR-011, el modelo de credito y sus fuentes`. **No commitear.**
