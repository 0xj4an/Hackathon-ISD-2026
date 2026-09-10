# Flujo, modos y alineación · plan de implementación

> **HISTÓRICO (plan ejecutado).** No es ops. Verdad viva: código +
> [`docs/ESTADO.md`](../../ESTADO.md), [`ADR-006`](../../../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md),
> spec en `../specs/2026-09-10-flujo-modos-alineacion-design.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear app, vocabulario y docs al tronco real (historial siempre → resultado → crédito y/o examen; crédito también tras lab) y a los tres modos `local-wifi` / `local-offline` / `nodo-offline`, sin prometer P2P ni QVAC `delegate`.

**Architecture:** Renombrar el interruptor de demo de `escenario A/B/C` a `modo` con ids explícitos; quitar la vía paralela historial|examen de Entrada; añadir `armarPaqueteDesdeLab` y cablear crédito desde `PantallaExamen`; actualizar `envio` para hablar de banco/pueblo; sincronizar BRIEF/CHECKLIST/VIDEO/demo-vias/README.

**Tech Stack:** Expo/React Native (`mobile/`), TypeScript core en `mobile/src/core/`, `node --test` en `eval/`, docs en `docs/`.

**Spec:** `docs/superpowers/specs/2026-09-10-flujo-modos-alineacion-design.md`

---

## Global Constraints

- **No hacer `git commit` ni `git push` sin que 0xj4an lo pida.** Los pasos de commit están marcados como opcionales / “pedir OK”.
- **Cero dependencias nuevas.**
- **No tocar Hyperswarm ni spikes/delegate-*.** Solo docs que digan que no son el camino de la demo.
- **No inventar NetInfo.** Los modos siguen siendo interruptor de demo.
- Fotos nunca en POST de crédito ni `/inferir`.

---

## File map

| File | Responsibility |
| --- | --- |
| `mobile/src/modo.ts` (renombrar desde `escenario.ts`) | Estado global del modo demo + helpers |
| `mobile/src/core/paquete.ts` | `armarPaqueteDesdeLab` + paquete `LAB_SEGUIMIENTO` |
| `mobile/src/envio.ts` | Envío banco/pueblo según modo; tipos sin “camino A/B” en UI |
| `mobile/src/PantallaEntrada.tsx` | Solo modo + caso; sin Historial\|Examen |
| `mobile/App.tsx` | Sin `viaSalud` / `pendienteExamen`; crédito desde Examen |
| `mobile/src/PantallaExamen.tsx` | Botón crédito si hay hallazgos + paquete |
| `mobile/src/PantallaAlerta.tsx` | Copy de franja vía `fichaModo` (rename) |
| `eval/credito/paquete-lab.test.mjs` | Tests de `armarPaqueteDesdeLab` |
| `eval/credito/envio.test.mjs` | Actualizar aserciones de vocabulario |
| `docs/BRIEF.md`, `CHECKLIST.md`, `VIDEO.md`, `PRUEBA-*.md`, `demo-vias.html`, `README.md` | Misma verdad |

Consumidores actuales de `escenario.ts` a actualizar en el rename: `App.tsx`, `PantallaEntrada.tsx`, `PantallaAlerta.tsx`, `PantallaExamen.tsx`, `envio.ts`, `medpsy.ts`, `leerExamen.ts`.

---

### Task 1: `armarPaqueteDesdeLab` (TDD)

**Files:**
- Modify: `mobile/src/core/paquete.ts`
- Create: `eval/credito/paquete-lab.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { clasificar, buscarMarcador } from "../../mobile/src/core/marcadores.ts";
import { armarPaqueteDesdeLab } from "../../mobile/src/core/paquete.ts";

function lec(codigo, valor, sexo = "hombre") {
  const m = buscarMarcador(codigo);
  assert.ok(m);
  return clasificar(m, valor, sexo);
}

test("lab en rango → null", () => {
  assert.equal(armarPaqueteDesdeLab([lec("GLU", 90)]), null);
});

test("glicemia 130 → paquete GLU_ALTA", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 130)]);
  assert.ok(p);
  assert.match(p.titulo, /azúcar|diabetes|glucosa/i);
  assert.ok(p.total_max >= p.total_min);
  assert.ok(p.total_max > 100);
});

test("glicemia 110 → paquete límite (GLU_LIMITE)", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 110)]);
  assert.ok(p);
  assert.ok(p.total_max < 400); // más corto que diabetes completa
});

test("glicemia 50 → GLU_BAJA o MUY_BAJA", () => {
  const p = armarPaqueteDesdeLab([lec("GLU", 50)]);
  assert.ok(p);
});

test("TSH alto sin glucosa → LAB_SEGUIMIENTO", () => {
  const p = armarPaqueteDesdeLab([lec("TSH", 8)]);
  assert.ok(p);
  assert.match(p.titulo, /seguimiento|laboratorio|revisión/i);
});

test("varios hallazgos: gana prioridad (GLU_ALTA sobre seguimiento)", () => {
  const p = armarPaqueteDesdeLab([lec("TSH", 8), lec("GLU", 140)]);
  assert.ok(p);
  assert.match(p.titulo, /azúcar|diabetes|glucosa/i);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test eval/credito/paquete-lab.test.mjs`  
Expected: FAIL (`armarPaqueteDesdeLab` is not a function / not exported)

- [ ] **Step 3: Implement**

In `mobile/src/core/paquete.ts`, add after `PAQUETES` / before `armarPaquete`:

```ts
const LAB_SEGUIMIENTO = {
  titulo: "Seguimiento de laboratorio",
  meses: 0,
  nota: "Hay valores fuera de rango. Esto estima consulta y control; no es un diagnóstico.",
  lineas: [
    CONSULTA,
    { concepto: "Control de laboratorio", min: 15, max: 40, fuente: RANGOS_PA + ". " + AVISO_MINSA },
  ],
};

// inside PAQUETES object, add:
// LAB_SEGUIMIENTO,
```

Actually add `LAB_SEGUIMIENTO` as a key in `PAQUETES` (copy the object above into the map).

Then:

```ts
import type { LecturaLab } from "./marcadores";
import { buscarMarcador } from "./marcadores";

/** Código de paquete a partir de lecturas de lab fuera de rango. */
function codigoDesdeLab(lecturas: LecturaLab[]): string | null {
  const fuera = lecturas.filter(l => l.hallazgo !== "dentro de rango");
  if (fuera.length === 0) return null;

  const codigos = new Set<string>();
  for (const l of fuera) {
    const m = buscarMarcador(l.marcador);
    if (!m) {
      codigos.add("LAB_SEGUIMIENTO");
      continue;
    }
    if (m.codigo === "GLU") {
      if (l.valor >= 126) codigos.add("GLU_ALTA");
      else if (l.valor >= 100) codigos.add("GLU_LIMITE");
      else if (l.valor < 54) codigos.add("GLU_MUY_BAJA");
      else if (l.valor < 70) codigos.add("GLU_BAJA");
      else codigos.add("LAB_SEGUIMIENTO");
    } else {
      codigos.add("LAB_SEGUIMIENTO");
    }
  }

  const PRIORIDAD_LAB = [
    "GLU_MUY_BAJA", "GLU_ALTA", "GLU_BAJA", "GLU_LIMITE", "LAB_SEGUIMIENTO",
  ];
  return PRIORIDAD_LAB.find(c => codigos.has(c)) ?? "LAB_SEGUIMIENTO";
}

export function armarPaqueteDesdeLab(lecturas: LecturaLab[]): Paquete | null {
  const codigo = codigoDesdeLab(lecturas);
  if (!codigo) return null;
  const base = PAQUETES[codigo];
  if (!base) return null;
  const total_min = Math.round(base.lineas.reduce((a, l) => a + l.min, 0));
  const total_max = Math.round(base.lineas.reduce((a, l) => a + l.max, 0));
  return { ...base, total_min, total_max };
}
```

Ensure `PAQUETES` is typed to allow `LAB_SEGUIMIENTO` and that `GLU_*` keys already exist (they do).

Export from `mobile/src/core/index.ts` if other modules re-export `paquete` (already `export * from "./paquete"`).

- [ ] **Step 4: Run tests — expect PASS**

Run: `node --test eval/credito/paquete-lab.test.mjs`  
Expected: all PASS

- [ ] **Step 5: Commit (solo si 0xj4an lo pide)**

```bash
git add mobile/src/core/paquete.ts eval/credito/paquete-lab.test.mjs
# git commit -m "feat: paquete de crédito desde lecturas de laboratorio"
```

---

### Task 2: Renombrar `escenario` → `modo`

**Files:**
- Create: `mobile/src/modo.ts` (contenido migrado)
- Delete: `mobile/src/escenario.ts` (tras actualizar imports)
- Modify: all consumers listed in File map

- [ ] **Step 1: Write `modo.ts`**

```ts
/**
 * Demo: capacidad × red. Independiente del tronco de producto
 * (historial → resultado → crédito/examen).
 *
 *   local-wifi     MedPsy aquí + envío al banco
 *   local-offline  MedPsy aquí + pueblo/pendiente
 *   nodo-offline   texto a /inferir + pueblo/pendiente
 */
import { USUARIOS, type Usuario } from "./usuarios";
import { COLOR } from "./ui/tokens";

export type ModoId = "local-wifi" | "local-offline" | "nodo-offline";

export const MODOS: {
  id: ModoId;
  titulo: string;
  detalle: string;
  franja: string;
  color: string;
}[] = [
  {
    id: "local-wifi",
    titulo: "Modelo aquí · hay wifi",
    detalle: "MedPsy en este teléfono. El crédito sale directo al banco.",
    franja: "Modelo aquí y wifi. El banco está al alcance.",
    color: COLOR.rutinaria,
  },
  {
    id: "local-offline",
    titulo: "Modelo aquí · sin wifi",
    detalle: "MedPsy en este teléfono. Sin internet: pueblo o pendiente.",
    franja: "Modelo aquí, sin wifi. El JSON no va a Railway.",
    color: COLOR.prioritaria,
  },
  {
    id: "nodo-offline",
    titulo: "Modelo en el nodo · sin wifi",
    detalle: "Este teléfono no corre MedPsy. Texto al pueblo si hay LAN.",
    franja: "Sin modelo en el aparato. Pide el texto al pueblo.",
    color: COLOR.inmediata,
  },
];

const CASO = "diabetes";
let activo: ModoId = "local-wifi";

export function modo(): ModoId {
  return activo;
}

export function fijarModo(id: ModoId) {
  activo = id;
}

export function resetModo() {
  activo = "local-wifi";
}

export function usuarioDelModo(): Usuario {
  return USUARIOS.find(u => u.id === CASO) ?? USUARIOS[0];
}

export function saltarMedPsyLocal(): boolean {
  return activo === "nodo-offline";
}

/** Offline hacia el banco remoto. */
export function sinWifiDemo(): boolean {
  return activo === "local-offline" || activo === "nodo-offline";
}

export function fichaModo(): (typeof MODOS)[number] {
  return MODOS.find(e => e.id === activo) ?? MODOS[0];
}
```

- [ ] **Step 2: Update imports**

Replace in each file:

| Old | New |
| --- | --- |
| `./escenario` or `./src/escenario` | `./modo` / `./src/modo` |
| `EscenarioId` | `ModoId` |
| `ESCENARIOS` | `MODOS` |
| `fijarEscenario` | `fijarModo` |
| `resetEscenario` | `resetModo` |
| `fichaEscenario` | `fichaModo` |
| `usuarioDelEscenario` | `usuarioDelModo` |
| `escenario()` | `modo()` |
| Remove `ViaSalud`, `VIAS_SALUD`, `viaSalud`, `fijarViaSalud` entirely |

- [ ] **Step 3: Delete `escenario.ts`**

- [ ] **Step 4: Typecheck / smoke**

Run: `cd mobile && npx tsc --noEmit` (si el proyecto lo soporta) o al menos que Metro no falle al importar.  
Also: `node --test eval/credito/envio.test.mjs eval/credito/paquete-lab.test.mjs`

- [ ] **Step 5: Commit (solo si lo piden)**

---

### Task 3: Entrada sin Historial|Examen

**Files:**
- Modify: `mobile/src/PantallaEntrada.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Simplify `PantallaEntrada` props**

```tsx
onEntrar: (u: Usuario, modo: ModoId) => void;
```

Remove `via` state, `VIAS_SALUD` UI block, and the copy “Historial y examen se eligen aparte…”.

Aviso nuevo:

```tsx
<Text style={s.avisoTexto}>
  El color es si el aparato corre el modelo y si hay wifi.
  El historial se lee siempre; el examen se ofrece después del resultado.
</Text>
```

Map `MODOS` instead of `ESCENARIOS`. On Entrar: `fijarModo(modoSel); onEntrar(usuario, modoSel);`

- [ ] **Step 2: Simplify `App.tsx` entry**

Remove `pendienteExamen` state and `fijarViaSalud`.

```tsx
onEntrar={(u, m) => {
  fijarModo(m);
  setUsuario(u);
}}
```

In `PantallaRevision` `onListo`: only `setRevisado(true)` — never auto-jump to examen.

Keep `onSubirExamen={() => setEnExamen(true)}` on Alerta (including Sano).

`salir` calls `resetModo()`.

- [ ] **Step 3: Manual check list (no device required for logic)**

- Entrada shows 3 modos, no Historial|Examen.
- Flow always reaches Resultado before any exam.

- [ ] **Step 4: Commit (solo si lo piden)**

---

### Task 4: Crédito desde `PantallaExamen`

**Files:**
- Modify: `mobile/src/PantallaExamen.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Extend props**

```tsx
export default function PantallaExamen({
  usuario, onVolver, onPedirCredito,
}: {
  usuario: Usuario;
  onVolver: () => void;
  onPedirCredito?: (costoMin: number, costoMax: number) => void;
}) {
```

- [ ] **Step 2: After lecturas, compute package**

```tsx
import { armarPaqueteDesdeLab, mensajeCredito } from "./core/paquete";

// inside lecturas branch:
const paquete = armarPaqueteDesdeLab(lecturas);
const fuera = lecturas.filter(l => l.hallazgo !== "dentro de rango");
```

UI after results list:

```tsx
{paquete && onPedirCredito ? (
  <>
    <Text style={s.credito}>{mensajeCredito(paquete)}</Text>
    <Boton
      texto="Pedir un crédito de salud"
      tono="prioritaria"
      onPress={() => onPedirCredito(paquete.total_min, paquete.total_max)}
    />
  </>
) : null}

<Boton texto="Leer otro examen" tono="borde" onPress={...} />
```

Use existing token styles; if `s.credito` missing, copy from `PantallaAlerta` credito style.

- [ ] **Step 3: Wire in `App.tsx`**

```tsx
if (enExamen) {
  return (
    <PantallaExamen
      usuario={usuario}
      onVolver={() => setEnExamen(false)}
      onPedirCredito={(min, max) => {
        setEnExamen(false);
        setCredito({ min, max });
      }}
    />
  );
}
```

Setting `credito` with `monto` undefined routes to `PantallaCredito` (existing branch).

- [ ] **Step 4: Commit (solo si lo piden)**

---

### Task 5: `envio.ts` vocabulario banco/pueblo

**Files:**
- Modify: `mobile/src/envio.ts`
- Modify: `eval/credito/envio.test.mjs`
- Modify: any UI that shows `camino: "A"|"B"` if exposed (check `PantallaCuota` — today only copy strings)

- [ ] **Step 1: Update types and comments**

```ts
/**
 * Transporte del crédito.
 * Modo local-wifi: intenta banco, luego pueblo.
 * Modos *-offline: solo pueblo / pendiente.
 * Inferencia (MedPsy /inferir) es otra tubería.
 */
export type Envio =
  | { ok: true; envio: "banco" | "pueblo"; respuesta: Respuesta }
  | { ok: false; envio: "pueblo"; pendiente: true; detalle: string }
  | { ok: false; envio: null; pendiente: false; detalle: string };
```

Replace returns `camino: "A"` → `envio: "banco"`, `camino: "B"` → `envio: "pueblo"`.

- [ ] **Step 2: Update `envio.test.mjs`**

```js
test("local-wifi intenta el banco antes que el pueblo", () => {
  const src = readFileSync(new URL("../../mobile/src/envio.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function enviarSolicitud"));
  const banco = fn.indexOf("urlBanco()");
  const pueblo = fn.indexOf("urlNodo()");
  assert.ok(banco >= 0 && pueblo > banco);
});

test("sinWifiDemo salta el banco", () => {
  const src = readFileSync(new URL("../../mobile/src/envio.ts", import.meta.url), "utf8");
  assert.match(src, /sinWifiDemo/);
  assert.match(src, /modo/); // import from modo
});
```

Rename first test from “camino A” to “banco remoto por https” (urlBanco unchanged).

- [ ] **Step 3: Grep for `camino` in mobile UI**

Run: `rg 'camino' mobile/src --glob '*.tsx'`  
Update user-facing strings to “banco” / “pueblo” if any remain.

- [ ] **Step 4: Run** `node --test eval/credito/envio.test.mjs`

- [ ] **Step 5: Commit (solo si lo piden)**

---

### Task 6: Docs y `demo-vias.html`

**Files:**
- Modify: `docs/BRIEF.md`, `docs/CHECKLIST.md`, `docs/VIDEO.md`
- Modify: `docs/PRUEBA-NODO.md`, `docs/PRUEBA-TELEFONO.md` (pending notes about sqlite if stale)
- Modify: `docs/demo-vias.html`
- Modify: `README.md`
- Close D11 in CHECKLIST: video no promete P2P

- [ ] **Step 1: BRIEF flujo**

Replace the “vía A / vía B” decision bullet with:

```markdown
2. **Resultado.** El historial siempre se lee (alerta o en orden). Desde ahí:
   pedir crédito si hay paquete, y/o subir un examen de laboratorio.
   Si el examen sale fuera de rango, también se puede pedir crédito.
3. **Documentos…**
4. **Examen…** (ya no “alternativa al crédito”, sino opción tras el resultado)
```

Transport: “envío al banco (wifi) o al pueblo (LAN)”, no “camino A/B”.

- [ ] **Step 2: CHECKLIST**

- Mark 1.3 / D11: no se recupera P2P; guion no lo promete `[x]`
- Fix any “vía B no pide crédito” language
- Note Entrada ya no elige historial|examen

- [ ] **Step 3: VIDEO.md**

Same vocabulary; keep the existing warning against saying “Hyperswarm P2P”.

- [ ] **Step 4: `demo-vias.html`**

Rename legend chips to modos (`local-wifi`, `local-offline`, `nodo-offline`).  
Flow: remove “¿qué se lee?” as parallel branch at the start; show examen as branch **after** alerta/sano.  
Keep three colored paths for the three modos.

- [ ] **Step 5: README**

One short paragraph under the product description with the two layers (tronco + modos).  
Explicit: demo no usa Hyperswarm ni QVAC `delegate`; respaldo de inferencia = HTTP `/inferir`.

- [ ] **Step 6: PRUEBA-NODO.md**

Fix stale line about SQLite unused if cola already uses it (CHECKLIST says it does). Align vocabulario banco/pueblo. Keep Hyperswarm section as “no es el camino”.

- [ ] **Step 7: Commit (solo si lo piden)**

---

### Task 7: Verificación final

- [ ] **Step 1: Domain tests**

```bash
node --test eval/credito/paquete-lab.test.mjs eval/credito/envio.test.mjs
node eval/run.mjs
```

Expected: exit 0

- [ ] **Step 2: Grep hygiene**

```bash
rg -n 'vía A|vía B|camino A|camino B|escenario A|ViaSalud|ESCENARIOS|fijarViaSalud' mobile/src docs/BRIEF.md docs/CHECKLIST.md docs/VIDEO.md README.md || true
```

Expected: no product-facing hits (internal ADR history OK in `.ai/`).

- [ ] **Step 3: Grep delegate/P2P promises**

```bash
rg -n 'delegate|Hyperswarm P2P' docs/VIDEO.md docs/BRIEF.md README.md
```

Expected: only negative / “no prometemos” mentions.

- [ ] **Step 4: Hand off**

List remaining iPhone items unchanged (OCR E2E, C8/C9 on device) — out of this plan’s scope per spec.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Vocabulario modo/resultado/envío | 2, 5, 6 |
| Historial siempre; sin vías en Entrada | 3 |
| Examen desde alerta y en_orden | 3 (keep buttons) |
| Crédito tras lab vía `armarPaqueteDesdeLab` | 1, 4 |
| Modos local-wifi / local-offline / nodo-offline | 2, 5 |
| No P2P / no delegate en demo | 6 |
| Docs alineados | 6 |
| Criterios aceptación 1–7 | 7 |

## Out of scope (do not implement here)

- NetInfo real
- Hyperswarm / QVAC `delegate` wiring
- ADR-006 Q4_0 auto modes
- iPhone OCR/envío verification
