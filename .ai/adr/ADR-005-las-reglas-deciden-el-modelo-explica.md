# ADR-005: Las reglas deciden la señal, el modelo solo la explica

- Estado: aceptada
- Contexto: la app detecta señales de riesgo de salud a partir de mediciones y se
  las comunica a una persona sin formación médica, en una zona sin acceso rápido
  a un profesional. Es el punto donde una alucinación hace daño de verdad.

  El spike de LoRA anterior lo vio en vivo: el modelo base **inventó rangos de
  referencia** ("plaquetas 45-60"). Un 1.7B no es una fuente de verdad clínica.
  Ese spike se retiró del repo y se rehace, pero la observación es la razón de
  ser de este ADR y no depende de volver a medirla: si el modelo puede inventar
  un rango, no puede ser quien decide.

  Además el reto Tether Psy exige explícitamente, para proyectos médicos,
  "comunicar limitaciones, sin afirmaciones clínicas no respaldadas, con medidas
  de seguridad".

## Decisión

`mobile/src/core/reglas.ts` decide, en código determinista, **qué** señal existe, **qué**
examen corresponde, **cuánto** cuesta y **qué** urgencia tiene. El LLM recibe la
señal ya decidida y solo la redacta en español sencillo.

El prompt lo dice explícito (`mobile/src/core/prompts.ts`): no diagnosticar, no nombrar
enfermedades como certeza, no dar tratamiento, máximo 3 frases. El disclaimer se
pasa como literal para que el modelo no lo reescriba.

Lo mismo aplica al crédito: `nodo/credito.mjs` decide con aritmética (cuota
máxima 30% del ingreso), no con un modelo. Y `mobile/src/core/validaciones.ts` valida el
JSON extraído en código, nunca confiando en la salida del LLM.

## Alternativas consideradas

- **Que el modelo detecte y explique.** Menos código y más "IA" en el pitch.
  Inaceptable: convierte una alucinación en un consejo de salud, y contradice de
  frente el criterio de Tether Psy.
- **Reglas más un modelo que las pueda anular.** Peor de los dos mundos:
  complejidad extra y el mismo riesgo.

## Consecuencias

- Las señales que la app detecta están limitadas a las reglas escritas: hoy
  **14 sobre 9 variables**, enumeradas con su umbral y su fuente en
  [`ADR-008`](ADR-008-que-variables-vigilamos.md). Cobertura acotada, y es
  correcto que lo sea: lo que no está en una guía publicada, no se detecta.
- Los costos y las urgencias son valores fijos en el código, no estimaciones del
  modelo. Auditables de un vistazo.
- Es un argumento fuerte ante el jurado, no una limitación que esconder: el
  sistema es explicable, y el rol del modelo es exactamente el que un modelo
  pequeño hace bien, que es redactar.
- El disclaimer va **visible en pantalla**, no solo en el README.

## Reabrir si

Nunca durante este hackathon. Fuera de él, ampliar la cobertura significa añadir
reglas revisadas por alguien con criterio clínico, no delegar la decisión al
modelo.
