# ADR-001: Fijar `@qvac/sdk` en 0.18.2 exacto

- Estado: aceptada
- Fecha: 2026-09-09
- Contexto: `@qvac/sdk` 0.19.0 salió el 7 de septiembre, dos días antes del
  hackathon, y es breaking. Textual del CHANGELOG: *"Provider mode and DHT
  delegation are gone. Models load and run locally only."* Desaparecieron
  `startQVACProvider`, `stopQVACProvider`, la opción `delegate` de `loadModel`,
  `heartbeat`, `isDelegated` y `providerInfo`. La página de docs
  `/p2p-capabilities/delegated-inference` ya no existe. El Mac tiene 0.18.2
  instalada, que es la última con provider mode.

## Decisión

`"@qvac/sdk": "0.18.2"` exacto en `package.json` **y en el lockfile**. Sin
caret. No se corre `npm update` durante el hackathon bajo ninguna circunstancia.

El lockfile arrastraba `^0.18.2` y se corrigió el 9 sep (commit `9e0e144`). Con
el caret, cualquier `npm install` en una máquina limpia habría resuelto 0.19.x y
roto la delegación sin avisar.

## Alternativas consideradas

- **0.19.0 sin delegación nativa.** Más nueva, con docs vigentes y
  `assessModelFit()`, que dice si un modelo cabe en memoria antes de bajarlo.
  Pero pierde la delegación P2P nativa, que los tres retos valoran.
- **0.19.0 con delegación a nivel de app** vía `qvac serve --openai` y un túnel
  propio. Cumple el reglamento igual, pero es transporte que hay que escribir y
  depurar con 41 horas en el reloj.

## Consecuencias

- Vamos sin docs para la parte de provider mode: la página fue retirada. La guía
  son los tipos del paquete y el CHANGELOG.
- El jurado técnico de Tether sabe que acaban de quitar la delegación. Hay que
  explicar la elección en el README, no esconderla.
- No podemos usar `assessModelFit()`, que habría respondido D1 sin instalar
  nada.
- `nodo/` usa Hyperswarm directo, no la delegación del SDK. Esa decisión reduce
  la exposición: aunque el provider mode falle, el transporte sigue en pie.

## Reabrir si

El smoke test del bloque 0 falla por algo atribuible a 0.18.2, o si la
delegación nativa resulta inservible y el transporte propio de `nodo/` ya cubre
el caso. En ese escenario 0.19.0 es estrictamente mejor y la migración cuesta
poco, porque no dependemos de las APIs eliminadas.
