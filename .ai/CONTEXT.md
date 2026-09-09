# Contexto del proyecto

- Producto: proyecto para el Decentralized AI Hackathon · ISD Summit 2026 (Panamá). Nombre del equipo en Dojo: TBD-Panama. Idea final (9 sep): alerta de salud local + crédito de salud con documentos leídos en el dispositivo y envío offline/P2P al banco. Ver `docs/BRIEF.md` y `runs/2026-09-09-mvp-hackathon/01-idea-validation.md`.
- Propósito: ganar el ranking general ("Sovereign Intelligence at the Edge", podio 6,000 USDT) y encajar en uno o dos retos corporativos (1,500 USDT c/u). Un mismo proyecto puede optar a varios.
- Usuarios principales: personas en zonas rurales de Panamá con Android de gama media y conectividad intermitente (retos General + Tether Psy + Caja de Ahorros).
- Equipo: @0xj4an y Artur (@ArturVargas). Máximo 4, composición cerrada desde el 9 sep 08:00.
- Repositorio y comandos relevantes: https://github.com/0xj4an/Hackathon-ISD-2026. Runtime Node ≥ 22.17 con `@qvac/sdk` (0.18.2 probado). `npx qvac doctor` valida el entorno. Código de producto en `mobile/` (Expo), `core/`, `nodo/`. Evidencia de validación en `spikes/` (solo `RESULTADOS.md`).
- Entornos: desarrollo en MacBook Pro M5 Pro 48 GB (Metal). Demo objetivo: laptop + teléfono físico (Android 12+ / iOS 17+, los emuladores no sirven). Sin navegador como target.
- Fuente de verdad de datos: sin datasets reales. Solo datos sintéticos o públicos (obligatorio en banca y salud). Modelos desde el registry de QVAC, cacheados en `~/.qvac/models`.
- Fecha límite: viernes 11 sep 2026, 08:00 hora Panamá (UTC-5). Sin prórroga. Entregar con margen.

## Restricciones no negociables

1. Toda inferencia corre en el dispositivo o delegada por P2P con QVAC. Ninguna llamada a OpenAI, Anthropic, Google, etc. en ningún flujo, ni para features menores. Descalifica.
2. Nube permitida solo para lo no-IA (UI, backend, auth, sync opcional) y la app debe seguir siendo útil sin ella.
3. Declarar en el README toda base preexistente (plantillas, librerías, boilerplate, este kit). Omitirla descalifica.
4. Entregables: repo accesible al jurado + video ≤ 5 min en español, enlace sin login.
5. Si se opta al reto Tether Psy: licencia open source permisiva, log de rendimiento estructurado (carga, prompts, tokens, TTFT, throughput), nombres honestos de modelo/cuantización/hardware, disclaimers médicos.
6. Sin credenciales, tokens, PII ni datos reales de clientes en el repo ni en estos artefactos.

## Rúbrica (guía de prioridades)

Technical 35% · Innovation 25% · Impact 20% · Design 10% · Completion 10%. Desempate: Technical, luego Impact. Sin demo funcional no hay puntaje: Completion es la puerta de entrada.

## Reglas de uso

Lee solo las referencias y artefactos declarados por la etapa actual. No supongas requisitos que no estén confirmados. Referencias estables en `references/`: `hackathon.md` (reglas, evaluación, fechas), `retos.md` (los 5 tracks), `qvac.md` (SDK, capacidades, limitaciones) y `baseline.md` (lo que ya está probado).

**Antes de planificar contra un dato de `references/qvac.md`, contrástalo con
`docs.qvac.tether.io`.** Ese archivo mezcla docs, CHANGELOG y notas propias, y el
9 sep se detectó al menos una afirmación que no existe en los docs (una supuesta
cuota de caché de 512 MiB en React Native) que llegó a cambiar el plan. Las
afirmaciones sin corroborar están marcadas **NO VERIFICADO** en ese archivo.

Artefactos de la iniciativa en curso, en orden de lectura:

1. `runs/2026-09-09-mvp-hackathon/01-idea-validation.md`: por qué esta idea.
2. `runs/2026-09-09-mvp-hackathon/03-specification.md`: **qué se construye**,
   alcance, criterios de aceptación, casos límite, reparto y decisiones abiertas.
3. `runs/2026-09-09-mvp-hackathon/02-stack-y-plan.md`: **cómo**, stack, plan por
   bloques hasta el viernes, e integración del LoRA.
4. `adr/`: las 5 decisiones que no se reabren sin la evidencia que cada ADR
   especifica.

`docs/BRIEF.md` es el resumen para el equipo; ante una discrepancia, mandan la
especificación y los ADR.
