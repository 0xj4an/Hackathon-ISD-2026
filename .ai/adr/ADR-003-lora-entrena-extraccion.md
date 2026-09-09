# ADR-003: El adaptador LoRA entrena extracción de documentos, no solo triaje

- Estado: aceptada
- Fecha: 2026-09-09
- Contexto: el spike del 8 al 9 de septiembre
  (`spikes/lora-medpsy/RESULTADOS.md`) entrenó un adaptador para el **triaje de
  salud**: 52 ejemplos, 3 épocas, ~28 min por época en el Mac, adaptador de
  34 MB, resultado base 1/3 -> LoRA 2/3 JSON parseables. El pipeline funciona de
  punta a punta; el riesgo técnico del LoRA está cerrado.

  La pregunta no es si el LoRA funciona, sino a qué apuntarlo.

## Decisión

El adaptador se entrena con un dataset mixto de ~300 ejemplos, con el peso en
**extracción de documentos** (cédula e ingresos) y el resto en triaje. Se reusa
`spikes/lora-medpsy/make-dataset.mjs` para la parte de triaje.

## Alternativas consideradas

- **Seguir solo con triaje**, como el spike. Es lo ya hecho, coste cero. Pero
  entrena la parte del flujo donde un fallo es cosmético.
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
