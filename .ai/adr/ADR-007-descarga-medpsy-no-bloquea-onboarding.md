# ADR-007: La app es usable sin MedPsy en RAM (carga perezosa)

- Estado: aceptada en lo esencial; **boot `downloadAsset` no implementado**
  (actualizado 10 sep 2026)
- Contexto: MedPsy 1.7B Q8_0 pesa **2.1 GB**. Si la primera pantalla espera a
  `loadModel`, el usuario ve un splash de minutos. QVAC en background llama
  `suspend()` y pausa descargas.

## Decisión (lo que corre hoy)

La app es usable **sin MedPsy en RAM**. Las reglas, el historial, la cola y el
crédito no dependen del LLM.

| Qué | Cuándo corre (código actual) |
| --- | --- |
| Perfil, historial, reglas, cola SQLite, fotos, OCR | Siempre (`App.tsx` no espera al modelo) |
| `downloadAsset` + `loadModel` | **Lazy**, dentro de `asegurarMedPsy()` en la primera inferencia (alerta, docs o lab) |
| Tras usar | `soltarMedPsy` / `unloadModel` suelta RAM (alerta, docs, lab) |
| `nodo-offline` o fallo local | Texto a `/inferir`; la UI sigue con fallback de reglas si aplica |
| Barra global al arranque / `getModelInfo` en boot | **No implementado** |

No metemos los 2.1 GB en el APK. No hay segundo modelo “rápido” (`ADR-002`).
La primera corrida con wifi descarga al caché de QVAC; hacerlo **antes** de la
demo, no delante del jurado (README).

## Qué quedó fuera (aspiración del ADR original)

1. Proveedor de arranque: `getModelInfo` → `downloadAsset` en paralelo al
   onboarding con barra global cada 1%.
2. Mantener el modelo caliente en RAM durante toda la sesión de demo.

CHECKLIST 1.1 lo marca abierto con honestidad. No reabrir el ADR solo por eso.

## Alternativas consideradas

- **Splash hasta 100%.** Simple y pésima UX.
- **GGUF en el binario.** Choca con tamaño de tienda y con “la inteligencia
  llega al pueblo”.
- **Background fetch.** El worklet no sigue descargando suspendido.

## Reabrir si

QVAC documenta descarga que sobrevive `suspend()`, o hace falta warm-load
medido para el video (TTFT / UX). Entonces se implementa el boot download sin
cambiar la regla “usable sin MedPsy en RAM”.
