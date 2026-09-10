# Architecture Decision Records

Cada ADR conserva una decisión difícil de revertir, las alternativas y la
condición que justificaría reabrirla. Estas son las decisiones del MVP que
**no se vuelven a discutir**. Si alguien quiere reabrir una, la sección
"Reabrir si" dice bajo qué condición, y esa condición es evidencia, no opinión.

| ADR | Decisión |
| --- | --- |
| [ADR-001](ADR-001-fijar-sdk-0.19.md) | ~~`@qvac/sdk` 0.19, versión exacta, sin `delegate` ~~ reemplazada por ADR-013 |
| [ADR-002](ADR-002-un-modelo-base-medpsy-q8.md) | Un solo modelo base, MedPsy 1.7B Q8_0 |
| [ADR-003](ADR-003-lora-entrena-extraccion.md) | El LoRA entrena extracción, no solo triaje |
| [ADR-004](ADR-004-core-dentro-de-mobile.md) | `core/` dentro de `mobile/src/`, sin monorepo |
| [ADR-005](ADR-005-las-reglas-deciden-el-modelo-explica.md) | Las reglas deciden, el modelo explica |
| [ADR-006](ADR-006-tres-modos-segun-el-telefono.md) | Tres modos según la RAM del teléfono |
| [ADR-007](ADR-007-descarga-medpsy-no-bloquea-onboarding.md) | La descarga de MedPsy no bloquea el onboarding |
| [ADR-008](ADR-008-que-variables-vigilamos.md) | Qué variables vigilamos y con qué umbrales |
| [ADR-009](ADR-009-medpsy-infiere-en-ingles.md) | MedPsy infiere en inglés |
| [ADR-010](ADR-010-el-paquete-y-cuando-ofrecer-credito.md) | El paquete completo a un año, y el crédito siempre |
| [ADR-011](ADR-011-el-modelo-de-credito.md) | El modelo de crédito deja de ser de juguete |
| [ADR-012](ADR-012-senaletica-y-el-modo-denso.md) | La dirección visual es Señalética, con un modo denso |
| [ADR-013](ADR-013-quedarnos-en-sdk-0.18.2.md) | Quedarnos en `@qvac/sdk` 0.18.2 (reemplaza a ADR-001) |

Las decisiones que siguen **abiertas** no están aquí: viven en la tabla
"Decisiones abiertas" de `../runs/mvp-hackathon/03-specification.md` y se
cierran con una medición, no con una discusión.
