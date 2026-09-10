# Ina Igar · IA local para salud y crédito donde no llega la señal

> Decentralized AI Hackathon · ISD Summit 2026 · Panamá. Equipo: 0xj4an y Artur.
> Retos: General · Tether QVAC Psy · Caja de Ahorros.

App Expo para zonas rurales de Panamá: detecta una señal de riesgo de salud, explica qué examen conviene y permite solicitar un crédito fotografiando documentos. Las fotos nunca salen del teléfono. El JSON va al banco remoto con wifi (modo `local-wifi`) o, sin internet, por LAN al nodo del pueblo (`local-offline` / `nodo-offline`). **La demo se graba en un iPhone 17 Pro Max**; el usuario del brief es rural con Android. El Xiaomi 14T Pro se descartó porque Bare aborta al arrancar.

La inferencia intenta MedPsy en el teléfono con [`@qvac/sdk`](https://docs.qvac.tether.io) **0.18.2**. Si el modelo no carga (o modo `nodo-offline`), el **texto** (nunca la foto) va al nodo del pueblo por LAN (`/inferir`). Ningún proveedor de IA remoto. Hyperswarm P2P y QVAC `delegate` no son el camino de la demo.

## Modelos (nombres honestos)
| Uso | Modelo | Cuantización | Tamaño |
|---|---|---|---|
| Alerta de salud (mensaje MedPsy en inglés, UI en español) | MedPsy 1.7B (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) | Q8_0 | 2.1 GB |
| OCR de documentos | `OCR_LATIN` | - | - |
| Extracción a JSON (cédula, ingresos, extracto) | El mismo MedPsy 1.7B, sobre el texto de `OCR_LATIN` (`ADR-002`) | Q8_0 | 2.1 GB |
| Extracción de laboratorio (examen) | MedPsy + LoRA `lab-v3` (`mobile/assets/models/lora-lab-v3.gguf`) | Q8_0 + LoRA | 2.1 GB + 33 MB |

Hardware de **demo**: iPhone 17 Pro Max, iOS 26.6.1, MedPsy Q8_0 en CPU (TTFT 2915 ms, 9 sep 2026). El Xiaomi 14T Pro (HyperOS 3 / Android 16) aborta en `libbare-kit.so` al arrancar Bare; no es el aparato de la grabación. El usuario del brief sigue siendo rural con Android de gama media (`ADR-006`). Log: [`perf/`](perf/).

## Cómo correrlo

Requisitos: Node >= 22.17, un **iPhone físico** (la demo) o Android físico. Los
emuladores no sirven. En Android, Bare aborta hoy en HyperOS 3; no depender de
eso para el video. `npx qvac doctor` valida el entorno.

Estado actual (qué está medido, qué falta, URLs de Railway):
[`docs/ESTADO.md`](docs/ESTADO.md).

```bash
# app (demo: iPhone físico)
cd mobile && npm install && npx expo start
# Release / dispositivo: npx expo run:ios --device --configuration Release

# nodo del pueblo (misma WiFi que el teléfono; la app lo descubre sola)
cd nodo && npm install && npm run corregimiento
# Banco remoto: https://banco-production-3755.up.railway.app
# Admin: https://isd-hackathon-landing-production.up.railway.app/admin
```

La app **no usa IP fija** del pueblo: barre la LAN (y la IP de Metro si Expo
va en LAN) buscando `:8788/salud` con `servicio: inaigar-pueblo`. En Entrada →
*Solo para demostración* → **Buscar WiFi**. Cambiar de red no pide reeditar
código: laptop y teléfono en la misma WiFi, nodo corriendo.

La primera ejecución descarga MedPsy 1.7B Q8_0 (2.1 GB) al caché de QVAC.
Hacerlo con wifi antes de la demo, no delante del jurado.

## Evaluación reproducible

```bash
node eval/run.mjs                  # reglas, paquetes, crédito → eval/resultados.md
node --test eval/credito/*.test.mjs
node --test eval/salud/alerta.test.mjs eval/nodo/inferir.test.mjs
```

Eso mide el dominio (14 señales, 9 casos, contrato del banco). La calidad de
extracción OCR/LLM se mide aparte en el spike
[`spikes/lora-medpsy/`](spikes/lora-medpsy/) (`RESULTADOS.md`). Rangos de lab:
[`mobile/src/core/marcadores.ts`](mobile/src/core/marcadores.ts).

## Seguridad y límites
- No es un diagnóstico. La alerta es orientativa y lo dice en pantalla. Validación de rangos y consistencia antes de invocar el modelo.
- El banco recibe solo campos estructurados; nunca imágenes, ni el motivo de salud.
- El modelo de crédito corre en el banco remoto, con el mismo código que el teléfono usa para precalificar ([`ADR-011`](.ai/adr/ADR-011-el-modelo-de-credito.md)). Scorecard sobre cartera sintética, declarado. La edad no puntúa. Ningún modelo de lenguaje participa en la decisión.
- La firma en pantalla es un trazo con el dedo tras la aprobación; no es firma electrónica legal (se declara en UI). Luego hay un desembolso **simulado**.
- Datos: 100% sintéticos. Ningún dato real de clientes ni de pacientes.

## Modos de demo (`ADR-006`)

Elegidos a mano en la entrada, no por RAM automática:

| Modo | Modelo | Crédito |
|---|---|---|
| `local-wifi` | MedPsy en el teléfono | Banco remoto primero |
| `local-offline` | MedPsy en el teléfono | Pueblo / cola (sin Railway) |
| `nodo-offline` | Texto a `/inferir` en el pueblo | Pueblo / cola |


## El nombre

**Ina Igar** significa "Camino de la medicina" en gunagaya, la lengua del pueblo Guna de Panamá. `ina` es medicina o planta medicinal; `igar` es camino, vía, y también lección o tratado: el saber y la ruta en la misma palabra. Es exactamente lo que hace la app, porque cada detección devuelve una ruta.

Los significados salen del diccionario escolar *Gayamar sabga* (gunagaya-español) de Reuter Orán B. y Aiban Wagua, publicado por el Proyecto de Implementación de la Educación Bilingüe Intercultural en los Territorios Gunas de Panamá. No es una palabra nuestra: es prestada, y se cita.

## Base preexistente (declaración obligatoria)

- Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit) (ago 2026), de la que se generó el repo: `standards/`, `templates/`, los cuatro archivos de agosto de `docs/superpowers/`, la estructura de `.ai/` y `docs/ai-engineering-kit.md` (su README). Lo de septiembre en `docs/superpowers/` es nuestro.

## Contexto compartido del equipo
- `docs/ESTADO.md`: **foto del estado** (qué está medido, URLs, qué falta).
- `docs/CHECKLIST.md`: **el plan de trabajo que se sigue**, por bloques y con criterios de aceptación.
- `docs/PRUEBA-TELEFONO.md`: lo que se vio en el iPhone físico, incluidas las fallas.
- `docs/PRUEBA-NODO.md`: envío al banco (Railway) y al pueblo (LAN), medido, no recordado.
- `docs/BRIEF.md`: qué construimos, flujo y arquitectura.
- `.ai/`: contexto estable (reglas del hackathon, los 5 retos, referencia del SDK QVAC, línea base) y decisiones.
- `spikes/`: experimentos de validación con sus scripts, para que el jurado pueda repetirlos. `spikes/README.md` explica cómo.
- `docs/Reglas_Decentralized_AI_Hackathon.pdf`: reglamento oficial.

## Licencia
MIT. Ver [LICENSE](LICENSE).
