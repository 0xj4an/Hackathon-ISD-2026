# Spikes (experimentos de validación, no producto)

Código propio del equipo, escrito dentro de la ventana del hackathon.

## `lora-medpsy/`

Entrena un adaptador LoRA sobre `HEALTHCARE_1_7B_MEDICAL_Q8_0` y mide si mejora
frente al modelo base sobre un set de evaluación apartado.

**Por qué ese modelo.** Es el único del catálogo con cuantización entrenable.
`finetune()` solo acepta `qwen3`, `gemma3` o `bitnet` en F32, F16, Q4_0, Q8_0,
TQ1_0 o TQ2_0, y los `QWEN3_*_INST` vienen en Q4_K_M. Ver `ADR-002`.

**Qué entrena.** Dataset mixto de 300 ejemplos sintéticos con el peso en
extracción de documentos, no solo en triaje. El razonamiento está en `ADR-003`:
la extracción es donde un JSON mal formado rompe el flujo, sus datos de
entrenamiento son sintéticos y gratis en vez de criterios clínicos inventados, y
medirla produce de paso el set de evaluación que el reto Tether Psy exige.

Los rangos de laboratorio salen de `mobile/src/core/marcadores.ts`, la misma tabla que
valida la app. `CD4` queda fuera del dataset: su siguiente paso menciona VIH y
el brief lo prohíbe en la demo pública.

### Cómo repetirlo

```bash
cd spikes
npm install
node lora-medpsy/make-dataset.mjs   # genera train.jsonl y eval.jsonl
caffeinate -i node lora-medpsy/spike.mjs
```

`EPOCHS=1 node lora-medpsy/spike.mjs` para una corrida corta.

El generador usa **semilla fija**, así que el dataset es idéntico en cada
corrida y los números son comparables. `train.jsonl` y `eval.jsonl` están
versionados para que se puedan inspeccionar sin ejecutar nada.

`caffeinate -i` no es opcional en el Mac: si la máquina se duerme a mitad, el
entrenamiento se alarga sin avisar y los tiempos medidos dejan de servir.

### Qué mide

Sobre los 30 casos de `eval.jsonl`, que **no** se usan para entrenar:

- **% de JSON válido**: cuántas respuestas parsean tras pasar por `limpiarJson()`.
- **% de campos correctos**: de los campos esperados, cuántos coinciden exactos.

La segunda métrica es la que importa. El modelo base produce JSON válido casi
siempre y aun así se equivoca en más de la mitad de los campos: el problema no
es el formato, es el contenido.

### Resultados

En [`lora-medpsy/RESULTADOS.md`](lora-medpsy/RESULTADOS.md): tres corridas
documentadas. La 3 alinea la tarea de laboratorio con la app (JSON válido de
lab 5% → 68%). Los números crudos de la última corrida quedan en
`lora-medpsy/out/resultados.json` (no versionado). El adaptador de la corrida 3
vive en el producto como `mobile/assets/models/lora-lab-v3.gguf` (solo vía B).

## Qué no está versionado

- `node_modules/`: 5.7 GB, lo reconstruye `npm install`.
- `lora-medpsy/out/`: el adaptador `.gguf` y los checkpoints, los regenera el spike.
