# ADR-011: El modelo de crédito deja de ser de juguete

**Estado:** decidido
**Fecha:** 2026-09-10

## Contexto

`nodo/credito.mjs` eran veinte líneas declaradas como modelo de juguete. Cumplió
su papel: demostrar el flujo. Pero tenía cinco huecos, y todos se ven leyendo el
archivo:

1. **La capacidad ignoraba las deudas vigentes.** `ingreso * 0.3` es un ratio
   front-end sobre ingreso bruto. Un banco mide back-end: las cuotas que la
   persona ya paga entran al cálculo.
2. **No había piso de subsistencia.** El 30% de B/. 2,000 y el 30% de B/. 520 no
   son el mismo riesgo. Con ingresos bajos el porcentaje miente.
3. **La tasa no dependía del riesgo.** 9.5% con extracto y 12.5% sin: 300 puntos
   base por adjuntar un documento. Y `PantallaCredito` ya le promete a la persona
   que el extracto le baja la tasa.
4. **El plazo se escalonaba por monto**, cuando en banca sale de la cuota que
   cabe y del destino del dinero.
5. **El rechazo no era accionable.** "capacidad de pago insuficiente" no dice qué
   habría que cambiar.

Lo que sí estaba bien y se conserva: `confianza < 0.5` manda a `revision` y no a
rechazo. Un documento ilegible no es un mal cliente. Eso es la cola de referral
de cualquier banco.

## Decisión

Un motor determinista en `mobile/src/core/credito/`, en seis etapas:
elegibilidad, capacidad de pago, puntaje, precio, estructura y explicación. Más
`nodo/cartera.mjs`, que es la mitad que mira el banco.

**Hogar único, cero copias.** Node 22 lee TypeScript sin build, así que el nodo
importa los mismos `.ts` que el teléfono. Si hubiera dos copias podrían dar
números distintos y nadie se enteraría hasta la demo. Es la consecuencia natural
de `ca5ddb5`, que terminó de aplicar `ADR-004` borrando el core duplicado de la
raíz.

**Dos entradas al mismo código.** `preCalificar()` corre en el teléfono, sin
señal, con lo que la persona carga encima, y devuelve un estimado que se declara
como tal. `decidir()` corre en el nodo y añade lo que la persona no carga:
historial de bureau y estado de la cartera. El corte no es comercial, es de
propiedad del dato.

**El LLM no participa.** `ADR-005` sigue intacto: las reglas deciden. Un
scorecard es una suma de enteros que se puede leer en pantalla, así que lo
cumple mejor que la aritmética que había. Un modelo de lenguaje decidiendo
crédito además sería sistema de alto riesgo bajo el EU AI Act (Anexo III).

## Lo que cambia, en números

Ingreso de B/. 520, asalariado, una deuda de B/. 40 al mes, sin dependientes,
paquete de diabetes de B/. 920:

| | Capacidad | Grado | Tasa | Cuota | Paga en el año |
| --- | --- | --- | --- | --- | --- |
| Modelo de juguete | 156.00 | - | 12.5% | 81.96 | 983.47 |
| Nuevo, sin extracto | 138.84 | C | 17.40% | 84.08 | 1,008.96 |
| Nuevo, con extracto | 138.84 | A | 10.60% | 81.14 | 973.68 |

La capacidad baja de 156.00 a 138.84 porque ahora se descuenta lo que la persona
ya paga y un mínimo vital antes de aplicar el techo del 30%.

**El extracto vale B/. 35.28 menos en el año** y 6.8 puntos de tasa, porque
mueve el puntaje de 545 a 587 y con eso el grado de C a A. Esa es la promesa que
`PantallaCredito.tsx` ya le hacía a la persona; ahora es verdad y tiene número.

## La capacidad de pago

```text
neto          = ingreso * (1 - deduccion_ley[tipo])
minimo_vital  = 94.95 * (1 + personas_a_cargo) * 1.6
capacidad     = max(0, neto - deudas_mensuales - minimo_vital)
cuota_max     = min(capacidad, neto * 0.30)
monto_max     = min(3 * ingreso, 5000)
```

El 30% sobrevive como techo, no como la regla: manda el más restrictivo de los
dos. Con ingreso de 520 ata el ratio; con 300 ata el residual, que es el
comportamiento correcto y el que el modelo viejo no sabía dar.

Los B/. 94.95 son la canasta básica familiar de alimentos del MEF para el Resto
Urbano del país, marzo de 2026: B/. 341.81 para un hogar promedio de 3.6
miembros. El factor 1.6 cubre el gasto no alimentario y va marcado como
estimado, porque el MEF no publica una cifra mensual citable de eso.

El techo de tres veces el ingreso sale de la **Ley 81 de 2009**, que lo fija
para tarjetas de crédito. Adaptarlo a préstamo personal es decisión nuestra y se
declara.

## El puntaje

Regresión logística sobre variables binadas con Weight of Evidence, convertida a
puntos (PDO 20, base 600 a odds 50:1). Entrenada sobre una **cartera sintética**
de 3,000 solicitantes con semilla fija (`data/cartera-sintetica.mjs`).

Holdout de 600 casos: **AUC 0.723, KS 0.379**. La mora real sube monótona por
grado: 3.6%, 4.8%, 10.6%, 22.8%, 29.6%.

Dos decisiones dentro del modelo:

**`antiguedad` se re-binó.** Con cortes finos los puntos salían 87, 65, 70, 72,
83: menos de seis meses puntuaba mejor que dos años, que es ruido y no señal.
Re-binar hasta que el WOE quede monótono es el procedimiento normal en un
scorecard, y aquí además subió el AUC de holdout.

**La edad quedó fuera del scorecard.** El proceso generador sí la usa, así que
el modelo podía explotarla, pero puntuar por edad es discriminar. Medido, no
costó nada: sin ella el holdout da 0.723 contra 0.722 con ella. La edad se queda
solo como regla de elegibilidad, que es una política declarada y no un puntaje
escondido. El efecto colateral es el que importa: **todas las variables que
quedan son accionables**, y por eso la explicación del rechazo sirve para algo.

## El precio

```text
tasa = fondeo + PD * LGD + opex/(monto * años) + capital + margen
```

acotada entre 9.5% y 24%.

El término de opex es el que enseña la tesis del proyecto. A 12 meses, con B/.
920 pesa 0.65% anual; con B/. 72 pesa 8.3%; a 6 meses con B/. 28 pesa 42.86%.
**Eso es por qué el microcrédito real cuesta 20 a 40 por ciento**, y por qué
originar sin sucursal, leyendo los documentos en el propio teléfono, es lo único
que permite cobrar menos. El número lo demuestra sin discurso.

**Los montos chicos salen bajo costo y el banco absorbe la diferencia.** No se
rechazan: el crédito pequeño se sostiene con el grande dentro de la misma
cartera. Es decisión de producto. La respuesta marca `bajo_costo` cuando aplica
(`Respuesta` / `RespuestaBancoSchema`).

## La vista del banco

`nodo/cartera.mjs` clasifica por días de mora según el **Acuerdo 4-2013** de la
Superintendencia de Bancos, artículo 18 parágrafo 2, columna de consumo (normal
0 a 60, mención especial 61 a 90, subnormal 91 a 120, dudoso 121 a 180,
irrecuperable más de 180) y provisiona según el artículo 34 (20%, 50%, 80%,
100% sobre el saldo menos el valor presente de la garantía).

Sobre los seis créditos de la demo, `eval/run.mjs` simula doce meses con la
misma PD que usó el precio: expuesto B/. 2,580, pérdida simulada B/. 116.87
(4.53%), prima de riesgo cobrada B/. 212.99. **El precio cubre la pérdida**, así
que el modelo cierra sobre sí mismo.

## Lo que se declara

- El scorecard está entrenado sobre cartera sintética. No hay ni un dato real de
  ningún cliente panameño, y no representa la política de ningún banco.
- Los parámetros marcados como estimados no tienen cifra publicada que citar.
- La decisión no la toma un modelo de lenguaje.
- La edad no puntúa.

## Alternativas consideradas

- **Dejar el modelo de juguete y declararlo.** Es honesto pero desperdicia el
  reto de Caja de Ahorros, que es de inclusión financiera: el punto entero es
  cómo se decide un crédito para quien no tiene carta laboral ni fiador.
- **Entrenar sobre datos reales.** No existen datos panameños de crédito
  disponibles, y fabricar credibilidad sería peor que declarar la síntesis.
- **Un LLM que decida.** Rompe `ADR-005`, es alto riesgo bajo el EU AI Act y no
  se puede explicar un rechazo.
- **Modelo solo en el nodo.** Era lo que decía el CHECKLIST, pero el mapa de
  diseño ya había decidido que la pantalla 12 muestra la cuota estimada antes de
  pedir, y sin señal no hay nodo que la calcule.

## Consecuencias

- `SolicitudSchema` gana tres campos: `deudas_mensuales_usd`,
  `personas_a_cargo` y `ingresos.antiguedad_meses`. Es el contrato con el nodo,
  y `ADR-004` marca su deriva como el riesgo principal.
- `nodo/credito.mjs` pasa de tener la política a ser una cáscara de doce líneas.
- `eval/run.mjs` gana la sección 5, que verifica monotonía, invariantes y que el
  precio cubra la pérdida en cada corrida.
- `PantallaCuota.tsx` está cableada en `App.tsx` tras leer documentos
  (`paso === "cuota"` → envío → banco → firma → desembolso simulado).
  `deudas_mensuales_usd` y `personas_a_cargo` salen en **0** desde
  `lectura.ts` en el camino de demo (`PantallaDatos` sigue huérfana).
- El eval compila con `--rewriteRelativeImportExtensions`, porque dentro de
  `credito/` los imports llevan extensión `.ts` para que Node los lea sin build.

## Se reabre si

Aparecen datos reales de cartera panameña con los que calibrar, o Metro resulta
no resolver los imports con extensión `.ts` explícita. Lo segundo se sabrá en el
primer build de Android, y el arreglo es colapsar `credito/` en un solo archivo.
