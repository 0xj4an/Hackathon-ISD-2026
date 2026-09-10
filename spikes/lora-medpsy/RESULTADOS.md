# LoRA sobre MedPsy: qué medimos y qué aprendimos

Cierra `C11` (tabla base contra LoRA sobre el mismo set) y responde a lo que el
reto Tether Psy llama "calidad de dominio medible" y "evidencia reproducible".

**Todo lo de aquí está corrido, no estimado.** Los resultados negativos se
conservan: son la mitad de lo que se aprendió.

## Cómo reproducirlo

```bash
node lora-medpsy/make-dataset.mjs   # determinista por semilla
node lora-medpsy/spike.mjs          # mide base, entrena, vuelve a medir
```

El set de evaluación **no se usa para entrenar**: sale del mismo generador pero
queda apartado, con corte estratificado (20% de cada tarea) y sin duplicados
entre los dos lados. Verificado.

---

## Corrida 1: la tasa de aprendizaje destruyó el modelo

`learningRate: 2e-4`, 2 épocas, 4320 pasos sobre 270 ejemplos. 5h56m.

| Tarea | JSON válido base | JSON válido LoRA |
| --- | --- | --- |
| extracción | 100% | **0%** |
| triaje | 91% | **0%** |

Pidiéndole leer una cédula, el adaptador escribía:

```
":"--------------------------------------------------------":"":"-------
```

**Diagnóstico.** La pérdida arrancó en 0.199 y en vez de bajar **subió** hasta
1.19 dentro de la primera época; la segunda corrió por encima de la primera.
Eso es el modelo degradándose, no aprendiendo. `checkpointSaveDir` quedó vacío,
así que no hubo punto intermedio que rescatar.

Detalle: **se perdieron casi 2 horas dormido**. Entre el lote 1320 y el 1360
pasaron 7000 segundos contra los 120 normales. `caffeinate -i` evita el sueño
por inactividad, no el de cerrar la tapa.

## Corrida 2: no destruyó nada, pero tampoco sirvió

`learningRate: 2e-5`, 1 época. La pérdida bajó de 1.856 a 0.084 sin un solo
repunte, y la validación cerró en **0.047**, por debajo de la de entrenamiento:
aprendió el patrón, no los ejemplos.

Y aun así el adaptador **empeoró el resultado**:

| Tarea | Campos base | Campos LoRA |
| --- | --- | --- |
| cédula | 70% | 67% |
| ingresos | **89%** | **70%** |
| extracto | 97% | 97% |
| triaje | 50% | 51% |
| **total** | **71%** | **66%** |

Lo único que ganó fue la validez del JSON en triaje, de 80% a 100%.

## Los dos defectos que ocultaban todo

Antes de sacar conclusiones de la corrida 2 hubo que arreglar el puntuador, que
estaba midiendo mal y castigaba por igual al base y al adaptador.

**1. `confianza` era imposible de acertar.** El valor esperado lo genera
`make-dataset.mjs` como `0.95 - capas*0.18 + azar*0.05`. Ese término aleatorio
**no está en el texto de entrada**: le pedíamos al modelo adivinar un número que
inventamos nosotros. Es 1 de cada 5 campos, o sea que regalábamos el 20% de la
nota en cada caso. Se sigue pidiendo en el JSON porque la app lo usa, pero no se
puntúa.

**2. Un número escrito como texto contaba como fallo.** El modelo devuelve
`"620.00"` donde se espera `620`. El valor es correcto y el esquema de la app ya
coacciona el tipo. Medirlo como error confunde un defecto de formato con uno de
lectura, que es justo lo que el LoRA debería arreglar.

Con el puntuador arreglado, el modelo base pasó de un aparente 58% a **71%** de
campos. Estábamos entrenando a ciegas.

## El hallazgo de fondo: entrenábamos la tarea equivocada

Con la medición ya limpia, la pregunta cambió: ¿dónde está el hueco real?

- Extracto **97%**, ingresos **89%**, cédula **70%**. La extracción ya funciona.
- Triaje **50%**, y el LoRA solo lo movía un punto.

Al inspeccionar los fallos de triaje, ninguno era de lectura. El modelo acertaba
marcador, valor y unidad **siempre**. Lo que no coincidía era `rango`, `hallazgo`
y `siguiente_paso`, porque usaba sus propios rangos de referencia y sus propias
palabras:

```
ESPERADO  rango "0.4-4"     hallazgo "dentro de rango"
OBTENIDO  rango "0.5-5.0"   hallazgo "Normal"
```

Y ahí estaba el error de diseño. El prompt real de la app
(`SYSTEM_EXTRACCION_LABORATORIO`) dice textualmente:

> *"nunca digas si un valor está alto o bajo: eso se decide en otra parte"*

Porque lo decide `clasificar()` contra el catálogo con umbrales citados
(`ADR-005`). **80 de 300 ejemplos, un tercio del dataset, le enseñaban al modelo
justo la conducta que la app le prohíbe.** Aprendió a clasificar, que no sirve, y
de paso se llevó por delante la extracción de ingresos, que sí funcionaba.

Eso explica la corrida 2 entera: no fue un problema de hiperparámetros.

## Corrida 3: la tarea alineada con la app

La tarea de laboratorio se reescribió para pedir lo que la app pide de verdad:
un arreglo `lecturas` con código, nombre, valor y unidad, más la fecha. Sin
rango, sin hallazgo, sin siguiente paso. Y la entrada pasó de una línea suelta a
un informe con 2 a 5 marcadores, que es como llega el papel que la persona
fotografía.

También se arregló el puntuador para el arreglo: se compara **marcador por
marcador**, emparejando por código. Compararlo como texto sería todo o nada, y
un marcador mal haría fallar los cinco.

La medición base con la tarea corregida dejó al descubierto el hueco de verdad:

| Tarea | JSON válido base | Campos base |
| --- | --- | --- |
| cédula | 100% | 65% |
| ingresos | 100% | 86% |
| extracto | 100% | 97% |
| **laboratorio** | **5%** (1 de 22) | 67% |

**El modelo base solo produce JSON parseable para un informe de laboratorio 1 de
cada 22 veces.** En la app eso es una pantalla vacía el 95% del tiempo.

Ese es el hueco que el LoRA tiene que cerrar, y es la primera vez que lo vemos,
porque hasta ahora se medía con el prompt equivocado.

**Pregunta abierta:** todavía no sabemos *por qué* falla. No es truncamiento: con
`predict: 512` y una salida máxima de 135 tokens sobra sitio. Se inspecciona
cuando termine el entrenamiento, para no cargar una segunda copia del modelo de
2.1 GB mientras entrena.

*(Resultado de la corrida 3: pendiente.)*

---

## Lo que queda dicho, salga como salga

- **El adaptador de la corrida 2 no se lleva a la app.** Cambia un problema por
  otro: arregla el parseo del triaje y estropea la lectura de ingresos, que es el
  documento del que depende el monto del crédito.
- **`ADR-003` decidió que el LoRA entrenara extracción.** La medición dice que la
  extracción no lo necesita (86% a 97%) y que el hueco está en laboratorio. Ese
  ADR hay que revisarlo con estos números.
- **Medir mal cuesta más que entrenar mal.** Dos defectos del puntuador
  escondieron 13 puntos del modelo base y nos habrían hecho gastar horas
  optimizando algo que ya funcionaba.
