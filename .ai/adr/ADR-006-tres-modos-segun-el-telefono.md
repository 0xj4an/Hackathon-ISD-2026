# ADR-006: Tres modos de demo (wifi × dónde corre el modelo)

- Estado: aceptada (reescrita 10 sep 2026 para coincidir con el código)
- Contexto: la demo corre en un **iPhone 17 Pro Max** (MedPsy Q8_0, CPU). Se
  intentó el Xiaomi 14T Pro y Bare aborta. El usuario del brief sigue siendo
  rural con Android de gama media. Hace falta mostrar, en el mismo build, tres
  caminos honestos de **red × cómputo** sin mentir sobre Q4 automático ni sobre
  QVAC `delegate`.

  Una versión anterior de este ADR hablaba de modos **Completo / Ligero /
  Delegado** elegidos con `getSystemResources()` y MedPsy Q4_0. Eso **no se
  implementó**. Queda como aspiración en "Reabrir si".

## Decisión

La persona elige el modo en `PantallaEntrada` (`mobile/src/modo.ts`). No hay
detección automática de RAM al arrancar. `getSystemResources()` solo se usa en
`mobile/src/perf/logger.ts` para telemetría.

| Modo | Inferencia | Envío del crédito |
| --- | --- | --- |
| **`local-wifi`** | MedPsy en el teléfono; si falla, texto a `/inferir` | Primero banco remoto (Railway); si no, pueblo / cola |
| **`local-offline`** | MedPsy en el teléfono; si falla, texto a `/inferir` | Sin Railway: LAN al pueblo o cola SQLite |
| **`nodo-offline`** | Sin MedPsy local: OCR aquí, texto al pueblo (`/inferir`) | Igual que offline: pueblo o cola |

En los tres modos las fotos no salen del teléfono. A `/inferir` y a
`/solicitud` viaja **texto/JSON**, nunca imagen. QVAC `delegate` y Hyperswarm
**no** son el camino de la demo (HTTP).

El hardware de grabación es siempre MedPsy **Q8_0** en el iPhone. El modo no
cambia la cuantización; cambia si el LLM corre aquí o en el nodo, y si el JSON
sale a Railway.

## Alternativas consideradas

- **Auto-modo por RAM (Q8 / Q4 / nodo).** Mejor para el brief de gama media, pero
  exige constante Q4_0 entrenable, segundo LoRA eventual y wiring que no
  llegó a tiempo. Queda en "Reabrir si".
- **Solo `local-wifi`.** Más simple; no muestra el caso sin internet ni el
  pueblo prestando cómputo.
- **QVAC `delegate`.** No atraviesa NAT de forma fiable en nuestras pruebas;
  el README no lo promete (`ADR-013`, CHECKLIST 1.3).

## Consecuencias

- README, BRIEF y CHECKLIST hablan de `local-wifi` / `local-offline` /
  `nodo-offline`, no de Completo/Ligero/Delegado.
- El pitch honesto: **demo en iPhone Q8**; el brief de Android gama media sigue
  abierto vía modo `nodo-offline` (OCR local + LLM en el pueblo).
- `npm run corregimiento` puede intentar Hyperswarm salvo `SKIP_P2P=1`; Railway
  ya lo salta. El teléfono no usa Hyperswarm.

## Reabrir si

Existe constante **Q4_0** entrenable de MedPsy 1.7B y se mide que cabe en
Android de gama media, o QVAC documenta un selector de fit fiable. Entonces se
puede reintroducir detección por `getSystemResources()` / `assessModelFit()`
sin romper el picker de demo.
