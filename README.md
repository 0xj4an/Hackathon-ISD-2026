# Ina Igar · IA local para salud y crédito donde no llega la señal

> Decentralized AI Hackathon · ISD Summit 2026 · Panamá. Equipo: 0xj4an y Artur.
> Retos: General · Tether QVAC Psy · Caja de Ahorros.

App Expo para zonas rurales de Panamá, **sin internet**: detecta una señal de riesgo de salud, explica qué examen conviene y permite solicitar un crédito fotografiando documentos. Las fotos nunca salen del teléfono. **La demo se graba en un iPhone 17 Pro Max**; el usuario del brief es rural con Android. El Xiaomi 14T Pro se descartó porque Bare aborta al arrancar.

Toda la inferencia corre en el dispositivo con [`@qvac/sdk`](https://docs.qvac.tether.io) **0.18.2**. Ningún servicio remoto participa en la IA.

## Modelos (nombres honestos)
| Uso | Modelo | Cuantización | Tamaño |
|---|---|---|---|
| Alerta de salud en español | MedPsy 1.7B (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) | Q8_0 | 2.1 GB |
| OCR de documentos | `OCR_LATIN` | - | - |
| Extracción a JSON | (por definir: MedPsy o `QWEN3_1_7B_INST_Q4`) | | |

Hardware de **demo**: iPhone 17 Pro Max, iOS 26.6.1, MedPsy Q8_0 en CPU (TTFT 2915 ms, 9 sep 2026). El Xiaomi 14T Pro (HyperOS 3 / Android 16) aborta en `libbare-kit.so` al arrancar Bare; no es el aparato de la grabación. El usuario del brief sigue siendo rural con Android de gama media (`ADR-006`). Log: [`perf/`](perf/).

## Cómo correrlo

Requisitos: Node >= 22.17, un **iPhone físico** (la demo) o Android físico. Los
emuladores no sirven. En Android, Bare aborta hoy en HyperOS 3; no depender de
eso para el video. `npx qvac doctor` valida el entorno.

```bash
# app (demo: iPhone físico)
cd mobile && npm install && npx expo run:ios --device --configuration Release
# Android: npx expo run:android --device  — Bare aborta en el 14T; no es el camino de la demo

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
que se clasifica están en [`mobile/src/core/marcadores.ts`](mobile/src/core/marcadores.ts).

## Seguridad y límites
- No es un diagnóstico. La alerta es orientativa y lo dice en pantalla. Validación de rangos y consistencia antes de invocar el modelo.
- El banco recibe solo campos estructurados; nunca imágenes, ni el motivo de salud.
- El modelo de crédito del nodo "banco" es de juguete, para demostrar el flujo. La firma en pantalla no es firma electrónica legal.
- Datos: 100% sintéticos. Ningún dato real de clientes ni de pacientes.


## El nombre

**Ina Igar** significa "camino de la medicina" en gunagaya, la lengua del pueblo Guna de Panamá. `ina` es medicina o planta medicinal; `igar` es camino, vía, y también lección o tratado: el saber y la ruta en la misma palabra. Es exactamente lo que hace la app, porque cada detección devuelve una ruta.

Los significados salen del diccionario escolar *Gayamar sabga* (gunagaya-español) de Reuter Orán B. y Aiban Wagua, publicado por el Proyecto de Implementación de la Educación Bilingüe Intercultural en los Territorios Gunas de Panamá. No es una palabra nuestra: es prestada, y se cita.

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
