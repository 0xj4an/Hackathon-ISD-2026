# ADR-003: El adaptador LoRA entrena extracción de documentos, no solo triaje

- Estado: aceptada
- Contexto: hubo un spike de LoRA previo que entrenó un adaptador para triaje de
  salud y dio buenos indicios. **Sus scripts y sus números se retiraron del
  repo**: vivían fuera de él y sin ellos la medición no era reproducible, y el
  reto Tether Psy exige evidencia que el jurado pueda repetir.

  El spike **se rehace desde cero dentro de la ventana**, con los scripts en el
  repo. Este ADR decide a qué apuntarlo cuando se rehaga.

  > **Ojo con el orden.** Mientras el spike nuevo no corra, el pipeline de
  > `finetune()` está **sin validar en este repo**. No se puede planificar como
  > si ya funcionara.

## Decisión

El adaptador se entrena con un dataset mixto de ~300 ejemplos, con el peso en
**extracción de documentos** (cédula e ingresos) y el resto en triaje. Se reusa
`mobile/src/core/marcadores.ts` para la parte de triaje.

## Alternativas consideradas

- **Seguir solo con triaje**, como el spike anterior. Entrena la parte del flujo
  donde un fallo es cosmético, y ya no es "coste cero" porque el spike se rehace
  igual.
- **Dos adaptadores, uno por tarea.** Más limpio conceptualmente, el doble de
  entrenamiento y de gestión de archivos, sin beneficio visible en la demo.
- **No usar LoRA** y documentar el spike como experimento. Es el último escalón
  del orden de recorte, no la primera opción.

## Consecuencias

1. **Se entrena donde el fallo rompe el producto.** `CedulaSchema` tiene un regex
   estricto de cédula panameña. Si el número sale mal formateado, el flujo se
   cae. En el triaje, un texto imperfecto igual se le muestra a la persona.
2. **Los datos de entrenamiento son sintéticos y gratis.** Se genera
   `{nombre, número, fechas}` y se renderiza el "texto OCR" con ruido realista
   (confusión 0/O y 1/I, tildes perdidas, saltos de línea, encabezados de más).
   El ground truth lo controlamos. Para triaje médico habría que **inventar
   criterios clínicos**, que es justo lo que el reto Tether Psy penaliza
   ("sin afirmaciones clínicas no respaldadas").
3. **La medición es el `eval/` que falta.** Tether Psy exige "calidad de dominio
   medible" y hoy no existe la carpeta. Un trabajo, dos entregables.
4. **Ataca de frente el gotcha 12** (*"1B alucina en extracción; usar >= 4B"*).
   Que un 1.7B iguale a un 4B en **un** esquema estrecho es una afirmación
   técnica verificable, y es literalmente la tesis del reto general, "Sovereign
   Intelligence at the Edge".
5. Menos memoria que la alternativa de cargar un 4B (ver `ADR-002`).

## Reabrir si

El eval del bloque 4 muestra que el adaptador mejora el triaje pero no la
extracción, o que empeora el triaje respecto al base. En ese caso se vuelve al
adaptador solo de triaje del spike, que ya existe y ya está medido.
