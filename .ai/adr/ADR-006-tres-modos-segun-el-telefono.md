# ADR-006: Tres caminos (WiFi × capacidad del teléfono)

- Estado: aceptada (reescrita 10 sep 2026 noche: dos tuberías, `delegate` en el peor caso)
- Contexto: la demo corre en un **iPhone 17 Pro Max** (MedPsy Q8_0, CPU). El
  usuario del brief es rural con Android de gama media. En el mismo build hay
  que mostrar tres caminos honestos de **red × cómputo**.

  Una versión anterior hablaba de Completo / Ligero / Delegado con
  `getSystemResources()` y MedPsy Q4_0. Eso **no se implementó**. Queda en
  "Reabrir si".

## Decisión

La persona elige el modo en `PantallaEntrada` (`mobile/src/modo.ts`). No hay
detección automática de RAM. `getSystemResources()` solo va a telemetría.

Hay **dos tuberías**, independientes:

1. **Inferencia** (MedPsy, LoRA `lab-v3` en examen). OCR siempre en el teléfono.
2. **Solicitud de crédito** (JSON al banco o al nodo). Nunca fotos.

| Modo | WiFi al banco | Capacidad local | Inferencia | Solicitud |
| --- | --- | --- | --- | --- |
| **`local-wifi`** | sí | el teléfono corre MedPsy | MedPsy + LoRA **en el teléfono** | HTTPS al banco (si no, pueblo / cola) |
| **`local-offline`** | no | el teléfono corre MedPsy | MedPsy + LoRA **en el teléfono** | LAN al pueblo o cola |
| **`nodo-offline`** | no | este teléfono **no puede** correr el modelo | se **delega al nodo**: QVAC `delegate` (P2P); si el par no entra, `POST /inferir` | LAN al pueblo o cola |

En los tres, las fotos no salen. A `/inferir`, a `delegate` y a `/solicitud`
viaja **texto/JSON**, nunca imagen. Nunca un proveedor de IA remoto.

`nodo-offline` **simula** un teléfono sin capacidad. El iPhone de la demo sí
puede cargar MedPsy; al elegir esa ruta no se carga. La UI habla en mundo:
“este teléfono no tiene capacidad… delegando al nodo”. No dice “forzamos” ni
“el iPhone sí podría”.

Hyperswarm **por topic** (nodo↔nodo) sigue apagado salvo `ENABLE_P2P=1`. Eso no
es la vía del teléfono. La vía P2P del teléfono es QVAC `delegate`
(`dht.connect(llave)`).

El hardware de grabación es MedPsy **Q8_0**. El modo no cambia la cuantización;
cambia si el LLM corre aquí o en el nodo, y si el JSON sale a Railway.

## Alternativas consideradas

- **Auto-modo por RAM (Q8 / Q4 / nodo).** Mejor para el brief de gama media;
  exige Q4_0 entrenable y wiring que no llegó. Queda en "Reabrir si".
- **Solo `local-wifi`.** No muestra el caso sin internet ni el pueblo prestando
  cómputo.
- **Solo HTTP `/inferir` en el peor caso.** Más simple; deja fuera el P2P nativo
  del SDK. Se usa como plano B si `delegate` no entra en 90 s.

## Consecuencias

- README, BRIEF, pitch, VIDEO y CHECKLIST hablan de estos tres caminos, no de
  Completo/Ligero/Delegado ni de “demo = HTTP, sin delegate”.
- El pitch honesto: **demo en iPhone Q8**; el brief de Android gama media se
  muestra eligiendo `nodo-offline` (OCR aquí, LLM en el pueblo).
- Tarjetas de Entrada: no reescribir su copy (“Delegar al nodo”, etc.). El
  resto de pantallas de inferencia habla de capacidad y delegación.

## Reabrir si

Existe constante **Q4_0** entrenable de MedPsy 1.7B y se mide que cabe en
Android de gama media, o QVAC documenta un selector de fit fiable. Entonces se
puede reintroducir detección por `getSystemResources()` / `assessModelFit()`
sin romper el picker de demo.
