# ADR-007: Mover a `@qvac/sdk` 0.19, no necesitamos `delegate`

- Estado: aceptada. **Reemplaza a [ADR-001](ADR-001-fijar-sdk-0.18.2.md)**
- Fecha: 2026-09-09
- Contexto: `ADR-001` fijó 0.18.2 por una sola razón: conservar la delegación P2P
  nativa (`startQVACProvider`, `delegate`), que 0.19 eliminó. Nunca se comprobó
  si de verdad la necesitábamos. Al revisarlo, no.

## La pregunta real: ¿para qué queríamos `delegate`?

Para los tres usos del nodo del corregimiento. Ninguno lo necesita.

| Uso del nodo | ¿Necesita `delegate`? | Cómo se hace sin él |
| --- | --- | --- |
| **1. Repartir el modelo** | No | El nodo sirve el `.gguf` por HTTP en la LAN. `downloadAsset()` y `loadModel()` aceptan "an HTTP URL or a local file path" (docs vigentes). Sin internet, solo wifi local |
| **2. Prestar el cerebro** | No | `qvac serve --openai --host 0.0.0.0 --api-key`. Los docs lo llaman textualmente *"the documented pattern for multi-device inference scenarios"* y dicen que permite *"one device to run inference on behalf of another"* |
| **3. Guardar y entregar** | No | `nodo/index.mjs` usa Hyperswarm directo. Nunca tocó la delegación del SDK |

## Decisión

Mover a **0.19**. Y el motivo no es solo que `delegate` sobre: es que 0.19 trae
algo que necesitamos.

**`assessModelFit()`** devuelve un veredicto (`likely-fits`, `likely-too-large`,
`unknown`) sobre si un modelo cabe, **antes de descargarlo**. Es exactamente la
pregunta que `ADR-006` tiene que responder para elegir entre modo completo,
ligero y delegado. Sin ella estaríamos inventando un umbral de RAM a ojo con
`getSystemResources()`, y peor: descubriríamos que no cabe **después** de bajar
2.1 GB.

## Alternativas consideradas

- **Quedarse en 0.18.2** (lo que decía `ADR-001`). Conserva `delegate`, que no
  usamos, a cambio de: programar contra una API cuya página de docs fue retirada,
  perder `assessModelFit()`, y tener que explicarle al jurado técnico de Tether
  por qué el proyecto está clavado en una versión superada. Ese jurado sabe
  perfectamente qué quitaron y cuándo.
- **0.19 y reimplementar delegación nativa por nuestra cuenta.** Absurdo: `qvac
  serve` ya es la vía soportada y documentada.

## Consecuencias

- Hay que reinstalar y volver a correr `expo prebuild`, lo que regenera el
  bundle de 9.5 MB. **Riesgo de secuencia, ver abajo.**
- Los nombres de los plugins pueden haber cambiado entre versiones. Verificar
  `qvac.config.json` contra la versión nueva.
- Se gana: docs vigentes, `assessModelFit()`, verificación de checksum en
  descargas de HF, Parakeet Unified, tensor split y flash attention.
- El modo delegado de `ADR-006` pasa a implementarse con `qvac serve`, que es
  más simple de depurar que la delegación nativa y no depende de una API sin
  documentación.

## Secuencia obligatoria (esto importa más que la decisión)

`mobile/` ya está instalado y prebuildeado en 0.18.2, y **el smoke test nunca ha
corrido en un teléfono**. Cambiar de versión antes de la primera corrida exitosa
mezcla dos incógnitas: si falla, no sabremos si fue el teléfono, Expo o la
versión.

1. **Correr el smoke test tal como está, en 0.18.2.** Coste cero, ya está
   compilado. Cierra las incógnitas D1, D2 y D3 del bloque 0.
2. **Con esa base buena, mover a 0.19** y repetir el smoke test.
3. Si 0.19 rompe algo, se vuelve a 0.18.2, que sigue siendo un estado conocido
   y funcionando.

Son ~30 minutos de más y compran la capacidad de saber qué se rompió.

## Una pregunta que queda abierta

Los docs vigentes de `models/download-lifecycle` describen **solo HTTP**: no
mencionan Hyperdrive, Hyperswarm ni distribución P2P de modelos. No está claro
si esa distribución desapareció con el provider mode o si simplemente ya no está
documentada.

**No nos bloquea**, porque el uso 1 funciona sirviendo el `.gguf` por HTTP en la
LAN, que además es más simple. Pero conviene saberlo: si la distribución P2P
nativa sigue viva, es mejor pitch para el criterio de Pears. Diez minutos de
prueba lo resuelven.

Y ojo: aunque se sirva el modelo por HTTP local, **el criterio de P2P se sigue
cumpliendo de verdad** porque el transporte de solicitudes de `nodo/` usa
Hyperswarm real.

## Reabrir si

El smoke test pasa en 0.18.2 y falla en 0.19 por algo que no se resuelva en
media hora. En ese caso se vuelve a 0.18.2 y se implementa el modo delegado con
`qvac serve` igual, que funciona en ambas versiones.
