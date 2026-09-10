# Architecture Decision Records

Cada ADR conserva una decisión difícil de revertir, las alternativas y la
condición que justificaría reabrirla. Estas seis son las decisiones del MVP que
**no se vuelven a discutir**. Si alguien quiere reabrir una, la sección
"Reabrir si" dice bajo qué condición, y esa condición es evidencia, no opinión.

| ADR | Decisión |
| --- | --- |
| [ADR-001](ADR-001-fijar-sdk-0.19.md) | `@qvac/sdk` 0.19, versión exacta, sin `delegate` |
| [ADR-002](ADR-002-un-modelo-base-medpsy-q8.md) | Un solo modelo base, MedPsy 1.7B Q8_0 |
| [ADR-003](ADR-003-lora-entrena-extraccion.md) | El LoRA entrena extracción, no solo triaje |
| [ADR-004](ADR-004-core-dentro-de-mobile.md) | `core/` dentro de `mobile/src/`, sin monorepo |
| [ADR-005](ADR-005-las-reglas-deciden-el-modelo-explica.md) | Las reglas deciden, el modelo explica |
| [ADR-006](ADR-006-tres-modos-segun-el-telefono.md) | Tres modos según la RAM del teléfono |
| [ADR-008](ADR-008-que-variables-vigilamos.md) | Qué variables vigilamos y con qué umbrales |

Las decisiones que siguen **abiertas** no están aquí: viven en la tabla
"Decisiones abiertas" de `../runs/mvp-hackathon/03-specification.md` y se
cierran con una medición, no con una discusión.
