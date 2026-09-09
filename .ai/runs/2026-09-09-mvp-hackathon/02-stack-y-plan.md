# Stack y plan de implementacion · MVP hackathon

Clasificacion: `architectural`. Escrito el 9 sep 2026 a las 14:00 Panama.
Quedan **42 horas** hasta el cierre (vie 11 sep 08:00). Objetivo de entrega
real: **vie 06:00**, con 2 h de margen.

Referencias: `01-idea-validation.md` (decision de idea), `docs/BRIEF.md`,
`references/qvac.md`, `references/retos.md`, `spikes/lora-medpsy/RESULTADOS.md`.

---

## 1. Hallazgo bloqueante (leer antes que nada)

`references/qvac.md` linea 39 y gotcha 8: **la cuota de cache de modelos en
React Native es 512 MiB.** En el resto de plataformas son 4 GiB.

`mobile/App.tsx` carga hoy `HEALTHCARE_1_7B_MEDICAL_Q8_0`, que pesa **2.1 GB**.
Son 4 veces la cuota. El smoke test no ha corrido nunca en un telefono, asi que
esto no esta descartado: es la hipotesis mas probable de por que fallara.

Y el gotcha 12 empeora el cuadro: *"1B alucina en extraccion; usar >= 4B para el
JSON estructurado"*. Un modelo de 4B en Q4 pesa ~2.5 GB. Tampoco entra.

Es decir: **el plan actual pide en el telefono dos cosas que, por cuota, no
caben.** Hay que resolverlo en la primera hora, no en la hora 30.

### Las tres salidas, a probar en este orden

1. **Cargar por path local, no por constante de catalogo.** El SDK acepta
   `modelSrc` como path local si se pasa `modelType`. La cuota de 512 MiB es del
   *cache* de modelos; un archivo sideloaded con `adb push` a la carpeta de la
   app y cargado por ruta plausiblemente no pasa por ese contador. Es la salida
   mas barata y la que preserva todo el diseno. **Probar primero.**
2. **Mover `cacheDirectory`.** Es configurable en `qvac.config.json`. Apuntarlo
   al directorio de documentos de la app puede levantar el limite.
3. **Delegar MedPsy al nodo por P2P.** Si 1 y 2 fallan, el telefono corre solo
   OCR (`OCR_LATIN`, chico) y la inferencia del LLM viaja al nodo del
   corregimiento. Esto **sigue cumpliendo el reglamento** ("en el dispositivo o
   delegada por P2P") y de hecho es justo lo que los tres retos premian.

No es una tragedia: la salida 3 convierte la restriccion en el argumento del
proyecto. Pero hay que saber cual de las tres es antes de escribir UI.

---

## 2. Revision de la idea

### Lo que esta bien y hay que proteger

- **Encaja en 3 retos con un solo producto**: General (6,000), Tether Psy
  (1,500), Caja de Ahorros (1,500). Es la mejor relacion esfuerzo/premio del
  tablero.
- **MedPsy tiene funcion central**, no decorativa. Es el requisito duro de
  Tether Psy y se cumple de forma natural.
- **Las senales las detectan reglas (`core/reglas.ts`), el modelo solo
  explica.** Esto es exactamente el "manejo responsable de riesgos" que pide
  Tether Psy, y ademas evita que un 1.7B invente rangos de referencia (el spike
  de LoRA lo vio inventar "plaquetas 45-60").
- **Las fotos se borran y solo viaja JSON.** Argumento fuerte para el jurado
  bancario y para el de salud a la vez.
- **El nodo del corregimiento con store-and-forward** es un uso real de Pears,
  no un checkbox. Los tres retos lo valoran.

### Lo que hay que recortar hoy

- **Tres documentos con OCR es tres veces el trabajo.** Cedula + comprobante de
  ingresos alcanza. `ExtractoSchema` ya esta como `.optional()` en
  `core/schemas.ts`, o sea que el esquema ya anticipo este recorte: usarlo.
- **La firma con trazo** es lo primero que se cae si falta tiempo. Un boton
  "Acepto" que guarda un hash cumple el mismo papel en el video.
- **TranslatePsy** no entra. Suma poco y cuesta un modelo mas en un telefono que
  ya va apretado de memoria.

### Los huecos que hoy no existen y son requisitos duros

| Hueco | Estado | Quien lo exige |
| --- | --- | --- |
| `eval/` | **No existe.** El BRIEF lo lista en la arquitectura pero la carpeta no esta. | Tether Psy: "calidad de dominio medible" |
| `perf/perf.jsonl` | Solo hay `README.md` con el formato. Cero codigo. | Tether Psy: "registro de rendimiento estructurado" es **entregable** |
| `core/` en el movil | `core/` no tiene `node_modules` y Metro no resuelve un paquete hermano sin configurar el monorepo. | Nadie, pero rompe la compilacion |
| `nodo/` instalado | Sin `node_modules`. | Nadie, pero el nodo no arranca |
| `data/mediciones` y `data/documentos` | Solo el README. Sin datos sinteticos. | Reglamento: nada de datos reales |

Los dos primeros no son "nice to have": son entregables listados de Tether Psy.
Sin ellos ese reto se cae aunque la app funcione.

---

## 3. Stack

| Capa | Que | Por que |
| --- | --- | --- |
| SDK | `@qvac/sdk` **0.18.2** fijado | Ultima con provider mode. No correr `npm update` bajo ninguna circunstancia. |
| Modelo unico | `HEALTHCARE_1_7B_MEDICAL_Q8_0` (MedPsy 1.7B, Q8_0, 2.1 GB) | Es el **unico** del catalogo con cuantizacion entrenable (Q8_0). Todos los `QWEN3_*_INST` vienen en Q4_K_M y `finetune()` los rechaza. Un solo modelo en memoria en vez de dos. |
| Adaptador | 1 LoRA propio, ~34 MB, dos tareas | Ver seccion 5. |
| OCR | `@qvac/ocr-ggml` con `OCR_LATIN` | Chico, ya declarado en `mobile/qvac.config.json`. |
| Movil | Expo SDK 54 + `react-native-bare-kit` + `bare-rpc` | Ya prebuildeado y funcionando. **Android fisico, los emuladores no sirven.** |
| Persistencia | `expo-sqlite` | Ya en dependencias. La cola de solicitudes vive aqui. |
| Transporte | Hyperswarm directo (`nodo/index.mjs`) + HTTP local como alterno | Ya escrito y funcionando. No depende de la delegacion nativa del SDK, que es la parte fragil de 0.18.2. |
| Compartido | `core/` en TypeScript puro, sin deps nativas | Schemas zod, prompts, reglas, validaciones. Ya escrito. |

### Decision sobre `core/` (hay que tomarla en la primera hora)

Metro no resuelve `../core` como paquete hermano sin configurar workspaces. Dos
caminos:

- **A (recomendado):** mover `core/*.ts` a `mobile/src/core/` y que `nodo/`
  importe los `.ts` compilados o duplique las 3 funciones que necesita
  (`decidir` ya es independiente). Feo pero cuesta 10 minutos y no falla.
- **B:** configurar npm workspaces en la raiz + `metro.config.js` con
  `watchFolders`. Correcto, pero es una hora de pelea con Metro que no tenemos.

Tomar A. Anotar en el README que se prefirio duplicacion sobre configuracion de
monorepo por presupuesto de tiempo. Es una decision defendible ante un jurado.

### Decision sobre el modelo en el telefono

Depende del resultado del bloque 0. Documentar en el README **el resultado real**,
no la intencion. "Nombres honestos de modelo, cuantizacion y hardware" es
requisito explicito de Tether Psy.

---

## 4. Plan por bloques

Hora Panama. El reparto asume `0xj4an` en movil y transporte, Artur en core,
datos y evaluacion.

### Bloque 0 · mie 14:00 a 15:30 · DESBLOQUEO (nada mas importa)

Todo lo demas esta bloqueado por esto.

1. `0xj4an`: conectar el Android por USB con depuracion activada. `adb devices`
   tiene que listarlo. **Hoy no lista nada.**
2. `0xj4an`: `cd mobile && npx expo run:android --device`. El smoke test carga
   MedPsy y pide un primer token con TTFT.
3. Si falla por memoria o cuota: probar las tres salidas de la seccion 1 en
   orden. Presupuesto: 45 minutos. Pasado eso, ir a la salida 3 (delegacion) sin
   discutir mas.
4. Artur en paralelo: `npm install` en `nodo/` y `core/`. Arrancar
   `npm run banco` y `npm run corregimiento` y ver que se descubren por
   Hyperswarm.

**Salida verificable:** una captura del telefono mostrando "modelo cargado" y
texto en espanol, mas el TTFT en milisegundos. Esa captura es la que decide la
arquitectura de las siguientes 40 horas.

### Bloque 1 · mie 15:30 a 20:00 · rebanada vertical

- `0xj4an`: pantalla 1, alerta de salud. `core/reglas.ts` sobre mediciones
  sinteticas -> `SYSTEM_ALERTA` -> `limpiarJson()` -> `AlertaSchema.parse()`.
  Que se vea en el telefono.
- `0xj4an`: **`perf/logger.ts` desde ya.** Cada `completion()` escribe una linea
  en `perf.jsonl` con el formato de `perf/README.md`. Si esto no se hace ahora,
  no se hace nunca, y es entregable de Tether Psy.
- Artur: `data/mediciones/` con un generador de series sinteticas que dispare
  cada una de las 4 reglas de `core/reglas.ts`.
- Artur: `data/documentos/` con cedula, carta laboral y extracto **ficticios**
  renderizados como imagen, para probar OCR sin datos reales.

### Bloque 2 · mie 20:00 a jue 01:00 · flujo completo, UI fea

- `0xj4an`: camara -> `ocr()` -> texto -> `SYSTEM_EXTRACCION_CEDULA` ->
  `CedulaSchema` -> **borrar la foto** -> guardar JSON en SQLite.
- `0xj4an`: cola en SQLite con estado `pendiente`, y el envio al nodo (HTTP
  primero, que es mas facil de depurar que Hyperswarm).
- Artur: `eval/` con el set de evaluacion y `eval/run.mjs`. Metricas: % de JSON
  parseable, % de campos exactos contra ground truth, por tarea. Correrlo contra
  el modelo base **hoy** para tener la linea base antes del LoRA.
- Artur: afinar `nodo/credito.mjs` y verificar que `RespuestaBancoSchema` valida
  lo que el nodo devuelve de verdad.

**Al terminar el bloque, lanzar el entrenamiento del LoRA y irse a dormir.**
Ver seccion 5. Son ~30 min por epoca y el Mac trabaja solo.

### Bloque 3 · jue 01:00 a 08:00 · descanso por turnos

El LoRA entrena sin supervision. Quien quede despierto deja corriendo el eval
base y prepara el guion del video en `docs/VIDEO.md`.

**Importante:** poner el Mac en `caffeinate -i` o similar. En el spike el Mac se
durmio a mitad del entrenamiento y el log marco 53,621 s cuando el tiempo activo
real fueron ~90 minutos.

### Bloque 4 · jue 08:00 a 14:00 · integrar LoRA y medir

- Cargar el adaptador (seccion 5) y correr `eval/run.mjs` otra vez.
- **La tabla antes/despues es el activo mas valioso del proyecto** para Technical
  (35%) y para el criterio de "calidad de dominio medible" de Tether Psy.
- UI presentable. Disclaimers de salud visibles en pantalla, no en el README.

### Bloque 5 · jue 14:00 a 20:00 · P2P y la demo

- Wi-Fi apagado: la solicitud queda en cola, la app lo dice.
- Wi-Fi encendido o nodo del corregimiento cerca: la solicitud sale, el banco
  responde, la respuesta vuelve.
- Ensayar la demo completa **tres veces seguidas** con el telefono en la mano.
  Lo que falla, falla aqui y no grabando.

### Bloque 6 · jue 20:00 a vie 02:00 · video y README

- Video <= 5 min, espanol, enlace sin login. Es **lo primero que mira el jurado**
  del reto General.
- README con lo que exige Tether Psy: modelos con nombre y cuantizacion honestos,
  hardware real de ejecucion, instrucciones de setup reproducibles, APIs remotas
  y componentes de terceros declarados, licencia MIT ya puesta.
- **Declarar la base preexistente**: `../qvac-course/`, los spikes de
  `spikes/`, la plantilla AI Engineering Kit, el tutorial Expo de QVAC y las
  recetas de Tether que se hayan usado. **Omitir esto descalifica.**

### Bloque 7 · vie 02:00 a 06:00 · colchon

Solo se toca lo que este roto. Nada nuevo. Entregar a las 06:00.

---

## 5. LoRA: que entrenar, como cargarlo, como demostrarlo

### Que dice el spike que ya corrio

`spikes/lora-medpsy/RESULTADOS.md`, del 8 al 9 de septiembre:

- Base `HEALTHCARE_1_7B_MEDICAL_Q8_0`. Es el unico entrenable del catalogo.
- 52 ejemplos, 3 epocas, lr 2e-4, rank 8, alpha 16, ctx 1024, `assistantLossOnly`,
  modulos attn+ffn.
- ~28 min por epoca en el M5 Pro. Loss de 2.0 a 0.010, accuracy val 0.994.
- Artefacto: `out/trained-lora-adapter.gguf`, **34 MB**.
- Resultado: base 1/3 -> LoRA 2/3 JSON parseables.

O sea: **el pipeline funciona de punta a punta y ya esta probado.** El riesgo
tecnico de LoRA esta cerrado. Lo que falta es apuntarlo al blanco correcto.

### El cambio que recomiendo: entrenar la extraccion, no solo el triaje

El spike entreno el **triaje de salud**. Propongo entrenar un adaptador que
cubra **triaje + extraccion de documentos**, con el peso del dataset en
extraccion. Cinco razones:

1. **Es donde el JSON invalido rompe el producto.** `CedulaSchema` tiene un
   regex estricto de cedula panamena. Si el modelo devuelve el formato mal, el
   flujo se cae. En el triaje, un texto imperfecto igual se le muestra a la
   persona.
2. **Los datos sinteticos son gratis e ilimitados.** Se genera
   `{nombre, numero, fechas}` y se renderiza el "texto OCR" con ruido realista
   (confusion 0/O y 1/I, tildes perdidas, saltos de linea, encabezados de mas).
   El ground truth lo controlas vos. Son 20 lineas de codigo para 500 pares.
   Para triaje medico tendrias que **inventar criterios clinicos**, que es justo
   lo que Tether Psy penaliza.
3. **Es medible objetivamente**, y esa medicion **es** el `eval/` que falta. Dos
   entregables con un solo trabajo.
4. **Ataca el gotcha 12 de frente.** La doc dice que hace falta >= 4B para
   extraccion estructurada. Un adaptador que hace que un 1.7B iguale a un 4B en
   **un** esquema estrecho es una afirmacion tecnica fuerte y verificable, y es
   literalmente la tesis "Sovereign Intelligence at the Edge".
5. **Resuelve la memoria.** Un modelo mas un adaptador de 34 MB, en vez de un
   modelo de salud mas un modelo de extraccion de 4B.

Ademas MedPsy queda con funcion central en las dos mitades del flujo, que es lo
que Tether Psy exige.

**Honestidad obligatoria en el README:** MedPsy es un modelo medico y lo estamos
usando tambien como base para extraer campos de documentos. Se eligio porque es
el unico del catalogo con cuantizacion entrenable, no porque su dominio medico
aporte a la lectura de una cedula. Decirlo tal cual. El jurado de Tether conoce
su propio catalogo y va a notar la eleccion; explicarla suma, esconderla resta.

### Dataset

- ~300 ejemplos: 200 de extraccion (cedula e ingresos, con ruido de OCR) y 100
  de triaje reusando `make-dataset.mjs`, que ya existe.
- 30 de validacion, disjuntos.
- Formato JSONL de mensajes, el mismo que ya consume el spike.

### Entrenamiento

Reusar `spikes/lora-medpsy/spike.mjs` tal cual, cambiando el dataset:

```
numberOfEpochs: 2, learningRate: 2e-4, lrMin: 1e-8, contextLength: 1024,
loraRank: 8, loraAlpha: 16, assistantLossOnly: true,
loraModules: "attn_q,attn_k,attn_v,attn_o,ffn_gate,ffn_up,ffn_down"
```

Con 300 ejemplos y 2 epocas son ~2 h en el Mac. **Lanzarlo al cerrar el bloque 2
y dormir.** Es la mejor hora del hackathon para gastarla: el Mac trabaja y el
equipo descansa.

Con `caffeinate -i node spike.mjs`, o el Mac se duerme como en el spike.

### Cargarlo

En cualquier plataforma es lo mismo, un path a un `.gguf`:

```js
loadModel({
  modelSrc: HEALTHCARE_1_7B_MEDICAL_Q8_0,
  modelType: "llm",
  modelConfig: {
    ctx_size: 2048,
    reasoning_budget: 0,
    device: "gpu",
    lora: adapterPath,
  },
})
```

Para que `adapterPath` exista en el telefono, en orden de esfuerzo:

1. **`adb push` a la carpeta de la app.** Cero codigo. Sirve para probar hoy.
2. **Empaquetarlo como asset de Expo** y copiarlo a
   `FileSystem.documentDirectory` en el primer arranque. 34 MB en el APK es
   aceptable. Es lo que debe quedar para la entrega.
3. **Servirlo desde el nodo del corregimiento** por HTTP o Hyperswarm y bajarlo
   la primera vez. Son ~30 lineas mas y regala una escena buenisima para el
   video: *la mejora del modelo viaja por P2P hasta el pueblo, sin nube*. Hacerlo
   solo si el bloque 5 va sobrado.

### Lo que hay que limpiar si o si

El spike lo dejo documentado: **`</think>` se fuga aunque `reasoning_budget: 0`.**
`core/prompts.ts` ya tiene `limpiarJson()` para eso. Que **toda** salida del
modelo pase por ahi antes de `JSON.parse`. Sin excepciones.

### Entrenar en el telefono (opcional, solo si sobra tiempo)

La doc dice que `finetune()` corre en movil sobre Vulkan y Metal. Entrenar en el
propio telefono, sin red, es la escena que mejor cuenta "Sovereign Intelligence
at the Edge" y probablemente ningun otro equipo la tenga.

Pero es riesgo puro: no esta probado en este hardware y puede comerse una noche.

Como hacerlo sin arriesgar nada: el adaptador de produccion se entrena en el
Mac (ya decidido arriba). Si el jueves a las 20:00 todo esta entregable, se
lanza **1 epoca sobre 30 ejemplos** en el telefono solo para grabar la escena, y
se declara en el video y en el README como demostracion de capacidad, no como el
adaptador que usa la app. Si falla, no se pierde nada porque el adaptador bueno
ya existe.

---

## 6. Riesgos ordenados por lo que cuesta que salgan mal

| # | Riesgo | Mitigacion | Cuando se sabe |
| --- | --- | --- | --- |
| 1 | El telefono no aparece en `adb` o Expo no compila | Es el bloque 0 entero. Sin esto no hay proyecto. | mie 15:30 |
| 2 | Cuota de 512 MiB bloquea el modelo en el movil | Tres salidas de la seccion 1, la ultima (delegar por P2P) siempre funciona | mie 15:30 |
| 3 | Sin `perf.jsonl` ni `eval/` | Se construyen en los bloques 1 y 2, no al final | jue 01:00 |
| 4 | Metro no resuelve `core/` | Opcion A: mover a `mobile/src/core/` | mie 16:00 |
| 5 | Base preexistente sin declarar | Checklist del bloque 6. **Descalifica.** | jue 22:00 |
| 6 | El OCR lee mal las imagenes sinteticas | Renderizar los documentos con tipografia y ruido realistas, no texto plano perfecto | mie 20:00 |
| 7 | Hyperswarm no atraviesa NAT entre redes distintas | Demo en la misma LAN. Los relays de los ejemplos usan claves mock. | jue 16:00 |
| 8 | `npm update` accidental rompe 0.18.2 | Version fijada. No correr update. | siempre |

---

## 7. Lo que decide el resultado

La rubrica es Technical 35%, Innovation 25%, Impact 20%, Design 10%,
Completion 10%, y desempata por Technical y luego Impact. Pero **Completion es la
puerta**: sin demo funcional no hay puntaje, y ahi el 10% enganna.

Traducido a esta semana: **una demo mas corta que funcione entera le gana a una
demo ambiciosa a medias.** Si el jueves a las 14:00 el flujo completo no corre en
el telefono, hay que recortar (fuera el extracto bancario, fuera la firma, fuera
el LoRA) y no al reves.

El orden en que se cae el alcance, ya decidido para no discutirlo con sueno:

1. Firma con trazo -> boton "Acepto"
2. Extracto bancario -> solo cedula e ingresos
3. Entrenamiento en el telefono -> solo en el Mac
4. Nodo del corregimiento -> envio directo al banco por HTTP
5. LoRA -> modelo base y se documenta el spike como experimento

Del 1 al 3 se puede recortar sin tocar el pitch. Del 4 en adelante duele.
