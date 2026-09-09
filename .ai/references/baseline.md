# Línea base del proyecto

## Estado actual

Repo creado el 9 sep 2026 a partir de la plantilla AI Engineering Kit (ArturVargas/AI_Engineering_Kit). Todavía sin código de producto. Idea por decidir entre los candidatos de `runs/2026-09-09-mvp-hackathon/01-idea-validation.md`.

## Arquitectura y despliegue

Por definir. Restricción base: `@qvac/sdk` levanta un worker Bare y se comunica por RPC; un worker por app, varios modelos cargados a la vez; ciclo `loadModel()` → operaciones → `unloadModel()` → `close()`.

## Dependencias e integraciones

- `@qvac/sdk` 0.18.2, `@qvac/cli` 0.12.0.
- Addons según capacidad: `@qvac/llm-llamacpp`, `@qvac/embed-llamacpp`, `@qvac/transcription-whispercpp` / `-parakeet`, `@qvac/tts-ggml`, `@qvac/translation-nmtcpp`, visión/OCR, `@qvac/diffusion-cpp`.
- Móvil: Expo ≥ 54 con `@qvac/sdk/expo-plugin`, `react-native-bare-kit`, `bare-rpc`.

## Lo que ya está probado (en `../qvac-course/`, fuera del repo)

- Entorno: `qvac doctor` pasa completo en el Mac (Metal, Node 26, adb, Xcode, ffmpeg, Bare 1.31).
- Chat offline con `LLAMA_3_2_1B_INST_Q4_0`: carga en caliente 2.1 s, primer token 57–130 ms en caliente, 60–200 tok/s. El 1B falla en aritmética, hechos y razonamiento sobre historial largo; sirve para chat acotado, no como enciclopedia.
- RAG con embeddings (`m2/rag.js`).
- Descarga y caché de modelos (`prep/download-models.mjs`).
- Delegación P2P entre pares (`prep/p2p-test.mjs`, funciona en 0.18.2). Activo transversal: todos los retos valoran Pears / delegación P2P.
- Spike de fine tuning LoRA sobre MedPsy 1.7B Q8_0 (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) en `prep/lora/` (ver `spike.log` para el resultado).

## Riesgos y deuda conocida

- Un teléfono de gama media no corre cómodo 1B + embeddings + Whisper: la salida es delegar P2P a la laptop, no la nube.
- Móvil solo en dispositivo físico; el pipeline Expo hay que probarlo antes de depender de él para la demo.
- Los relays P2P de los ejemplos usan claves mock; para una demo entre redes distintas hace falta relay propio o misma LAN.
- Cualquier `fetch` a un proveedor de IA externo descalifica: revisar dependencias y ejemplos copiados.

## Próxima iniciativa

`runs/2026-09-09-mvp-hackathon/`: decidir idea y reto(s), especificar el MVP, arquitectura y plan para 48 h.
