# Línea base del proyecto

> **HISTÓRICO / parcial.** Snapshot temprano del scaffold. **No uses este
> archivo como estado actual.** Verdad viva: [`docs/ESTADO.md`](../../docs/ESTADO.md),
> ADRs (sobre todo `ADR-004`, `ADR-006`, `ADR-013`) y el código.
> Lo que sigue se conserva como evidencia de cómo empezamos y de mediciones
> tempranas de transporte (HTTP LAN OK; Hyperswarm no).

## Estado actual (reescribir siempre desde ESTADO)

Repo generado a partir de la plantilla AI Engineering Kit
(ArturVargas/AI_Engineering_Kit). Producto: **Ina Igar** — ver `docs/BRIEF.md`.

Layout real (2026-09-10):

- `mobile/` — Expo + `@qvac/sdk` **0.18.2** + `mobile/src/core/` (schemas, reglas, crédito).
- `nodo/` — HTTP pueblo `:8788` / banco; demo = HTTP. P2P **opt-in** (`ENABLE_P2P=1`).
- `landing/` — sitio + admin del banco.
- Motor de crédito: `mobile/src/core/credito/`; `nodo/credito.mjs` solo importa.
- LoRA lab: asset `mobile/assets/models/lora-lab-v3.gguf` + spike
  `spikes/lora-medpsy/RESULTADOS.md` (en código; corrida iPhone pendiente de anotar).

## Arquitectura y despliegue

Ver `docs/ESTADO.md` y `docs/BRIEF.md`. Banco en Railway; pueblo en laptop LAN.
La app descubre el pueblo con sweep HTTP a `:8788/salud` (`inaigar-pueblo`).
Bonjour lo anuncia el nodo; la app **no** lo consume aún.

## Dependencias e integraciones

- `@qvac/sdk` 0.18.2 (`ADR-013`; `ADR-001` / 0.19 reemplazada).
- Móvil: Expo ≥ 54 con `@qvac/sdk/expo-plugin`, `react-native-bare-kit`, `bare-rpc`.

## Lo que ya está probado (notas tempranas + curso)

- Entorno: `qvac doctor` en Mac.
- Chat offline con otros modelos en `../qvac-course/` (fuera de este repo).
- HTTP LAN del nodo: medido (ver `docs/PRUEBA-NODO.md`).
- Hyperswarm entre dos procesos del mismo Mac: **no conecta** (NAT / firewalled).
  **No es el camino de la demo** (`ADR` / CHECKLIST §1.3). No reabrir como plan.
- QVAC `delegate`: no es el camino de la demo. D10 solo si alguien mide P2P a propósito.
- Fine tuning LoRA MedPsy: spike reproducible en `spikes/lora-medpsy/`; adaptador
  `lab-v3` empaquetado en la app.

## Riesgos y deuda conocida

- Teléfono gama media: memoria; salida de demo es HTTP al pueblo, no nube de IA.
- Móvil solo en dispositivo físico.
- Cualquier `fetch` a proveedor de IA externo descalifica.

## Próxima iniciativa

Ops del cierre: `docs/ESTADO.md` y `docs/CHECKLIST.md` (video, OCR iPhone, perf).

## Transporte del nodo: lo medido (9–10 sep)

**HTTP en la LAN: funciona.** Pueblo reenvía al banco Railway. Teléfono → pueblo
medido el 10 sep (ver `docs/PRUEBA-TELEFONO.md`).

**Hyperswarm: no es demo.** Off por defecto (`ENABLE_P2P` debe ser `1`).
Railway / Dockerfile dejan P2P apagado.

Decirle al jurado "los aparatos se hablan en la red local" (HTTP) es exacto;
decirle "Hyperswarm P2P" cuando salió por HTTP no lo sería.
