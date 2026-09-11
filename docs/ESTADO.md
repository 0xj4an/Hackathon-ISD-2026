# Estado del proyecto · 11 sep 2026 (00:10)

Ante duda: **código** + este archivo. Índice: [`README.md`](README.md).
Tres caminos: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).

## En una frase

Release **`1.0.5+2`**. Esta noche: iPhone `192.168.0.17` → pueblo `:8788` →
**crédito aprobado** (`POST /solicitud` monto 920). Sentry: `credito: ok via
pueblo`, `alerta: ok`, `lectura: ok`, `inferencia: extraccion @p2p-delegate`.
LoRA `lab-v3` se nombra en carga, resultados y consola. Falta ensayos ×3 +
`perf.jsonl` + video.

## Qué ya está medido

| Pieza | Estado |
|---|---|
| Dominio + eval | Hecho |
| Flujo app en código | Hecho |
| Teléfono → pueblo → Railway | Medido (9–11 sep). Esta noche: `e72785e4…` aprobada |
| Discovery LAN | Hecho (`/salud` desde `192.168.0.17`) |
| OCR documentos en iPhone | Medido 3/3; `galloc` intermitente (última 01:50) |
| Banco directo (`local-wifi`) | Medido 10 sep (`credito: ok via banco`) |
| Pueblo LAN (`credito: ok via pueblo`) | Medido 10 y **11 sep 00:05** |
| Inferencia `nodo-offline` | Sentry: `extraccion @p2p-delegate` (72 eventos) |
| LoRA `lab-v3` | Asset + UI (carga y resultados). Sentry `lora: lab-v3 cache/copy` |
| Consola teléfono + laptop `/consola` | Código: cinta de modo, consola negra, LoRA chip |
| Sentry | Viva. SoT: [`SENTRY.md`](SENTRY.md) |

## Sentry · últimas 24 h (11 sep 00:10)

Info (corridas): `alerta: ok` · `lectura: ok` · `credito: ok via pueblo` ·
`inferencia: extraccion @p2p-delegate` · `sesion: start` · `modelo: medpsy load` ·
`lora: lab-v3`.

Riesgo (no nuevos esta hora): **Watchdog RAM** (10, última 04:43) · OCR
`galloc` (28, 01:50) · `INFERENCE_CANCELLED` · `MODEL_UNLOAD_FAILED` (1).

## Qué falta — este orden

| # | Qué | Cierre |
|---|---|---|
| **1** | Ensayo completo × 3 (avión / los tres caminos) | [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) |
| **2** | Exportar `perf.jsonl` | Entrada → Registro → compartir |
| **3** | Grabar video ≤ 5 min | [`VIDEO.md`](VIDEO.md) + [consola](http://127.0.0.1:8788/consola) |
| **4** | Rebuild nativo si el IPA no trae LoRA/cinta | [`SENTRY.md`](SENTRY.md) § Rebuild |

```bash
cd nodo && npm run corregimiento
# Consola: http://127.0.0.1:8788/consola
cd spikes && npm run proveedor    # par P2P; POST /p2p si reinicias el pueblo
cd mobile && npx expo start       # o run:ios Release si el binario está viejo
```

- Pueblo LAN: `192.168.0.19:8788` (esta laptop). Teléfono visto: `192.168.0.17`
- Banco: https://banco-production-3755.up.railway.app
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin
- Sentry: https://0xj4an.sentry.io/projects/isd-hackathon-mobile/

**Crédito** = HTTP (banco o pueblo). **Inferencia** `nodo-offline` = QVAC
`delegate`, plano B `POST /inferir`. Hyperswarm **topic** (nodo↔nodo) off
salvo `ENABLE_P2P=1`. Firma = trazo. Datos sintéticos.

## Honestidad de build

Si Sentry dice `release 1.0.5+2` pero `app_version` nativo es `1.0.4` /
`HackathonISD`, el **JS es nuevo** y el **IPA no**. Icono/splash/LoRA empaquetado
solo con borrar app + `expo run:ios --configuration Release`. Detalle: [`SENTRY.md`](SENTRY.md).
