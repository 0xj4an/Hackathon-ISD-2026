# Ina Igar · IA local para salud y crédito donde no llega la señal

> Decentralized AI Hackathon · ISD Summit 2026 · Panamá. Equipo: 0xj4an y Artur.
> Retos: General · Tether QVAC Psy · Caja de Ahorros.

App Expo para zonas rurales de Panamá: alerta de salud en el teléfono, crédito
con documentos leídos **sin que las fotos salgan del dispositivo**. El JSON va
al banco (HTTPS) o al nodo del pueblo (LAN). Inferencia: MedPsy local
(`@qvac/sdk` **0.18.2**); si no carga, texto a `/inferir`. Demo en
**iPhone 17 Pro Max**. Hyperswarm / QVAC `delegate` no son el camino de la demo.

**Estado vivo (medido, URLs, qué falta):** [`docs/ESTADO.md`](docs/ESTADO.md).  
**Mapa de docs:** [`docs/README.md`](docs/README.md).

## Modelos (nombres honestos)

| Uso | Modelo | Cuantización | Tamaño |
|---|---|---|---|
| Alerta / extracción docs | MedPsy 1.7B (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) | Q8_0 | 2.1 GB |
| OCR | `OCR_LATIN` | - | - |
| Lab (examen) | MedPsy + LoRA `lab-v3` | Q8_0 + LoRA | +33 MB |

Hardware demo: iPhone 17 Pro Max, iOS 26.6.1, CPU (TTFT 2915 ms, 9 sep). Xiaomi
14T Pro aborta Bare; no es el aparato de grabación. Log: [`perf/`](perf/).

## Cómo correrlo

Node ≥ 22.17, iPhone físico. `npx qvac doctor`.

```bash
cd mobile && npm install && npx expo start
cd nodo && npm install && npm run corregimiento   # misma WiFi; la app descubre sola
```

URLs de banco/admin y detalle de discovery: [`docs/ESTADO.md`](docs/ESTADO.md).
Primera vez: descarga MedPsy (~2.1 GB) con wifi, no delante del jurado.

## Evaluación

```bash
node eval/run.mjs
node --test eval/credito/*.test.mjs
node --test eval/salud/alerta.test.mjs eval/nodo/inferir.test.mjs
```

LoRA spike: [`spikes/lora-medpsy/`](spikes/lora-medpsy/).

## Seguridad y límites

- No es diagnóstico. Banco: solo JSON de crédito; nunca fotos ni motivo de salud.
- Crédito: scorecard determinista ([`ADR-011`](.ai/adr/ADR-011-el-modelo-de-credito.md)).
- Firma = trazo; desembolso simulado. Datos 100% sintéticos.

## Modos de demo ([`ADR-006`](.ai/adr/ADR-006-tres-modos-segun-el-telefono.md))

| Modo | Modelo | Crédito |
|---|---|---|
| `local-wifi` | MedPsy en el teléfono | Banco remoto primero (luego pueblo si hace falta) |
| `local-offline` | MedPsy en el teléfono | Pueblo / cola (el pueblo puede reenviar a Railway) |
| `nodo-offline` | Texto a `/inferir` | Pueblo / cola |

## El nombre

**Ina Igar** = "Camino de la medicina" en gunagaya (*Gayamar sabga*, Orán / Wagua).

## Base preexistente (obligatoria)

Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit)
(ago 2026): `standards/`, `templates/`, superpowers de agosto, `.ai/`,
`docs/ai-engineering-kit.md`. Septiembre en `docs/superpowers/` es nuestro.

## Docs del equipo

Ver [`docs/README.md`](docs/README.md): ESTADO, CHECKLIST, BRIEF, PRUEBA-*, ADRs.

## Licencia

MIT. Ver [LICENSE](LICENSE).
