# Estado del proyecto · 10 sep 2026 (noche)

Ante duda: **código** + este archivo. Índice: [`README.md`](README.md).

## En una frase

Código y banco/pueblo **listos**. Falta evidencia en el iPhone y el **video**.

## Qué ya está (no lo vuelvas a “arreglar”)

- Dominio + eval verdes
- Flujo app completo en código
- Teléfono → pueblo → Railway **medido**
- Discovery LAN sin IP fija
- Landing/admin con canal + timestamp
- Docs organizados

## Qué falta (solo esto) — hazlo en este orden

| # | Qué | Quién | Cómo saber que cerró |
|---|---|---|---|
| **1** | OCR limpio en iPhone (cédula / ingresos / extracto) | Tú + teléfono | Una corrida nueva arriba en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) sin `invalid input` |
| **2** | Ensayo completo × 3 (mejor en avión / `local-offline`) | Tú | Tres corridas anotadas; cola si no hay nodo |
| **3** | Exportar `perf.jsonl` | Tú | Entrada → Registro → compartir archivo; guardar fuera del teléfono |
| **4** | Grabar video ≤ 5 min | Tú | Guion [`VIDEO.md`](VIDEO.md); enlace sin login |
| **5** | (Opcional) `local-wifi` directo a Railway | Tú | Una línea en PRUEBA-TELEFONO |

Si el Release falla con `ExpoNetwork`: `cd mobile && npx expo run:ios --device` (app 1.0.4).

## Arranque demo hoy

```bash
cd nodo && npm run corregimiento          # misma WiFi que el iPhone
cd mobile && npx expo start               # o Release instalado
# Entrada → Buscar WiFi → flujo
# Perf: Entrada → Registro → compartir perf.jsonl
```

- Banco: https://banco-production-3755.up.railway.app  
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin  

## Honestidad

Demo = HTTP. No Hyperswarm / `delegate`. Firma = trazo. Desembolso = simulado.
Datos sintéticos. Detalle: [`PRUEBA-NODO.md`](PRUEBA-NODO.md), [`VIDEO.md`](VIDEO.md).
