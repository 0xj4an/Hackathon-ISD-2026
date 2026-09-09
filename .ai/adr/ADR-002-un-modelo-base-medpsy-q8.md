# ADR-002: Un solo modelo base, MedPsy 1.7B Q8_0

- Estado: aceptada, **matizada por [ADR-006](ADR-006-tres-modos-segun-el-telefono.md)**
- Fecha: 2026-09-09
- Contexto: el flujo necesita dos capacidades de LLM (redactar la alerta de salud
  y extraer campos de documentos a JSON) más OCR. La tentación es un modelo por
  tarea. En un teléfono eso multiplica memoria y descargas.

  Además hay una restricción dura: `finetune()` solo acepta arquitecturas
  `qwen3`, `gemma3` o `bitnet` en `F32, F16, Q4_0, Q8_0, TQ1_0, TQ2_0`
  (confirmado en docs el 9 sep). Textual: *"not every model constant is
  fine-tunable: for example, many Qwen3-4B/8B constants are `Q4_K_M`"*. En el
  catálogo, **`HEALTHCARE_1_7B_MEDICAL_Q8_0` es el único modelo entrenable** que
  sirve para esto.

> **Matiz del 9 sep 15:35.** Esta decisión se validó contra el teléfono de la
> demo (12 GB de RAM), no contra el "Android de gama media" que el brief define
> como usuario. [ADR-006](ADR-006-tres-modos-segun-el-telefono.md) mantiene un
> solo modelo base pero admite **dos cuantizaciones** (Q8_0 y Q4_0, ambas
> entrenables) y un tercer modo delegado. Lo esencial de este ADR sigue en pie:
> un solo modelo base, un solo adaptador, y MedPsy porque es lo único entrenable
> del catálogo.

## Decisión

Un solo modelo cargado: `HEALTHCARE_1_7B_MEDICAL_Q8_0` (MedPsy 1.7B, Q8_0,
2.1 GB), más un adaptador LoRA de ~34 MB que cubre las dos tareas de texto
(`ADR-003`). OCR va aparte con `OCR_LATIN`, que es un motor distinto y chico.

## Alternativas consideradas

- **MedPsy para salud + Qwen3 4B para extracción.** Es lo que sugiere el gotcha
  12 de `references/qvac.md` (*"1B alucina en extracción; usar >= 4B"*). Pero son
  ~4.6 GB de pesos en el teléfono, dos descargas, y el 4B en Q4_K_M **no es
  entrenable**, así que se pierde el LoRA.
- **Solo Qwen3 1.7B Q4 para todo.** Más liviano, pero Q4_K_M tampoco es
  entrenable y el modelo no aporta nada al requisito de Tether Psy de tener un
  Psy con función central.
- **Bajar MedPsy a una cuantización menor** para ahorrar RAM. Sale del conjunto
  entrenable y mata el LoRA.

## Consecuencias

- MedPsy queda con función central en **las dos mitades** del flujo, que es
  exactamente lo que pide el reto Tether Psy.
- Un modelo más un adaptador de 34 MB, en vez de dos modelos. Menos memoria,
  una sola descarga, un solo `loadModel`.
- **Estamos usando un modelo médico como base para leer cédulas.** Es una
  elección forzada por la cuantización, no por el dominio. Va declarado tal cual
  en el README: el jurado de Tether conoce su catálogo y lo va a notar.
- El gotcha 12 queda sin resolver por fuerza bruta. Se resuelve con el LoRA
  (`ADR-003`), y si el LoRA no alcanza, la extracción es lo primero que se
  degrada.

## Reabrir si

El eval del bloque 4 muestra que ni con adaptador el 1.7B llega a un umbral
usable de extracción. En ese caso se añade un segundo modelo mayor solo para
extracción, se acepta el coste de memoria y el LoRA se queda únicamente en el
triaje. El Xiaomi 14T Pro tiene 12 GB, así que cargar dos modelos es viable
aunque no sea deseable.
