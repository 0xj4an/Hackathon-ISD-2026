# Modelo de análisis de crédito · diseño

**Fecha:** 2026-09-10
**Estado:** aprobado, pendiente de implementar
**Reemplaza:** el modelo de juguete de `nodo/credito.mjs`
**Punto del plan:** Bloque 2 · Dominio, los dos puntos `[J]` de `docs/CHECKLIST.md`

## Objetivo

Sustituir el modelo de crédito de juguete por un motor que reproduzca cómo un
banco decide de verdad: capacidad de pago medida, puntaje que estima
probabilidad de incumplimiento, tasa descompuesta en sus costos, plazo despejado
de la cuota, y la vista de cartera que exige la regulación panameña.

El motor sigue siendo determinista y auditable. La mejora no es "más IA", es
dejar de inventar los números.

## Problema que resuelve

`nodo/credito.mjs` tiene cinco huecos, todos verificables leyendo las 20 líneas
del archivo:

1. **La capacidad ignora las deudas vigentes.** `ing * 0.3` es un ratio
   front-end sobre ingreso bruto. Un banco mide back-end: todas las cuotas que
   ya paga la persona entran al cálculo.
2. **No hay piso de subsistencia.** El 30% de B/. 2,000 y el 30% de B/. 520 no
   son el mismo riesgo. Con ingresos bajos el porcentaje miente y lo que manda
   es el ingreso residual.
3. **La tasa no depende del riesgo.** 9.5% con extracto y 12.5% sin: 300 puntos
   base por adjuntar un documento. Además `PantallaCredito.tsx` ya le promete a
   la persona que el extracto baja la tasa, y hoy esa promesa la cumple un `if`.
4. **El plazo se escalona por monto**, cuando en banca sale de la cuota que cabe
   y del destino del dinero.
5. **El rechazo no es accionable.** "capacidad de pago insuficiente" no le dice a
   la persona qué tendría que cambiar.

Lo que ya está bien y se conserva: `confianza < 0.5` manda a `revision` y no a
rechazo. Eso es exactamente la cola de referral de un banco.

## Restricciones heredadas

| Origen | Restricción |
| --- | --- |
| `ADR-005` | Las reglas deciden, el modelo explica. El LLM no participa en la decisión de crédito. Un scorecard de puntos es aritmética, así que cumple. |
| `ADR-004` | Sin monorepo. El core vive en `mobile/src/core/` y ya no hay copia en la raíz: el commit `ca5ddb5` la borró por ser una trampa con mecha. Hogar único, cero copias. |
| `ADR-010` | El paquete es anual, el crédito se ofrece siempre que haya algo que atender, y 12 meses es el plazo natural. |
| `docs/design/Mapa.dc.html` | Pantalla 12 de 17: "Cuánto y a qué plazo, con la cuota estimada visible antes de pedir". El teléfono muestra la cuota. |
| Reto Tether Psy | Nombres honestos, limitaciones declaradas. Aplica igual al modelo de crédito. |

## Arquitectura

Motor único en `core/credito/`, TypeScript sin dependencias.

```text
mobile/src/core/credito/     el hogar unico, TypeScript sin dependencias
  politica.ts        parametros, cada uno con su fuente
  finanzas.ts        cuota() y redondeos
  capacidad.ts       ingreso neto - deudas - minimo vital
  modelo.ts          salida del entrenamiento, generado, versionado
  scorecard.ts       aplica bins WOE + puntos -> PD y grado
  precio.ts          tasa = fondeo + PD*LGD + opex + capital + margen
  estructura.ts      elige plazo y recorta monto
  explicacion.ts     los factores que movieron la decision
  motor.ts           preCalificar(sol) | decidir(sol, contexto)

data/cartera-sintetica.mjs   genera cartera + entrena -> credito/modelo.ts
nodo/credito.mjs             cascara: importa motor.ts y firma
nodo/cartera.mjs             Acuerdo 4-2013: clasifica y provisiona
```

**Cero copias.** El core vive solo en `mobile/src/core/`, y el nodo importa esos
`.ts` por ruta relativa. Verificado en Node v22.23.2: un `.mjs` que hace
`import { cuota } from "../mobile/src/core/credito/motor.ts"` corre sin flags ni
build, y funciona también cuando ese `.ts` importa otro `.ts`.

Tres requisitos de código que salen de ahí:

1. **Imports relativos con extensión `.ts` explícita.** Node lo exige. El resto
   de `mobile/src/core/` usa imports sin extensión, así que `credito/` es la
   excepción y va comentada en el propio código.
2. **Sintaxis borrable únicamente**: sin `enum`, sin `namespace`, sin
   propiedades de parámetro en constructores. Es lo que Node sabe borrar.
3. **Parámetros y modelo como `.ts`, no `.json`.** Node exige
   `with { type: "json" }` para importar JSON y el preset de Babel de React
   Native no lo procesa. Un módulo TS que exporta un objeto congelado funciona
   en los dos lados sin configurar nada.

`eval/run.mjs` compila con `tsc` a un temporal, y para que reescriba `./x.ts` a
`./x.js` al emitir necesita el flag `--rewriteRelativeImportExtensions`.
Verificado con la versión que trae el repo, TypeScript 5.9.3.

**Único supuesto sin verificar:** que Metro resuelva un import con extensión
`.ts` explícita. No se puede comprobar sin levantar el bundler en el teléfono.
Si falla, el arreglo cuesta diez minutos: `credito/` colapsa a un solo archivo
sin imports internos y el nodo importa ese.

### Dos entradas, una diferencia honesta

- `preCalificar(sol)` corre en el teléfono, sin señal, con lo que la persona
  carga encima. Devuelve un resultado rotulado **estimado, sujeto a
  verificación**. No compromete al banco.
- `decidir(sol, contexto)` corre en el nodo y añade lo que la persona no carga:
  historial de bureau, costo de fondos del día, estado de la cartera. Esa es la
  decisión con validez, y la que se firma.

El corte no es comercial, es de propiedad del dato: el teléfono calcula con lo
que es de la persona, el banco añade lo que es del banco.

## El modelo, etapa por etapa

### 1. Elegibilidad

Knock-outs, cada uno con su motivo. La distinción entre `revision` y `rechazada`
importa: un documento ilegible no es un mal cliente.

| Condición | Decisión |
| --- | --- |
| `min(confianza cedula, confianza ingresos) < 0.5` | `revision` |
| Cédula vencida (`fecha_expiracion < hoy`) | `revision` |
| Edad al vencimiento del crédito fuera de [18, 75] | `rechazada` |
| `monto_solicitado_usd` fuera de [25, 5000] | `rechazada` |

### 2. Capacidad de pago

```text
neto          = ingreso_mensual * (1 - deduccion_ley[tipo])
minimo_vital  = cbfa_per_capita * (1 + personas_a_cargo) * factor_no_alimentos
capacidad     = max(0, neto - deudas_mensuales - minimo_vital)
cuota_max     = min(capacidad, neto * tope_dti)
monto_max     = min(exposicion_x_ingreso * ingreso_mensual, tope_absoluto)
```

El 30% sobrevive como **techo**, no como la regla. Manda el que sea más
restrictivo entre el residual y el ratio.

Ejemplo con el caso de la demo (asalariado, B/. 520, una deuda de B/. 40, sin
dependientes):

```text
neto         520 * 0.89              = 462.80
minimo_vital 94.95 * 1 * 1.6         = 151.92
capacidad    462.80 - 40 - 151.92    = 270.88
cuota_max    min(270.88, 138.84)     = 138.84   <- manda el techo del 30%
monto_max    min(3 * 520, 5000)      = 1560
```

Con ingreso de B/. 300 el que manda es el residual y no el ratio, que es el
comportamiento correcto y el que el modelo actual no sabe dar.

### 3. Scorecard

`data/cartera-sintetica.mjs` genera 3,000 solicitantes con semilla fija a partir
de un proceso generador logístico explícito, muestrea la etiqueta de mora, y
sobre esa cartera:

1. bina cada variable y calcula WOE por bin,
2. mide Information Value y descarta las de IV < 0.02,
3. ajusta una regresión logística por descenso de gradiente,
4. convierte a puntos (PDO 20, base 600 a odds 50:1),
5. elige el cutoff mirando el swap set, no el estadístico.

Variables candidatas, todas derivables de los documentos que la app ya pide:

| Variable | Origen |
| --- | --- |
| `tipo` de ingreso | `IngresosSchema.tipo` |
| antigüedad de la actividad | `IngresosSchema.antiguedad_meses` (nuevo) |
| deuda mensual sobre ingreso | declarado (nuevo) |
| monto pedido sobre ingreso | `monto_solicitado_usd / ingreso` |
| meses cubiertos por el extracto | `ExtractoSchema.meses_cubiertos` |
| saldo promedio sobre ingreso | `ExtractoSchema.saldo_promedio_usd / ingreso` |
| edad | derivada de `CedulaSchema.fecha_nacimiento` |

Salida: PD y un grado de A a E. El grado alimenta el precio.

**Se declara en pantalla y en el README que el scorecard está entrenado sobre
cartera sintética**, no sobre datos panameños reales. Es la misma honestidad que
el proyecto ya aplica a los nombres de modelo.

### 4. Precio

```text
tasa = fondeo
     + PD * LGD                          prima de riesgo
     + opex_solicitud / (monto * anios)  costo de originar, anualizado
     + capital_pct * (retorno - fondeo)  cargo de capital
     + margen
     + prima_plazo * (meses - 12) / 12   si el plazo pasa de 12
```

Acotada entre `tasa_piso` y `tasa_techo`.

**Qué pasa con los montos chicos.** Un paquete de B/. 48 a 6 meses tiene 25%
anual solo de opex, por encima del techo. La política es **acotar y que el banco
absorba la diferencia**, no rechazar: el crédito pequeño se sostiene con el
grande dentro de la misma cartera. Es una decisión de producto, no un accidente
aritmético, así que `eval` reporta cuántos créditos salen por debajo de costo y
cuánto suma esa diferencia.

El término de opex es el que enseña la tesis del proyecto: a 12 meses, con B/.
920 pesa 0.65% anual y con B/. 72 pesa 8.3%. A 6 meses, que es el plazo real de
un paquete de 72, pesa 16.7%. Eso es por qué el microcrédito
real cuesta 20 a 40 por ciento, y por qué originar sin sucursal (OCR en el
dispositivo, sin oficial en moto) es lo que permite cobrar menos. El número lo
demuestra sin discurso.

### 5. Estructura

```text
plazo = el menor de {6, 12, 18, 24} tal que cuota(monto, tasa, plazo) <= cuota_max
        con preferencia por <= 12 (el paquete es anual, ADR-010)
si no cabe a 24: recortar monto en pasos de 10% hasta que quepa
si monto < 25:   rechazada
```

La tasa depende del monto y del plazo, y la PD también depende del monto
(`monto_sobre_ingreso` es variable del scorecard). No hace falta punto fijo: el
bucle recorre candidatos de monto en orden descendente y, dentro de cada uno,
plazos en orden ascendente, recalculando PD, tasa y cuota en cada candidato. El
primero que cabe gana, que además es el plazo más corto y por tanto el que menos
intereses paga.

### 6. Explicación

Toda respuesta lleva `factores`: los tres que más movieron el puntaje, con su
umbral y qué cambiaría. Más `politica_version` y el hash de `politica.ts`,
para que cualquier decisión sea reproducible después.

Formato de un factor:

```json
{
  "variable": "deuda_sobre_ingreso",
  "valor": 0.077,
  "puntos": -18,
  "que_cambiaria": "Bajar la cuota de tus otras deudas a B/. 25 sube tu puntaje 18 puntos"
}
```

## Parámetros y sus fuentes

Todos viven en `mobile/src/core/credito/politica.ts`. Uno solo por concepto, sin números
sueltos en el código. Los que no tienen cifra publicada que citar van marcados
`estimado: true`, siguiendo la convención que ya usa `core/paquete.ts`.

| Parámetro | Valor | Fuente |
| --- | --- | --- |
| `deduccion_ley.asalariado` | 0.11 | CSS 9.75% + seguro educativo 1.25% |
| `deduccion_ley.jubilado` | 0.00 | las pensiones no cotizan |
| `deduccion_ley.independiente` | 0.05 | estimado, provisión de impuesto |
| `cbfa_per_capita` | 94.95 | MEF, canasta básica familiar de alimentos, Resto Urbano, marzo 2026: B/. 341.81 para hogar de 3.6 miembros |
| `factor_no_alimentos` | 1.6 | estimado. El MEF publica la canasta de alimentos; el gasto no alimentario del hogar no tiene cifra mensual citable en la misma fuente |
| `tope_dti` | 0.30 | práctica de mercado (regla 28/36, Fannie Mae 36% manual) |
| `exposicion_x_ingreso` | 3 | Ley 81 de 2009, límite de tarjetas, adaptado a préstamo |
| `tope_absoluto` | 5000 | política del producto |
| `fondeo` | 0.045 | costo de depósitos en Panamá, 2025-2026 |
| `lgd` | 0.75 | sin garantía |
| `opex_solicitud` | 6 | estimado. Originación digital sin sucursal |
| `capital_pct` | 0.10 | ponderación de consumo |
| `retorno_exigido` | 0.15 | política |
| `margen` | 0.02 | política |
| `tasa_piso` | 0.095 | política. Queda apenas encima del promedio de préstamos personales en Panamá (8.92%, SBP octubre 2025) porque ese promedio es de créditos con descuento directo de planilla, y este no lo tiene |
| `tasa_techo` | 0.24 | política. Entre el promedio de tarjetas de crédito (22.02%, SBP octubre 2025) y el máximo observado en el mercado panameño (27.12%) |
| `prima_plazo` | 0.005 | estimado |

## Datos nuevos que hay que capturar

Tres campos, sin los cuales el modelo no es real:

| Campo | Dónde se captura | Por qué |
| --- | --- | --- |
| `deudas_mensuales_usd` | lo declara la persona, pantalla 11 | sin esto la capacidad es front-end y miente |
| `personas_a_cargo` | lo declara la persona, pantalla 11 | escala el mínimo vital |
| `antiguedad_meses` | de la carta laboral, vía OCR, dentro de `IngresosSchema` | variable predictiva después del ingreso |

Toca `SolicitudSchema`, que es el contrato entre teléfono y nodo. `ADR-004`
marca ese punto como riesgo de deriva: **se avisa antes de tocarlo**.

Cuando hay extracto, `deudas_mensuales_usd` se contrasta contra los débitos
recurrentes que el extracto revela y se toma el mayor de los dos. Conservador a
propósito.

## La capa de cartera

`nodo/cartera.mjs`, según Acuerdo 4-2013 de la Superintendencia de Bancos:

**Clasificación de consumo por días de mora** (art. 18, parágrafo 2):

| Categoría | Días |
| --- | --- |
| Normal | 0 a 60 |
| Mención especial | 61 a 90 |
| Subnormal | 91 a 120 |
| Dudoso | 121 a 180 |
| Irrecuperable | más de 180 |

**Provisiones específicas** (art. 34), sobre el saldo menos el valor presente de
la garantía, que sin garantía es el saldo entero: 20% mención especial, 50%
subnormal, 80% dudoso, 100% irrecuperable.

Sobre los créditos aprobados de la demo simula 12 meses de comportamiento con la
misma PD del scorecard y compara **la pérdida esperada realizada contra la prima
de riesgo cobrada**. Si el precio cubre la pérdida, el modelo cierra sobre sí
mismo. Ese cuadro es el argumento para el reto de Caja de Ahorros.

## Contrato de salida

`RespuestaBancoSchema` se amplía sin romper lo que ya valida:

```ts
grado: z.enum(["A", "B", "C", "D", "E"]).optional(),
pd_pct: z.number().optional(),
tasa_componentes: z.object({
  fondeo: z.number(), riesgo: z.number(), opex: z.number(),
  capital: z.number(), margen: z.number(),
}).optional(),
factores: z.array(FactorSchema).optional(),
politica_version: z.string().optional(),
```

## Cambios en la app

Mínimos, y en la dirección que el mapa ya define:

1. Pantalla nueva **"Tu cuota"** después de documentos: corre `preCalificar()` y
   muestra monto, plazo, cuota y tasa estimados, rotulados como estimados. Es la
   pantalla 12 del mapa, que hoy no existe.
2. `PantallaCredito` se queda donde está (elegir monto), sin cuota, porque
   todavía no hay ingreso leído.
3. Dos campos declarados en la pantalla de revisión de lo leído.

## Verificación

Sección 5 nueva en `eval/run.mjs`, determinista, sin teléfono, semilla fija:

- **Scorecard:** AUC y KS sobre holdout, y monotonía de cada banda WOE.
- **Política:** los montos que la app puede pedir salen con cuota dentro de
  capacidad, y los nueve casos de la demo producen una decisión válida.
- **Invariantes:** nunca cuota mayor que `cuota_max`; nunca monto mayor que
  `monto_max`; tasa siempre dentro de piso y techo; toda respuesta valida contra
  `RespuestaBancoSchema`; todo rechazo trae al menos un factor.
- **Cartera:** la pérdida simulada no supera la prima cobrada.

## Honestidad y límites

Se declara, en pantalla y en README:

- El scorecard está entrenado sobre **cartera sintética**. No hay datos reales
  de clientes panameños.
- El motor **modela** cómo decide un banco; no es la política de ningún banco.
- La decisión no la toma un modelo de lenguaje. El LLM solo lee documentos.
- Los parámetros marcados `estimado: true` no tienen cifra publicada que citar.

## Fuera de alcance

- Consultar bureau real (APC). El contexto del nodo lo simula.
- Provisión dinámica del art. 37 (el componente alfa y beta). Solo específicas.
- Reject inference sobre los rechazados.
- Firma electrónica con validez legal.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Deriva de `SolicitudSchema` entre teléfono y nodo | avisar antes de tocarlo, y `eval` valida el contrato en cada corrida |
| El scorecard sintético no significa nada fuera de la demo | declarado en pantalla, en README y en el ADR |
| Complejidad que no cabe en el tiempo del hackathon | el motor cae en capas: si algo se cae, se cae la cartera primero, luego el scorecard, y el motor de capacidad sigue en pie |
| `flujo.html` quedó desfasado de ADR-010 | regenerarla es tarea aparte, anotada |

## Fuentes

- Acuerdo 4-2013, Superintendencia de Bancos de Panamá (arts. 2, 13, 16, 18, 21, 23, 34, 35, 36)
- Ley 81 de 2009, límite de crédito de tarjetas
- MEF, Canasta Básica Familiar de Alimentos, marzo 2026
- SBP, Reportes Estadísticos de Tasas de Interés
- CSS y seguro educativo, deducciones de ley
