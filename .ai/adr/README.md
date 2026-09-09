# Architecture Decision Records

Cada ADR conserva una decisión difícil de revertir, las alternativas y la condición que justificaría reabrirla.

Estos cinco son las decisiones del MVP del hackathon que **no se vuelven a
discutir** durante las 48 horas. Si alguien quiere reabrir una, la sección
"Reabrir si" dice bajo qué condición, y esa condición es evidencia, no opinión.

| ADR | Decisión | Estado |
| --- | --- | --- |
| [ADR-001](ADR-001-fijar-sdk-0.18.2.md) | Fijar `@qvac/sdk` en 0.18.2 exacto | aceptada |
| [ADR-002](ADR-002-un-modelo-base-medpsy-q8.md) | Un solo modelo base, MedPsy 1.7B Q8_0 | aceptada |
| [ADR-003](ADR-003-lora-entrena-extraccion.md) | El LoRA entrena extracción, no solo triaje | aceptada |
| [ADR-004](ADR-004-core-dentro-de-mobile.md) | `core/` dentro de `mobile/src/`, sin monorepo | aceptada |
| [ADR-005](ADR-005-las-reglas-deciden-el-modelo-explica.md) | Las reglas deciden, el modelo explica | aceptada |
| [ADR-006](ADR-006-tres-modos-segun-el-telefono.md) | Tres modos según la RAM del teléfono (matiza `ADR-002`) | aceptada |

Las decisiones que siguen **abiertas** no están aquí: viven en la tabla
"Decisiones abiertas" de `../runs/2026-09-09-mvp-hackathon/03-specification.md`
y se cierran con una medición en el bloque 0.
