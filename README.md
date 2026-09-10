# (nombre pendiente) · IA local para salud y crédito donde no llega la señal

> Decentralized AI Hackathon · ISD Summit 2026 · Panamá. Equipo: 0xj4an y Artur.
> Retos: General · Tether QVAC Psy · Caja de Ahorros.

Una app Android que, **sin internet**, detecta una señal de riesgo de salud, explica en español qué examen conviene y permite solicitar un crédito de salud fotografiando los documentos. Las fotos nunca salen del teléfono: se leen con OCR en el dispositivo, se extraen los campos a JSON, se borran, y la solicitud espera en cola hasta que hay red o un nodo P2P cerca.

Toda la inferencia corre en el dispositivo con [`@qvac/sdk`](https://docs.qvac.tether.io) **0.18.2**. Ningún servicio remoto participa en la IA.

## Modelos (nombres honestos)
| Uso | Modelo | Cuantización | Tamaño |
|---|---|---|---|
| Alerta de salud en español | MedPsy 1.7B (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) | Q8_0 | 2.1 GB |
| OCR de documentos | `OCR_LATIN` | - | - |
| Extracción a JSON | (por definir: MedPsy o `QWEN3_1_7B_INST_Q4`) | | |

Hardware de referencia: Xiaomi 14T Pro, MediaTek Dimensity 9300+, 12 GB LPDDR5X, HyperOS (Android 14). Log de rendimiento: [`perf/`](perf/).

## Cómo correrlo

Requisitos: Node >= 22.17, un Android físico con depuración USB (los emuladores
no sirven, el SDK necesita el runtime nativo) y Android SDK con `adb` en el
`PATH`. `npx qvac doctor` valida el entorno.

```bash
# app
cd mobile && npm install && npx expo prebuild && npx expo run:android --device

# nodo del corregimiento y banco mock, en dos terminales
cd nodo && npm install
npm run corregimiento
npm run banco
```

La primera ejecución descarga MedPsy 1.7B Q8_0 (2.1 GB) al caché de QVAC.
Hacerlo con wifi antes de la demo, no delante del jurado.

## Evaluación reproducible

`eval/` (pendiente) corre un set de casos sintéticos contra el flujo y reporta
% de JSON válido y % de campos correctos. Los rangos de referencia contra los
que se clasifica están en [`core/marcadores.ts`](core/marcadores.ts).

## Seguridad y límites
- No es un diagnóstico. La alerta es orientativa y lo dice en pantalla. Validación de rangos y consistencia antes de invocar el modelo.
- El banco recibe solo campos estructurados; nunca imágenes, ni el motivo de salud.
- El modelo de crédito del nodo "banco" es de juguete, para demostrar el flujo. La firma en pantalla no es firma electrónica legal.
- Datos: 100% sintéticos. Ningún dato real de clientes ni de pacientes.

## Base preexistente (declaración obligatoria)

- Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit) (ago 2026), de la que se generó el repo: `standards/`, `templates/`, `docs/superpowers/`, la estructura de `.ai/` y `docs/ai-engineering-kit.md` (su README).

## Contexto compartido del equipo
- `docs/CHECKLIST.md`: **el plan de trabajo que se sigue**, por bloques y con criterios de aceptación.
- `docs/BRIEF.md`: qué construimos, flujo y arquitectura.
- `.ai/`: contexto estable (reglas del hackathon, los 5 retos, referencia del SDK QVAC, línea base) y decisiones.
- `spikes/`: experimentos de validación con sus scripts, para que el jurado pueda repetirlos. `spikes/README.md` explica cómo.
- `docs/Reglas_Decentralized_AI_Hackathon.pdf`: reglamento oficial.

## Licencia
MIT. Ver [LICENSE](LICENSE).
