# Estado del proyecto · 10 sep 2026 (noche)

Ante duda: **código** + este archivo. Índice: [`README.md`](README.md).

## En una frase

Release **`1.0.5+2`** en Sentry: wifi → banco OK, lectura docs OK, telemetría
viva. Falta ensayos ×3 limpios, `perf.jsonl` exportado y el **video**. OCR aún
falla en algunas fotos (grafo/RAM).

## Qué ya está medido

| Pieza | Estado |
|---|---|
| Dominio + eval | Hecho |
| Flujo app en código | Hecho |
| Teléfono → pueblo → Railway | Medido |
| Discovery LAN | Hecho |
| **OCR documentos en iPhone** | **Medido 10 sep** — [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md); aún hay fallos intermitentes `galloc` |
| **Banco directo (`local-wifi`)** | **Medido en Sentry 10 sep noche** — `credito: ok via banco` |
| Sentry · telemetría | Viva en `1.0.5+2`. SoT: [`SENTRY.md`](SENTRY.md) |
| Pantallas envío (wifi/offline) | Código en `main`; wifi medido vía breadcrumbs Sentry |
| Arranque loading ≥1.8 s | Medido (delta breadcrumbs `main` → `sesion`) |

## Qué falta — este orden

| # | Qué | Cierre |
|---|---|---|
| **1** | Ensayo completo × 3 (avión / offline si puedes) | Tres corridas en PRUEBA-TELEFONO |
| **2** | Exportar `perf.jsonl` | Entrada → Registro → compartir |
| **3** | Grabar video ≤ 5 min | [`VIDEO.md`](VIDEO.md) |
| **4** | (Opcional) Reinstall nativo limpio si el icono sigue viejo | [`SENTRY.md`](SENTRY.md) § Rebuild |

```bash
cd nodo && npm run corregimiento
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
