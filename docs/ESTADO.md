# Estado del proyecto · 10 sep 2026 (tarde)

Auditoría contra código en `main` (`b5d69d6` / docs `6615ed6`+) y corridas del
iPhone el mismo día. Ante duda: **código** y este archivo.
Ítems abiertos: [`CHECKLIST.md`](CHECKLIST.md). Índice docs: [`README.md`](README.md).

## Una frase

**Ina Igar** detecta riesgo de salud en el teléfono, lee documentos sin subir
fotos, y manda el crédito al banco por HTTPS o, sin internet, al **nodo del
pueblo** por LAN. El pueblo reenvía al banco en Railway. MedPsy es local;
si no carga, solo texto a `/inferir`.

## Qué ya está medido

| Pieza | Estado | Evidencia |
|---|---|---|
| Dominio (señales, scorecard, eval) | Hecho | `eval/run.mjs`, `eval/resultados.md` |
| Flujo móvil en código | Hecho | `App.tsx`: entrada → salud → revisión → alerta → docs → cuota → banco → firma → desembolso |
| Banco remoto (Railway) | Vivo + persistente | `https://banco-production-3755.up.railway.app` · código usa `STATE_DIR` (Volume `/data` en Railway) |
| Admin del banco | Hecho | Landing: `recibida` + `canal` (`directo` / `pueblo`) |
| Pueblo LAN `:8788` | Vivo en laptop | `npm run corregimiento` · `/salud` `servicio: inaigar-pueblo` · Bonjour (nodo publica; app no consume) |
| Teléfono → pueblo → banco | **Medido 10 sep** | Evidencia: [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md), [`PRUEBA-NODO.md`](PRUEBA-NODO.md) |
| Descubrimiento del pueblo | Hecho | Sweep HTTP LAN / Metro (`nodoUrl.ts`); sin IP fija |
| Cola offline SQLite | Hecho en código | `cola.ts` / `colaSqlite.ts` |
| Firma + desembolso simulado | Hecho | `PantallaFirma`, `PantallaDesembolso` |
| Sentry | Hecho | Fallos de envío y pantallas |

## Cómo se mueve el crédito

```
local-wifi:
  teléfono ──HTTPS──► banco Railway
  (si no hay respuesta final → pueblo → pendiente)

local-offline / nodo-offline:
  teléfono ──LAN :8788──► pueblo ──HTTP──► banco Railway
                 ▲
                 │  app: sweep :8788/salud (no Bonjour)
```

El banco **no** usa LLM: scorecard (`decidir()` en `mobile/src/core/credito/`).
Guarda `{id}.json`, `{id}.respuesta.json`, `{id}.meta.json`.

## Cómo arrancar la demo (día a día)

```bash
cd nodo && npm install && npm run corregimiento
cd mobile && npx expo start
# Misma WiFi. Entrada → Solo para demostración → Buscar WiFi.
```

- API banco: https://banco-production-3755.up.railway.app  
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin  
  (login `banco@gmail.com`)

## Qué falta para el cierre

1. **Video ≤ 5 min** ([`VIDEO.md`](VIDEO.md)).
2. **OCR / documentos en iPhone** (corrida limpia en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md)).
3. **`perf/perf.jsonl` exportado** del iPhone.
4. Build nativo con `expo-network` si el Release viejo falla (`ExpoNetwork`).
5. Ensayo **tres veces** en avión / cola ([`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md)).

## Archivos clave

| Ruta | Rol |
|---|---|
| `mobile/App.tsx` | Navegación demo |
| `mobile/src/envio.ts` / `nodoUrl.ts` | Banco, pueblo, discovery |
| `nodo/index.mjs` | Pueblo / banco HTTP |
| `landing/admin.html` | Back office |
| `docs/PRUEBA-*` | Evidencia |
| `docs/CHECKLIST.md` | Ítems |

## Honestidad

Demo = HTTP (banco o pueblo). **No** Hyperswarm ni QVAC `delegate`
(P2P solo con `ENABLE_P2P=1`; ver [`PRUEBA-NODO.md`](PRUEBA-NODO.md)).
Firma = trazo; desembolso = simulado; datos sintéticos.
Frases a evitar en cámara: [`VIDEO.md`](VIDEO.md).

## Contraste docs ↔ código (10 sep)

| Afirmación | Veredicto | Nota |
|---|---|---|
| URLs banco / admin | true | `bancoUrl.ts`, `nodo/package.json`, `landing/server.js` |
| Sweep LAN sin IP fija | true | `nodoUrl.ts` |
| Bonjour descubre en la app | **parcial** | Nodo publica; app solo HTTP |
| Modos `local-wifi` / … | true | `modo.ts` |
| Offline = “sin Railway” | **falso** (corregido) | Teléfono no llama Railway; pueblo sí reenvía |
| Hyperswarm en `corregimiento` | **falso** (corregido) | Hace falta `ENABLE_P2P=1` |
| `SolicitudSchema.strict()` | true | `schemas.ts` + eval |
| Política en `nodo/credito.mjs` | **stale** (corregido en baseline) | Motor en `mobile/src/core/credito/` |
| Volume `STATE_DIR=/data` | **parcial** | Código sí; env Railway no está en git |
| Flujo BRIEF = App | **parcial** (corregido) | Incluye Salud + Revisión |
| LoRA en app | true en código | Medición iPhone abierta |
| SDK 0.18.2 | true | `mobile/package.json` |
