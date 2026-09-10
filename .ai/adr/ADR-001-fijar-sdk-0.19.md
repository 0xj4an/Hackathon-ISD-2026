# ADR-001: `@qvac/sdk` 0.19, versión exacta, sin `delegate`

- Estado: **reemplazada por [`ADR-013`](ADR-013-quedarnos-en-sdk-0.18.2.md)**
  (2026-09-10). Nunca se aplico: los lockfiles siguen en 0.18.2. Se revirtio al
  medirse que nuestro transporte por topic no atraviesa NAT, y que `delegate`,
  lo que 0.19 elimina, es justo la via que no usa topic. Se conserva el archivo
  porque la decision era razonable con lo que se sabia entonces.
- Contexto: 0.19 es breaking respecto a 0.18. Textual del CHANGELOG: *"Provider
  mode and DHT delegation are gone. Models load and run locally only."*
  Desaparecen `startQVACProvider`, `stopQVACProvider`, la opción `delegate` de
  `loadModel`, `heartbeat`, `isDelegated`/`providerInfo` y las clases de error de
  provider. La página `/p2p-capabilities/delegated-inference` ya no existe.

## Decisión

`"@qvac/sdk": "0.19.x"` **exacto en `package.json` y en el lockfile**, sin
caret. Una versión menor de QVAC puede mover la API entera; no queremos que un
`npm install` en otra máquina traiga algo distinto a mitad de la construcción.

Y no usamos `delegate`. No hace falta.

## Por qué no hace falta `delegate`

Los tres usos del nodo del corregimiento funcionan sin él:

| Uso del nodo | Cómo se hace |
| --- | --- |
| **1. Repartir el modelo** | El nodo sirve el `.gguf` por HTTP en la LAN. `downloadAsset()` y `loadModel()` aceptan *"an HTTP URL or a local file path"*. Sin internet, solo wifi local |
| **2. Prestar el cerebro** | `qvac serve --openai --host 0.0.0.0 --api-key`. Los docs lo llaman *"the documented pattern for multi-device inference scenarios"* y dicen que permite *"one device to run inference on behalf of another"* |
| **3. Guardar y entregar** | `nodo/index.mjs` usa Hyperswarm directo, sin pasar por la delegación del SDK |

## Qué gana el proyecto con 0.19

**`assessModelFit()`** devuelve un veredicto (`likely-fits`, `likely-too-large`,
`unknown`) sobre si un modelo cabe **antes de descargarlo**. Es exactamente la
pregunta que [ADR-006](ADR-006-tres-modos-segun-el-telefono.md) tiene que
responder para elegir entre modo completo, ligero y delegado. Sin ella habría
que inventar un umbral de RAM a ojo con `getSystemResources()`, y descubrir que
no cabe **después** de bajar 2.1 GB.

Además: docs vigentes, verificación de checksum en descargas de HF, Parakeet
Unified, tensor split y flash attention.

## Alternativas consideradas

- **Quedarse en 0.18.2.** Conserva `delegate`, que no usamos, a cambio de
  programar contra una API cuya página de docs fue retirada, perder
  `assessModelFit()`, y explicarle al jurado técnico de Tether por qué el
  proyecto está clavado en una versión superada. Ese jurado sabe perfectamente
  qué quitaron.
- **Reimplementar la delegación nativa por nuestra cuenta.** Absurdo: `qvac
  serve` ya es la vía soportada y documentada.

## Consecuencias

- Reinstalar y volver a correr `expo prebuild`, lo que regenera el bundle.
- Los nombres de los plugins pueden cambiar entre versiones: verificar
  `qvac.config.json` contra la versión instalada.
- El modo delegado de `ADR-006` se implementa con `qvac serve`, más simple de
  depurar que la delegación nativa y sin depender de una API sin documentación.

## Orden de trabajo (importa más que la decisión)

`mobile/` está instalado y prebuildeado en 0.18.2 y el smoke test todavía no ha
corrido en un teléfono. Cambiar de versión antes de la primera corrida buena
mezcla dos incógnitas: si falla, no se sabe si fue el teléfono, Expo o la
versión.

1. Correr el smoke test tal como está, en 0.18.2. Coste cero, ya está compilado.
   Cierra las incógnitas D1, D2 y D3.
2. Con esa base buena, mover a 0.19 y repetir el smoke test.
3. Si 0.19 rompe algo, se vuelve a 0.18.2, que es un estado conocido y
   funcionando.

## Pregunta abierta

Los docs de `models/download-lifecycle` describen **solo HTTP**: no mencionan
Hyperdrive, Hyperswarm ni distribución P2P de modelos. No está claro si esa
distribución desapareció con el provider mode o si solo dejó de documentarse.

No bloquea: el uso 1 funciona sirviendo el `.gguf` por HTTP en la LAN. Pero si
la distribución P2P nativa sigue viva, es mejor pitch para el criterio de Pears.
Y aunque el modelo viaje por HTTP local, **el criterio de P2P se cumple igual**
porque el transporte de solicitudes de `nodo/` usa Hyperswarm real.

## Reabrir si

El smoke test pasa en 0.18.2 y falla en 0.19 por algo que no se resuelva rápido.
En ese caso se vuelve a 0.18.2 y el modo delegado se implementa con `qvac serve`
igual, que funciona en ambas versiones.
