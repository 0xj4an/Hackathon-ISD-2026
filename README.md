# Ina Igar · IA local para salud y crédito donde no llega la señal

> Decentralized AI Hackathon · ISD Summit 2026 · Panamá. Equipo: 0xj4an y Artur.
> Retos: General · Tether QVAC Psy · Caja de Ahorros.

App Expo para zonas rurales de Panamá: alerta de salud en el teléfono, crédito
con documentos leídos **sin que las fotos salgan del dispositivo**. Dos
tuberías: **inferencia** (MedPsy / LoRA) y **solicitud** (JSON). Demo en
**iPhone 17 Pro Max**, `@qvac/sdk` **0.18.2**. Nunca un proveedor de IA remoto.

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

## Tres caminos ([`ADR-006`](.ai/adr/ADR-006-tres-modos-segun-el-telefono.md))

Dos ejes: **WiFi al banco** × **capacidad del teléfono**. OCR siempre aquí.

| Modo | Inferencia | Solicitud |
|---|---|---|
| `local-wifi` | MedPsy + LoRA en el teléfono | HTTPS al banco (luego pueblo si hace falta) |
| `local-offline` | MedPsy + LoRA en el teléfono | Pueblo / cola |
| `nodo-offline` | Este teléfono no puede correr el modelo: se **delega al nodo** (`delegate`, si no `POST /inferir`) | Pueblo / cola |

`nodo-offline` **simula** un teléfono sin capacidad. El iPhone de demo sí puede
cargar MedPsy; la UI no dice que se fuerza. Hyperswarm por topic (nodo↔nodo)
sigue apagado salvo `ENABLE_P2P=1`. Cada pantalla lleva la cinta de modo
(los mismos letreros de Entrada) y una consola negra; la laptop espeja en
[http://127.0.0.1:8788/consola](http://127.0.0.1:8788/consola).

## El nombre

**Ina Igar** = "Camino de la medicina" en gunagaya (*Gayamar sabga*, Orán / Wagua).

## Base preexistente (obligatoria)

Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit)
(ago 2026): `standards/`, `templates/`, `.ai/`, y el README del kit en
[`docs/_archive/ai-engineering-kit.md`](docs/_archive/ai-engineering-kit.md).
Septiembre en `docs/superpowers/` es nuestro.

## Docs del equipo

Ver [`docs/README.md`](docs/README.md): ESTADO, CHECKLIST, BRIEF, PRUEBA-*, ADRs.

## Licencia

MIT. Ver [LICENSE](LICENSE).
