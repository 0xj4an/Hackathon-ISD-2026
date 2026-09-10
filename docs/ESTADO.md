# Estado del proyecto · 10 sep 2026 (tarde)

Auditoría contra código en `main` (`b5d69d6` y siguientes) y corridas del
iPhone el mismo día. Ante duda: manda el código y este archivo; el
[`CHECKLIST.md`](CHECKLIST.md) detalla ítems abiertos.

## Una frase

**Ina Igar** detecta riesgo de salud en el teléfono, lee documentos sin subir
fotos, y manda el crédito al banco por HTTPS o, sin internet, al **nodo del
pueblo** por LAN. El pueblo reenvía al banco en Railway. MedPsy es local;
si no carga, solo texto a `/inferir`.

## Qué ya está medido

| Pieza | Estado | Evidencia |
|---|---|---|
| Dominio (señales, scorecard, eval) | Hecho | `eval/run.mjs`, `eval/resultados.md` |
| Flujo móvil completo en código | Hecho | `App.tsx`: entrada → salud → alerta → docs → cuota → banco → firma → desembolso |
| Banco remoto (Railway) | Vivo + persistente | `https://banco-production-3755.up.railway.app` · Volume `/data` · `STATE_DIR=/data` |
| Admin del banco | Hecho | Landing: timestamp + canal (`directo` / `pueblo`) por solicitud |
| Pueblo LAN `:8788` | Vivo en laptop | `npm run corregimiento` · Bonjour `_inaigar-pueblo._tcp` · `/salud` con `servicio: inaigar-pueblo` |
| Teléfono → pueblo → banco | **Medido 10 sep** | Logs: `192.168.0.17` POST monto 90, 812, 920 → **aprobada** |
| Descubrimiento de IP del pueblo | Hecho | App barre la LAN / Metro; no hay IP hardcodeada. Demo: **Buscar WiFi** |
| Cola offline SQLite | Hecho en código | `cola.ts` / `colaSqlite.ts` |
| Firma + desembolso simulado | Hecho | `PantallaFirma`, `PantallaDesembolso` |
| Sentry | Hecho | Fallos de envío y pantallas |

## Cómo se mueve el crédito

```
local-wifi:
  teléfono ──HTTPS──► banco Railway

local-offline / nodo-offline:
  teléfono ──LAN :8788──► pueblo (laptop) ──HTTP──► banco Railway
                 ▲
                 │  la app busca sola :8788/salud (servicio inaigar-pueblo)
```

El banco **no** usa LLM: scorecard determinista (`decidir()`). Guarda
`{id}.json`, `{id}.respuesta.json` y `{id}.meta.json` (`recibida`, `canal`).

## Cómo arrancar la demo (día a día)

```bash
# 1) Pueblo en la laptop (misma WiFi que el teléfono)
cd nodo && npm install && npm run corregimiento

# 2) App en el iPhone
cd mobile && npx expo start          # o el build Release instalado
# Misma WiFi. En Entrada → Solo para demostración → Buscar WiFi / Probar.
```

Banco en producción (no hace falta levantarlo local):

- API: https://banco-production-3755.up.railway.app  
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin  
  (login `banco@gmail.com`)

## Qué falta para el cierre

1. **Video ≤ 5 min** ([`VIDEO.md`](VIDEO.md)) — ensayo completo grabado.
2. **OCR / documentos en iPhone** — hubo `invalid input` temprano; hay atajo
   demo en documentos; falta corrida limpia documentada.
3. **`perf/perf.jsonl` exportado** del iPhone (Tether Psy).
4. **EAS iOS** con `expo-network` en el binario nativo si el Release viejo
   no lo trae (el error `Cannot find native module 'ExpoNetwork'`). Metro /
   builds que ya cargan el módulo funcionan; el barrido LAN también usa la
   IP de Metro aunque el nativo falle al pedir la IP del teléfono.
5. Ensayo **tres veces seguidas** en avión / sin wifi (cola → reintento).

## Archivos clave

| Ruta | Rol |
|---|---|
| `mobile/App.tsx` | Navegación del camino demo |
| `mobile/src/envio.ts` | Banco → pueblo |
| `mobile/src/nodoUrl.ts` | URL del pueblo + descubrimiento LAN |
| `mobile/src/lectura.ts` / `PantallaDocumentos.tsx` | Docs + atajo demo |
| `nodo/index.mjs` | Pueblo / banco HTTP |
| `landing/admin.html` | Back office |
| `docs/PRUEBA-NODO.md` | Cómo medir A/B |
| `docs/PRUEBA-TELEFONO.md` | Corridas en aparato |
| `docs/CHECKLIST.md` | Ítems abiertos/cerrados |

## Honestidad

- Hyperswarm P2P **no** conecta; no se promete.
- QVAC `delegate` **no** es el plan de demo.
- Firma = trazo; desembolso = simulado.
- Datos 100% sintéticos.
