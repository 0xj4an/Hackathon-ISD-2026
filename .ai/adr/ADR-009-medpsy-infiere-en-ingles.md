# ADR-009: MedPsy infiere en inglés

- Estado: aceptada
- Contexto: en el smoke de iOS la descarga llegó a 10%. El 1.7B MedPsy Q8_0
  está entrenado sobre corpus clínico mayoritariamente en inglés. Pedirle
  español fluido (ADR-005, brief) produce texto peor o inventado, que es justo
  lo que las reglas ya evitan en la decisión clínica.

  El video del jurado sigue siendo en español (reglamento). Eso es narración,
  no la salida del modelo.

  El número 008 ya lo ocupó “qué variables vigilamos”.

## Decisión

Prompts, `completion` y JSON de MedPsy van en **inglés**. La UI de la app y el
video pueden seguir en español. El README lo declara: modelo en inglés, producto
explicado en español.

No usamos TranslatePsy para “traducir al final”: está fuera de alcance y
añadiría otro modelo.

## Consecuencias

- `core/prompts.ts` y el smoke pasan a inglés.
- `AlertaSchema.mensaje` es texto para la persona, sin exigir español.
- C1 se verifica con texto en inglés, no en español.

## Reabrir si

Un eval en el teléfono muestra que el mismo prompt en español parsea mejor
(JSON válido + campos) que en inglés, sobre el mismo set.
