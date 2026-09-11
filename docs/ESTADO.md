# Estado del proyecto · 10 sep 2026 (noche)

Ante duda: **código** + este archivo. Índice: [`README.md`](README.md).

## En una frase

Código, banco/pueblo y **OCR en iPhone** listos. Falta ensayos ×3, `perf.jsonl`
y el **video**.

## Qué ya está medido

| Pieza | Estado |
|---|---|
| Dominio + eval | Hecho |
| Flujo app en código | Hecho |
| Teléfono → pueblo → Railway | Medido |
| Discovery LAN | Hecho |
| **OCR documentos en iPhone** | **Medido 10 sep** — [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) |
| Sentry · telemetría runtime | Por corrida: `sesion:`, `modelo:`, `lora:`, `inferencia:`, `lectura:`, `alerta:`, `credito:`, `nodo:`. Tags: `modo`, `lora`, `task`, `device`. Sin texto/fotos. |

## Qué falta — este orden

| # | Qué | Cierre |
|---|---|---|
| **1** | Ensayo completo × 3 (avión / offline si puedes) | Tres corridas en PRUEBA-TELEFONO |
| **2** | Exportar `perf.jsonl` | Entrada → Registro → compartir |
| **3** | Grabar video ≤ 5 min | [`VIDEO.md`](VIDEO.md) |
| **4** | (Opcional) Railway directo `local-wifi` | Una línea en PRUEBA-TELEFONO |

```bash
cd nodo && npm run corregimiento
cd mobile && npx expo start
```

- Banco: https://banco-production-3755.up.railway.app  
- Admin: https://isd-hackathon-landing-production.up.railway.app/admin  

Demo = HTTP. No Hyperswarm/`delegate`. Firma = trazo. Datos sintéticos.
