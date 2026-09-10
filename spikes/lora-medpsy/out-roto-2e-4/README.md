# La corrida que rompio el modelo

Evidencia, no basura. El adaptador (33 MB) se borro; queda la medicion.

**Hiperparametros:** `learningRate: 2e-4`, `numberOfEpochs: 2` (4320 pasos sobre
270 ejemplos). Corrio 5h56m.

**Resultado:**

| Tarea | JSON valido base | JSON valido LoRA | Campos base | Campos LoRA |
| --- | --- | --- | --- | --- |
| extraccion | 100% | **0%** | 45% | **0%** |
| triaje | 91% | **0%** | 47% | **0%** |

**Que escribia el adaptador**, pidiendole que leyera una cedula:

```
":"--------------------------------------------------------":"":"-------
```

**Diagnostico.** La tasa de aprendizaje era diez veces mas alta de lo que
aguanta. Se ve en el log del entrenamiento: la perdida arranco en 0.199 y en vez
de bajar **subio** hasta 1.19 dentro de la primera epoca, y la segunda corrio por
encima de la primera. Eso es el modelo degradandose mientras entrena, no
aprendiendo. `checkpointSaveDir` quedo vacio, asi que no hubo punto intermedio
que rescatar.

**Correccion:** `learningRate: 2e-5` y una sola epoca.

Se conserva porque un resultado negativo medido es un resultado, y porque
explica por que la segunda corrida usa los numeros que usa.
