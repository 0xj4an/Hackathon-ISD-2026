# Stack y plan de implementacion · MVP hackathon

Clasificacion: `architectural`.

Referencias: `01-idea-validation.md` (decision de idea), `docs/BRIEF.md`,
`references/qvac.md`, `references/retos.md`, `spikes/lora-medpsy/RESULTADOS.md`.

---

## 1. Como funciona QVAC en el telefono, y donde esta el riesgo real

> **Corregido.** La primera version de esta seccion decia que
> React Native tiene una cuota de cache de 512 MiB y que por eso el modelo no
> cabia. **Ese dato no existe en los docs de QVAC.** Buscado en
> `about/how-it-works`, `system-requirements`, `configuration`,
> `troubleshooting` y `llms-full.txt`: no aparece. Venia de `references/qvac.md`
> y se dio por bueno sin verificar. El riesgo es real pero el mecanismo es otro.

### Que se instala y que se descarga

Son dos cosas distintas y conviene tenerlo claro antes de discutir tamanos.

- **Se instala con la app** (via `expo prebuild` y el plugin de QVAC): el SDK y
  los **motores nativos de inferencia**. Es el `mobile/qvac/worker.bundle.js` de
  9.5 MB mas los addons. Por eso `mobile/qvac.config.json` declara solo
  `llamacpp-completion` y `ggml-ocr`: para no linkear motores que no se usan.
- **NO se instala: los pesos del modelo.** Textual del tutorial de Expo:
  *"On the first run, the model may download from peers"*. Bajan en el primer
  arranque, por P2P o HTTP, a `cacheDirectory` (default `~/.qvac/models`,
  personalizable, **sin limite de tamano documentado**).

El patron del tutorial:

```js
await downloadAsset({ assetSrc: LLAMA_3_2_1B_INST_Q4_0, onProgress: ... });
const id = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
```

### Los dos riesgos que si son reales

**1. La primera descarga son 2.1 GB.** `HEALTHCARE_1_7B_MEDICAL_Q8_0` pesa
2.1 GB. El tutorial de QVAC usa Llama 1B Q4_0, ~0.7 GB: estamos pidiendo el
triple. **Esa descarga no puede pasar en el evento ni grabando el video.** Hay
que pre-descargar al telefono antes, con `downloadAsset()`. Ya existe
un script propio con `downloadAsset()` para eso.

**2. RAM, no disco.** Los docs dicen *"Below 4 GB, most LLMs will fail to
load"* y piden >= 2 GB de RAM **disponible** al cargar. Cargar 2.1 GB de pesos
en un telefono de gama media es el limite real. Esto sigue sin probarse.

Y el gotcha 12 de `references/qvac.md` sigue en pie: *"1B alucina en extraccion;
usar >= 4B para el JSON estructurado"*. Un 4B en Q4 son ~2.5 GB, peor todavia.
**Ese conflicto es exactamente lo que el LoRA de la seccion 5 resuelve**: en vez
de subir a 4B, se hace que el 1.7B rinda en un esquema estrecho.

### Telefono objetivo: Xiaomi 14T Pro

Y el riesgo de RAM practicamente desaparece. Specs confirmadas:

| | |
| --- | --- |
| SoC | MediaTek Dimensity 9300+ (4 nm), Cortex-X4 a 3.25 GHz |
| RAM | **12 GB LPDDR5X** (hay variante de 16 GB) |
| GPU | Immortalis-G720 MC12 |
| SO | Android 14 con HyperOS |

Contra los requisitos de los docs:

- **Android 12+ y arm64**: cumple de sobra (Android 14).
- **RAM**: 12 GB contra el *"below 4 GB, most LLMs will fail to load"*. Cargar
  2.1 GB de pesos es comodo. **Este era el riesgo grande y queda casi cerrado.**
- **Dispositivo fisico**: es fisico. Textual de los docs: *"QVAC currently does
  not run on emulators. You must use a physical device."*
- **>= 5 GB de disco libre**: verificar cuanto le queda, es lo unico pendiente.

Consecuencias para el plan:

1. **La delegacion a la laptop deja de ser plan de rescate y vuelve a ser lo que
   deberia: una decision de producto.** Se hace porque suma en los tres retos,
   no porque el telefono no aguante.
2. **Entrenar el LoRA en el propio telefono sube de "improbable" a "vale la pena
   intentarlo".** Un Dimensity 9300+ con 12 GB es mejor maquina que muchos
   portatiles. Sigue sin estar documentado que `finetune()` corra en Android,
   asi que no se promete en el guion hasta verlo, pero el hardware no es la
   excusa.
3. **Queda un desconocido nuevo: el backend de GPU.** `mobile/App.tsx` pide
   `device: "gpu"`. La tabla de plataformas de `references/qvac.md` dice que en
   Android el soporte es **"Vulkan / OpenCL (Adreno 700+)"**. El 14T Pro no
   lleva Adreno sino **Mali Immortalis-G720**, o sea que la ruta OpenCL no
   aplica y todo depende de Vulkan. Los docs solo exigen Vulkan >= 1.4
   explicitamente para Linux y Windows y no dicen nada de Android.
   En el bloque 0 hay que probar **`device: "gpu"` y `device: "cpu"`** y anotar
   cual gana en TTFT. Con un Dimensity 9300+, incluso CPU deberia ser usable, asi
   que esto no bloquea nada: solo decide un parametro.

El unico riesgo de esta seccion que sigue vivo es la descarga de 2.1 GB.

### Trampa de HyperOS

HyperOS y MIUI no bastan con "USB debugging". Para que `expo run:android` pueda
**instalar** el APK hace falta habilitar tambien la opcion de instalar por USB
dentro de Opciones de desarrollador, y en varios equipos Xiaomi eso exige tener
sesion iniciada con cuenta Mi. Averiguarlo con el telefono en la mano en el
bloque 0, no a las 3 de la manana.

Para entrar a Opciones de desarrollador: Ajustes, Acerca del telefono, tocar
7 veces "Version de HyperOS", luego Ajustes adicionales, Opciones de
desarrollador.

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

### Lo que hay que recortar

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

### Decision sobre `core/`

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

## 4. Plan por bloques, en orden

**El reparto.** `0xj4an` define el dominio y el diseno: que datos de salud se
generan, que dispara una alerta, que examen y que especialista corresponden y
cuanto cuestan, la politica de credito, que se le pide al usuario y como se ve
la app. Artur implementa: movil, `core/`, `nodo/`, transporte y evaluacion.

Los valores de dominio se quedan donde estan hoy y se revisan ahi: los umbrales
y los examenes en `core/reglas.ts`, los rangos de laboratorio en
`core/marcadores.ts`, la politica de credito en `nodo/credito.mjs`. Si en algun
momento estorban dentro de la logica, se sacan; hoy no estorban.

### Bloque 0 · DESBLOQUEO (nada mas importa)

Todo lo demas esta bloqueado por esto. Lo hace **Artur**, que tiene el telefono.

1. Conectar el Xiaomi 14T Pro por USB. Opciones de desarrollador (7 toques en
   "Version de HyperOS"), depuracion USB **y la opcion de instalar por USB**,
   que es la que suele faltar en Xiaomi y puede pedir cuenta Mi. `adb devices`
   tiene que listarlo. **Hoy no lista nada.**
2. `adb shell df -h /data` para confirmar que hay >= 5 GB libres antes de bajar
   2.1 GB de pesos.
3. `cd mobile && npx expo run:android --device`. El smoke test carga MedPsy y
   pide un primer token con TTFT. **La primera vez se va a quedar un rato
   descargando 2.1 GB: es esperado, no es un cuelgue.**
4. Repetir el smoke test con `device: "cpu"` y anotar los dos TTFT. El backend
   de GPU en Mali/Vulkan no esta documentado para Android y con este SoC la CPU
   puede ser suficiente.
5. `npm install` en `nodo/` y `core/`. Arrancar `npm run banco` y
   `npm run corregimiento` y ver que se descubren por Hyperswarm.

**Salida verificable:** una captura del telefono mostrando "modelo cargado" y
texto en espanol, mas los dos TTFT (gpu y cpu). Con 12 GB de RAM esto **deberia**
funcionar; si falla, el sospechoso ya no es la memoria sino el pipeline de Expo
o el backend de GPU.

### Bloque 1 · rebanada vertical

**`0xj4an` (dominio):**

- Revisar los umbrales de la via A, que hoy estan en `core/reglas.ts` puestos a
  ojo: glucosa >= 126 y >= 100 sobre 3 tomas, pulso > 100 durante 5 dias,
  sistolica >= 140 en 3 tomas. Confirmar cada uno contra una fuente citable.
- Revisar el examen y el costo de cada senal, tambien en `core/reglas.ts`. Los
  costos de hoy (25, 8, 40, 15 USD) son inventados y la app se los muestra al
  usuario: o se sostienen o se etiquetan como estimados en pantalla.
- **Anadir el especialista.** Hoy `Senal` tiene `examen` y `costo_usd` pero
  nadie dice quien interpreta el resultado, que es la mitad de lo que hace util
  la alerta.
- **Quitar `linfocitos CD4`** de `core/marcadores.ts`: su siguiente paso
  menciona VIH y el BRIEF lo prohibe.
- `data/`: el historial de **dos usuarios ficticios**, uno sano y uno con
  hallazgo. El sano no debe disparar nada: esa es media demo.

**Artur (implementacion):**

- Pantalla 1, alerta de salud. `core/reglas.ts` sobre mediciones sinteticas ->
  `SYSTEM_ALERTA` -> `limpiarJson()` -> `AlertaSchema.parse()`. Que se vea en el
  telefono.
- **`perf/logger.ts` desde ya.** Cada `completion()` escribe una linea en
  `perf.jsonl` con el formato de `perf/README.md`. Si esto no se hace ahora, no
  se hace nunca, y es entregable de Tether Psy.
  **Dos cosas que evitan rehacerlo:** las metricas NO salen de la API de logging
  del SDK (esos logs son diagnostico: `level`, `namespace`, `message`,
  `timestamp`, sin tokens ni tiempos), salen del objeto `stats` de
  `await result.final`. Y de ese `stats` solo estan documentados
  `tokensPerSecond` y `avgConcurrentSeq`: **volcarlo entero sin filtrar** y medir
  el TTFT a mano con `Date.now()`, como ya hace `mobile/App.tsx`. Para escribir
  el archivo, `getLogger()` con transporte propio.
- **Las dos vias de deteccion** (ver `03-specification.md`, seccion "Las dos
  vias"). `reglasTendencia()` sobre el historial y `reglasRango()` sobre
  `core/marcadores.ts`, ambas devolviendo el mismo tipo `Senal`.
- El importador de `data/` al formato normalizado.

### Bloque 2 · flujo completo, UI fea

**`0xj4an` (dominio y diseno):**

- Revisar la politica de credito en `nodo/credito.mjs`. Los valores de hoy son
  de juguete: cuota maxima 30% del ingreso, 9.5% o 12.5% anual segun haya
  extracto, plazos 6/12/24 meses por monto, umbral de confianza de OCR 0.5,
  tope 5000 USD.
- **Que se le pide al usuario.** Hoy los schemas asumen cedula, carta laboral y
  extracto. Decidir si son esos tres, que campos de cada uno y que pasa si falta
  uno.
- `data/documentos/`: cedula, carta laboral y extracto **ficticios**
  renderizados como imagen, con tipografia y ruido realistas. Texto plano
  perfecto no prueba el OCR.
- Las pantallas, los estados (sin senal, con senal, subiendo documentos, en
  cola, respondida) y los textos.

**Artur (implementacion):**

- Camara -> `ocr()` -> texto -> `SYSTEM_EXTRACCION_CEDULA` -> `CedulaSchema` ->
  **borrar la foto** -> guardar JSON en SQLite.
- Cola en SQLite con estado `pendiente`, y el envio al nodo (HTTP primero, que
  es mas facil de depurar que Hyperswarm).
- `eval/` con el set de evaluacion y `eval/run.mjs`. Metricas: % de JSON
  parseable, % de campos exactos contra ground truth, por tarea. Correrlo contra
  el modelo base **antes del LoRA** para tener la linea base.
- Afinar `nodo/credito.mjs` y verificar que `RespuestaBancoSchema` valida lo
  que el nodo devuelve de verdad.

**Al terminar el bloque, lanzar el entrenamiento del LoRA y irse a dormir.**
Ver seccion 5. Son ~30 min por epoca y el Mac trabaja solo.

### Bloque 3 · descanso por turnos

El LoRA entrena sin supervision. Quien quede despierto deja corriendo el eval
base y prepara el guion del video en `docs/VIDEO.md`.

**Importante:** poner el Mac en `caffeinate -i` o similar. En el spike el Mac se
durmio a mitad del entrenamiento y el log marco 53,621 s cuando el tiempo activo
real fueron ~90 minutos.

### Bloque 4 · integrar LoRA y medir

- Artur: cargar el adaptador (seccion 5) y correr `eval/run.mjs` otra vez.
  **La tabla antes/despues es el activo mas valioso del proyecto** para Technical
  (35%) y para el criterio de "calidad de dominio medible" de Tether Psy.
- `0xj4an`: UI presentable. Disclaimers de salud visibles en
  pantalla, no en el README.

### Bloque 5 · P2P y la demo

- Wi-Fi apagado: la solicitud queda en cola, la app lo dice.
- Wi-Fi encendido o nodo del corregimiento cerca: la solicitud sale, el banco
  responde, la respuesta vuelve.
- Ensayar la demo completa **tres veces seguidas** con el telefono en la mano.
  Lo que falla, falla aqui y no grabando.

### Bloque 6 · video y README

- `0xj4an`: guion y grabacion. Video <= 5 min, espanol, enlace sin login. Es **lo
  primero que mira el jurado** del reto General.
- Artur: README con lo que exige Tether Psy: modelos con nombre y cuantizacion
  honestos, hardware real de ejecucion, instrucciones de setup reproducibles,
  APIs remotas y componentes de terceros declarados, licencia MIT ya puesta.
- **Declarar la base preexistente**: solo la plantilla AI Engineering Kit.
  **Omitir esto descalifica.**

### Bloque 7 · colchon

Solo se toca lo que este roto. Nada nuevo. Entregar con margen.

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
  de triaje a partir de `core/marcadores.ts`.
- 30 de validacion, disjuntos.
- Formato JSONL de mensajes, el mismo que ya consume el spike.

### Entrenamiento

Escribir el script de entrenamiento (`finetune()`), con este dataset:

```js
numberOfEpochs: 2, learningRate: 2e-4, lrMin: 1e-8, contextLength: 1024,
loraRank: 8, loraAlpha: 16, assistantLossOnly: true,
loraModules: "attn_q,attn_k,attn_v,attn_o,ffn_gate,ffn_up,ffn_down"
```

`finetune()` tambien soporta `pause` y `resume` con checkpoints (confirmado en
docs). Util si el Mac se duerme a mitad, como paso en el spike.

Con 300 ejemplos y 2 epocas son ~2 h en el Mac. **Lanzarlo al cerrar el bloque 2
y dormir.** Es la mejor hora del hackathon para gastarla: el Mac trabaja y el
equipo descansa.

Correr el entrenamiento con `caffeinate -i`, o el Mac se duerme como en el spike.

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

Entrenar en el propio telefono, sin red, es la escena que mejor cuenta
"Sovereign Intelligence at the Edge" y probablemente ningun otro equipo la
tenga.

**Cuidado con la fuente.** `references/qvac.md` afirmaba que `finetune()`
"corre en movil (Vulkan/Metal)". La pagina de fine-tuning de los docs **no
menciona Android ni iOS**. Es la misma clase de dato no corroborado que ya
causo un error en este plan, asi que: **no se promete en el guion del video
hasta verlo correr.**

Lo que si cambio a favor: el Xiaomi 14T Pro tiene Dimensity 9300+ y 12 GB de
RAM. Si el obstaculo fuera hardware, este telefono lo pasa. El obstaculo es
saber si el SDK lo soporta, y eso se resuelve con una prueba de 20 minutos, no
con una noche.

Como hacerlo sin arriesgar nada: el adaptador de produccion se entrena en el
Mac (ya decidido arriba). Si todo esta entregable, se
lanza **1 epoca sobre 30 ejemplos** en el telefono solo para grabar la escena, y
se declara en el video y en el README como demostracion de capacidad, no como el
adaptador que usa la app. Si falla, no se pierde nada porque el adaptador bueno
ya existe.

---

## 6. Riesgos ordenados por lo que cuesta que salgan mal

| # | Riesgo | Mitigacion |
| --- | --- | --- |
| 1 | El telefono no aparece en `adb` o Expo no compila. En Xiaomi, la opcion de instalar por USB puede pedir cuenta Mi | Es el bloque 0 entero. Sin esto no hay proyecto. |
| 2 | La descarga de 2.1 GB pasa en el evento o grabando | Pre-descargar con `downloadAsset()` antes de moverse |
| 3 | Sin `perf.jsonl` ni `eval/` | Se construyen en los bloques 1 y 2, no al final |
| 4 | Metro no resuelve `core/` | Opcion A: mover a `mobile/src/core/` |
| 5 | Base preexistente sin declarar | Checklist del bloque 6. **Descalifica.** |
| 6 | El OCR lee mal las imagenes sinteticas | Renderizar los documentos con tipografia y ruido realistas, no texto plano perfecto |
| 7 | Hyperswarm no atraviesa NAT entre redes distintas | Demo en la misma LAN. Los relays de los ejemplos usan claves mock. |
| 8 | `npm update` accidental rompe 0.18.2 | Version fijada exacta en `package.json` y en el lock. No correr update. |
| 9 | El backend `device: "gpu"` no rinde en Mali/Vulkan | Medir gpu y cpu en el bloque 0 y quedarse con el mejor |
| 10 | Planificar contra datos no verificados de `references/qvac.md` | Ya paso una vez con la cuota de 512 MiB. Todo dato que decida arquitectura se contrasta contra `docs.qvac.tether.io` antes de usarlo |

---

## 7. Lo que decide el resultado

La rubrica es Technical 35%, Innovation 25%, Impact 20%, Design 10%,
Completion 10%, y desempata por Technical y luego Impact. Pero **Completion es la
puerta**: sin demo funcional no hay puntaje, y ahi el 10% enganna.

Traducido a esta semana: **una demo mas corta que funcione entera le gana a una
demo ambiciosa a medias.** Si el flujo completo no corre en
el telefono, hay que recortar (fuera el extracto bancario, fuera la firma, fuera
el LoRA) y no al reves.

El orden en que se cae el alcance, ya decidido para no discutirlo con sueno:

1. Firma con trazo -> boton "Acepto"
2. Extracto bancario -> solo cedula e ingresos
3. Entrenamiento en el telefono -> solo en el Mac
4. Nodo del corregimiento -> envio directo al banco por HTTP
5. LoRA -> modelo base y se documenta el spike como experimento

Del 1 al 3 se puede recortar sin tocar el pitch. Del 4 en adelante duele.
