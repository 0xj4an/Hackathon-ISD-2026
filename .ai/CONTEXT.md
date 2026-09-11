# Contexto del proyecto

- Producto: **Ina Igar** ("Camino de la medicina" en gunagaya). Hackathon ISD Summit 2026 (Panamá). Alerta de salud local + crédito con docs leídos en dispositivo; HTTP al banco o al pueblo / cola SQLite. Ver `docs/BRIEF.md`.
- Propósito: ranking general + retos Tether Psy / Caja de Ahorros.
- Usuarios: rural Panamá, Android gama media (brief). Demo: **iPhone 17 Pro Max**.
- Equipo: @0xj4an y Artur (@ArturVargas).
- Repo: https://github.com/0xj4an/Hackathon-ISD-2026. Node ≥ 22.17, `@qvac/sdk` **0.18.2**. Producto: `mobile/` (+ `mobile/src/core/`), `nodo/`, `landing/`, `eval/`, `data/`. Spike LoRA: `spikes/lora-medpsy/` (el adaptador **sí** es demo). Hyperswarm **topic** (nodo↔nodo) ≠ demo. QVAC `delegate` = inferencia `nodo-offline`.
- Demo: iPhone físico. Xiaomi 14T aborta Bare.
- Datos: solo sintéticos. Modelos QVAC en `~/.qvac/models`.
- Cierre: `references/hackathon.md`.

## Restricciones no negociables

1. Inferencia solo en dispositivo o nodo local. Sin proveedores de IA remotos. Topic Hyperswarm (nodo↔nodo) ≠ demo. QVAC `delegate` es el peor caso (`nodo-offline`); plano B `POST /inferir`. Crédito = HTTP.
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

Referencias: `hackathon.md`, `retos.md`, `qvac.md` (contrastar docs oficiales;
**NO VERIFICADO**), `salud.md` (umbrales → ADR-008).

Ante discrepancia: **código** + `docs/ESTADO.md` + ADR vigente.
Decisiones abiertas vivas: solo `docs/CHECKLIST.md`.

## No leer por defecto

- `.ai/runs/mvp-hackathon/02-*`, `03-*`, `01-*` (salvo origen de idea)
- `.ai/references/baseline.md`
- `docs/_archive/**`
- `docs/superpowers/plans/*` (stubs), `docs/superpowers/*2026-08*`
- `docs/design/ina-igar-diseno-app.html`, `comparar-direcciones.html`
- `docs/intro.html`, `JOURNAL.md`
- `standards/`, `templates/` (salvo nueva iniciativa kit)
- ADR-001 (solo si debate SDK 0.19)
