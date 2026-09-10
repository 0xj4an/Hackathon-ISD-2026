# ADR-013: Quedarnos en `@qvac/sdk` 0.18.2

- Estado: **aceptada**
- Reemplaza a: [`ADR-001`](ADR-001-fijar-sdk-0.19.md), que decidió mover a 0.19
- Fecha: 2026-09-10

## Contexto

`ADR-001` decidió fijar 0.19 exacto y renunciar a `delegate`, la delegación de
inferencia P2P nativa que 0.19 eliminó. Su argumento central fue que `delegate`
"no lo usamos", porque `nodo/index.mjs` monta su propio transporte con
Hyperswarm.

Esa decisión **nunca se aplicó**. Verificado en los lockfiles, no en los
`package.json`:

```
mobile/package-lock.json   "version": "0.18.2"
spikes/package-lock.json   "version": "0.18.2"
```

Y en el tiempo que pasó, aparecieron tres datos que el ADR-001 no tenía.

## Lo que cambió

### 1. Nuestro propio transporte es el que falla

`nodo/` descubre por *topic*, y eso es exactamente lo que no funciona detrás de
NAT. Medido: `hyperdht` llega a la red (61 nodos conocidos) pero reporta
`firewalled: true`, y dos peers en la misma máquina no conectan ni en dos
minutos. Detalle completo en [`docs/PRUEBA-NODO.md`](../../docs/PRUEBA-NODO.md).

`delegate` **no usa topic**. El ejemplo del propio SDK lo dice en un comentario:

> The consumer connects to the provider directly via its public key over the
> DHT (`dht.connect(publicKey)`). No topic or discovery step is involved.

O sea que `ADR-001` descartó la única herramienta que evita el paso que después
nos falló. No fue un error entonces: el problema todavía no se había medido.

### 2. La rúbrica premia justo lo que 0.19 quitó

De `retos.md`, tres tracks lo mencionan y ninguno lo hace obligatorio:

- **General (6,000)**: *"Se valora adicionalmente el uso de Pears para
  comunicación o delegación de inferencia entre pares (no obligatorio; una
  solución 100% on-device compite en igualdad)"*.
- **Caja de Ahorros (1,500)**: *"Se valora Pears / delegación P2P (no
  obligatorio)"*.
- **Philips (1,500)**: obligatorio es *"inferencia en el dispositivo **o**
  delegada P2P"*. On-device solo ya califica.

Es un bonus, no un requisito. Pero es un bonus que suma en tres tracks a la vez,
y 0.18.2 es la última versión que trae la vía nativa.

### 3. `ocr()` ya está en 0.18.2

El `CHECKLIST` daba `ocr()` por inexistente. Está exportado en el paquete
instalado, con dos modelos en el catálogo:

```
spikes/node_modules/@qvac/sdk/dist/client/api/ocr.d.ts:35
  export declare function ocr(params: OCRClientParams): {
    blockStream, blocks, stats
  }

OCR_LATIN   (EasyOCR, detector CRAFT auto-derivado)
OCR_DOCTR   (DocTR, detector DBNet)
```

Se carga con `loadModel({ modelSrc: OCR_LATIN.src, modelType: MODEL_TYPES.ggmlOcr })`
y devuelve bloques con `text`, `bbox` y `confidence`. La lectura de documentos
no está bloqueada por el SDK: está bloqueada porque las pantallas descartan el
`uri` de la foto.

## Decisión

**Quedarnos en `@qvac/sdk` 0.18.2**, la versión ya instalada y prebuildeada.

## Qué se pierde, y qué se hace en su lugar

`assessModelFit()`, que dice si un modelo cabe **antes** de bajar 2.1 GB. Era el
argumento más fuerte de `ADR-001` y es una pérdida real.

En su lugar: telemetría con `getSystemResources()` en `perf/logger.ts`, y el
dato de que el aparato de la demo (iPhone 17 Pro Max) carga MedPsy Q8_0 en CPU
(TTFT 2915 ms). Los modos de producto son el picker
`local-wifi` / `local-offline` / `nodo-offline` de [`ADR-006`](ADR-006-tres-modos-segun-el-telefono.md),
no un auto-selector por RAM.

## Por qué no mover ahora, aunque quisiéramos

`ADR-001` listó en sus propias consecuencias que mover obliga a reinstalar y a
volver a correr `expo prebuild`, lo que regenera el bundle. Y en su "Orden de
trabajo" puso la secuencia correcta:

> 1. Correr el smoke test tal como está, en 0.18.2. Coste cero, ya está compilado.
> 2. Con esa base buena, mover a 0.19 y repetir el smoke test.

**El paso 1 ya ocurrió, y en otro aparato:** MedPsy carga en un iPhone 17 Pro
Max con build local de Xcode (TTFT 2915 ms, CPU, Q8_0). El Xiaomi 14T Pro se
abandonó porque Bare aborta en `libbare-kit.so` al arrancar el worklet.

Eso refuerza la decisión en vez de debilitarla: el único build que funciona hoy
está compilado contra 0.18.2, y es local, no de EAS. Mover a 0.19 obliga a
regenerar el proyecto nativo y a recompilar por Xcode, sin garantía de volver al
mismo estado. A esta altura del calendario eso no se paga.

## El contraargumento, y la respuesta

`ADR-001` advirtió que el jurado técnico de Tether sabe que quitaron `delegate`
en 0.19 y puede preguntar por qué estamos en una versión superada.

La respuesta honesta: nos quedamos en 0.18.2 porque **ya está prebuildeada y
medida en el iPhone**, trae `ocr()`, y mover a 0.19 regenera nativo sin tiempo
de revalidar. El camino de demo es **HTTP** (banco / pueblo `/inferir`), no
QVAC `delegate` ni Hyperswarm — README y VIDEO lo dicen así. `delegate` queda
como capacidad latente del SDK, no como promesa de la demo.

## Consecuencias

- `docs/BRIEF.md` ya decía 0.18.2. Queda coherente sin tocarlo.
- `ADR-001` queda **reemplazada**. Su archivo se conserva: la decisión era
  razonable con lo que se sabía, y el registro de por qué cambió vale más que
  borrarla.
- `C13` (el README declara modelo, cuantización y versión) se cierra con 0.18.2,
  que es lo instalado. Antes había contradicción entre BRIEF y ADR-001, y `C13`
  es de los criterios que descalifican.

## Pendiente de verificar

Que `delegate` funcione de verdad. Sin eso, este ADR se apoya en una promesa de
la documentación.

**Gotcha encontrado antes de intentarlo:** el ejemplo `composite.js` que trae el
SDK **no corre tal cual**. Hace `spawn('bun', ['run', 'provider.ts'])`, pero en
`dist/examples/delegated-inference/` solo hay `provider.js` y `provider.d.ts`;
el `.ts` no viene en el paquete. (`bun` sí está instalado en el Mac, así que el
fallo va a ser "archivo no encontrado", no "comando no encontrado".) Para
probarlo hay que lanzar `node provider.js` y leerle la clave pública de stdout,
que es lo único que `composite.js` hace de especial.

Se prueba en cuanto el entrenamiento del LoRA suelte la máquina. Si `delegate`
tampoco atraviesa el NAT, este ADR sigue en pie por los otros dos motivos
(`ocr()` y no romper el prebuild), pero el argumento del bonus P2P se cae y hay
que decirlo.
