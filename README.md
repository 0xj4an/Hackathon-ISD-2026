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

Hardware de referencia: (modelo de Android, RAM, SoC - completar). Log de rendimiento: [`perf/`](perf/).

## Cómo correrlo
(completar: requisitos, `npm install`, `expo prebuild`, `expo run:android --device`, nodo, datos sintéticos)

## Evaluación reproducible
(completar: `eval/` con set de casos y script; % JSON válido, % campos correctos)

## Seguridad y límites
- No es un diagnóstico. La alerta es orientativa y lo dice en pantalla. Validación de rangos y consistencia antes de invocar el modelo.
- El banco recibe solo campos estructurados; nunca imágenes, ni el motivo de salud.
- El modelo de crédito del nodo "banco" es de juguete, para demostrar el flujo. La firma en pantalla no es firma electrónica legal.
- Datos: 100% sintéticos. Ningún dato real de clientes ni de pacientes.

## Base preexistente (declaración obligatoria)

El cronómetro arrancó el 9 de septiembre a las 08:00 (Panamá) y el primer commit
de este repositorio es de ese mismo día a las 11:00. El código de producto de
`core/`, `nodo/` y `mobile/` se escribió dentro de las 48 horas. El andamiaje de

y `mobile/qvac/worker.bundle.js` lo produce `expo prebuild`: no lo escribimos
nosotros. Lo único anterior al cronómetro:

- **Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit)** (ago 2026), de la que se generó el repo: `standards/`, `templates/`, la estructura de `.ai/` y `docs/ai-engineering-kit.md`. Documentación, no código de producto.

Los cuatro scripts de validación que el equipo traía del curso Dojo Coding
"Local AI with QVAC" se retiraron del repo. La tabla de marcadores y rangos que
usaba uno de ellos se reescribió como código propio en `core/marcadores.ts`.

## Contexto compartido del equipo
- `docs/BRIEF.md`: qué construimos, flujo, arquitectura, plan por horas.
- `.ai/`: contexto estable (reglas del hackathon, los 5 retos, referencia del SDK QVAC, línea base) y decisiones.
- `spikes/RESULTADOS.md`: qué midió el spike de LoRA y qué dejó para el producto.
- `docs/Reglas_Decentralized_AI_Hackathon.pdf`: reglamento oficial.

## Licencia
MIT. Ver [LICENSE](LICENSE).
