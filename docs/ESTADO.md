# Estado del proyecto · 10 sep 2026 (noche tarde)

Ante duda: **código** + este archivo. Índice: [`README.md`](README.md).

## En una frase

Release **`1.0.5+2`**: wifi → banco **y** pueblo OK, lectura docs **3/3**, LoRA
lab visto. Sentry también marcó **Watchdog RAM**, OCR `galloc` y `alerta: fail`
(parse). Mitigaciones en código listo para reload; falta ensayos limpios + video.

## Qué ya está medido

| Pieza | Estado |
|---|---|
| Dominio + eval | Hecho |
| Flujo app en código | Hecho |
| Teléfono → pueblo → Railway | Medido |
| Discovery LAN | Hecho |
| **OCR documentos en iPhone** | **Medido** — 3/3 ok en una corrida; `galloc` sigue intermitente |
| **Banco directo (`local-wifi`)** | **Medido** — `credito: ok via banco` |
| **Pueblo LAN (`credito: ok via pueblo`)** | **Medido** misma noche |
| Sentry · telemetría | Viva en `1.0.5+2`. SoT: [`SENTRY.md`](SENTRY.md) |
| Pantallas envío (wifi/offline) | Código + breadcrumbs Sentry |
| Arranque loading ≥1.8 s | Medido |
| Consola demo app + laptop `/consola` | Código (espejo cel → pueblo) |

## Qué falta — este orden

| # | Qué | Cierre |
|---|---|---|
| **1** | Reload/rebuild con mitigaciones (alerta/OCR/mutex/background) | Ver `alerta: ok` y menos Watchdog en Sentry |
| **2** | Ensayo completo × 3 (avión / offline si puedes) | Tres corridas en PRUEBA-TELEFONO |
| **3** | Exportar `perf.jsonl` | Entrada → Registro → compartir |
| **4** | Grabar video ≤ 5 min | [`VIDEO.md`](VIDEO.md) + consola laptop |
| **5** | (Opcional) Reinstall nativo limpio si el icono sigue viejo | [`SENTRY.md`](SENTRY.md) § Rebuild |

```bash
cd nodo && npm run corregimiento
# Consola grabación: http://127.0.0.1:8788/consola
cd mobile && npx expo run:ios --device --configuration Release
```

- Banco: https://banco-production-3755.up.railway.app  
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin  
- Sentry: https://0xj4an.sentry.io/projects/isd-hackathon-mobile/

Demo = HTTP. No Hyperswarm/`delegate`. Firma = trazo. Datos sintéticos.

## Honestidad de build

Si Sentry dice `release 1.0.5+2` pero `app_version` nativo es `1.0.4` /
`HackathonISD`, el **JS es nuevo** y el **IPA no**. Icono/splash solo con
borrar app + `expo run:ios --configuration Release`. Detalle: [`SENTRY.md`](SENTRY.md).
