# Contexto del proyecto

- Producto: **Ina Igar** ("Camino de la medicina" en gunagaya). Hackathon ISD Summit 2026 (Panamá). Alerta de salud local + crédito con docs leídos en dispositivo; HTTP al banco o al pueblo / cola SQLite. Ver `docs/BRIEF.md`.
- Propósito: ranking general + retos Tether Psy / Caja de Ahorros.
- Usuarios: rural Panamá, Android gama media (brief). Demo: **iPhone 17 Pro Max**.
- Equipo: @0xj4an y Artur (@ArturVargas).
- Repo: https://github.com/0xj4an/Hackathon-ISD-2026. Node ≥ 22.17, `@qvac/sdk` **0.18.2**. Producto: `mobile/` (+ `mobile/src/core/`), `nodo/`, `landing/`, `eval/`, `data/`. Spikes: `spikes/lora-medpsy/` (delegate stubs ≠ demo).
- Demo: iPhone físico. Xiaomi 14T aborta Bare.
- Datos: solo sintéticos. Modelos QVAC en `~/.qvac/models`.
- Cierre: `references/hackathon.md`.

## Restricciones no negociables

1. Inferencia solo en dispositivo o nodo local (`/inferir`). Sin proveedores de IA remotos. Hyperswarm / `delegate` ≠ demo.
2. Nube solo no-IA; app útil sin ella.
3. README declara base preexistente (solo plantilla AI Engineering Kit). No expandir sin acuerdo.
4. Entregables: repo + video ≤ 5 min español, sin login.
5. Tether Psy: MIT, perf log, nombres honestos, disclaimers.
6. Sin credenciales / PII / datos reales en el repo.

## Rúbrica

Technical 35% · Innovation 25% · Impact 20% · Design 10% · Completion 10%.

## Reglas de uso

**Orden ops:** `docs/README.md` → `docs/ESTADO.md` → `docs/BRIEF.md` →
`docs/CHECKLIST.md` → ADRs. Evidencia: `docs/PRUEBA-*`.

Referencias: `hackathon.md`, `retos.md`, `qvac.md` (contrastar con
docs.qvac.tether.io; marcas **NO VERIFICADO**), `baseline.md` (**HISTÓRICO**).

Histórico (no ops): `runs/mvp-hackathon/02-stack-y-plan.md`,
`03-specification.md`. Decisiones abiertas vivas: solo `docs/CHECKLIST.md`.

Ante discrepancia: **código** + `docs/ESTADO.md` + ADR vigente.
