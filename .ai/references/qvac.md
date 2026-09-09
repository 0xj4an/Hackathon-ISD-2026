# QVAC · Referencia completa del stack para el hackathon

Revisado: 8 de septiembre de 2026. Fuentes: docs.qvac.tether.io (todas las páginas), qvac.tether.io (blog, changelog, recipes, plugins), CHANGELOG del monorepo tetherto/qvac, PyPI. Complementa `QVAC-Curso-Apuntes.md` (medidas reales en el Mac con SDK 0.18.2).

## 0. Lo primero: la alerta de versión

**`@qvac/sdk` 0.19.0 salió ayer, 7 de septiembre, y es breaking.** Lo más grave para nosotros, textual del CHANGELOG: *"Provider mode and DHT delegation are gone. Models load and run locally only."* Se eliminaron `startQVACProvider`, `stopQVACProvider`, las opciones `delegate` de `loadModel` y `heartbeat`, `isDelegated`/`providerInfo` en la info del modelo y las clases de error de provider. La página de docs `/p2p-capabilities/delegated-inference` ya no existe (redirige a Introduction) y `llms-full.txt` no contiene el término. La landing `qvac.tether.io/dev/sdk/` todavía muestra `startQVACProvider`, pero es contenido viejo.

Consecuencias:

1. El Mac tiene instalada **0.18.2** (última con provider mode). Si queremos mostrar delegación P2P nativa hay que **fijar `"@qvac/sdk": "0.18.2"`** en el package.json y no actualizar. Riesgo: sin docs, guiándonos por tipos del paquete y el CHANGELOG; y el jurado técnico de Tether sabe que acaba de quitarlo.
2. Alternativa segura: delegación a nivel de app. Un peer corre `qvac serve --openai --host 0.0.0.0 --api-key ...` (0.19) y el cliente ligero habla el protocolo OpenAI-compatible por la LAN o por un túnel P2P propio (Hyperswarm + `bare-rpc`, que ya vienen en las dependencias del SDK). La regla del hackathon dice "inferencia en el dispositivo o delegada por P2P": delegar a la laptop del equipo por P2P sigue cumpliendo, aunque el transporte lo pongamos nosotros.
3. Lo más sólido para Technical (35%) hoy: **encadenar capacidades on-device** (voz -> LLM con tool calling / JSON schema -> embeddings + RAG -> TTS, y visión/OCR si alcanza) y demostrar arranque con Wi-Fi apagado. La delegación se deja como extra si hay tiempo, no como columna vertebral.

Otras breaking de 0.19: `@qvac/inference` reemplaza a `@qvac/bare-sdk` como motor in-process; `modelConfig.no_mmap` pasa a `load_mode: "none"|"mmap"|"mlock"|"dio"`; `translate` en batch devuelve array; `@qvac/sdk/worker-core` -> `@qvac/sdk/worker-lifecycle`; el paquete de language detection cambia de nombre. Novedades útiles: `assessModelFit()` (dice si un modelo cabe en memoria antes de bajarlo), Parakeet Unified, verificación de checksum para descargas de HF.

**Decisión a tomar hoy:** ¿0.18.2 con delegación nativa, o 0.19.0 sin ella? Recomiendo 0.19.0 salvo que la delegación sea el corazón del pitch.

## 1. Arquitectura y ciclo de vida

QVAC es un SDK de IA local, Apache 2.0, sin API keys, con una API unificada para 18+ tareas. Un mismo código corre en Linux, macOS, Windows, Android e iOS. No hay target de navegador.

El SDK levanta un **worker en runtime Bare** (singleton por app, arranque lazy en la primera llamada) y se comunica con él por `bare-rpc`. Dentro del worker viven los motores nativos, todos forks propios: `qvac-fabric-llm.cpp` (fork de llama.cpp; LLM, embeddings, NMT), `qvac-fabric-speech.cpp` (Whisper), Parakeet en GGUF, `qvac-tts.cpp`, `qvac-ext-stable-diffusion.cpp`, ACE-Step GGML, OCR GGML.

Ciclo: `loadModel({ modelSrc, modelType?, modelConfig?, fallbackSrc?, onProgress })` -> devuelve `modelId` -> operaciones (varios modelos cargados a la vez) -> `unloadModel({ modelId, clearStorage? })` -> `close()`. Desde 0.15 `unloadModel` no cierra el worker en Bare; en Node/Electron sí (`autoClose:true`). Llamar `close()` al terminar.

Runtime extra: `suspend()/resume()/state()` para móvil (en `suspended` toda operación lanza `LIFECYCLE_OPERATION_BLOCKED`; las descargas se pausan limpias). Cancelación: toda llamada larga devuelve `requestId` síncrono (`Promise & { requestId }`); `cancel({ requestId })` o `cancel({ modelId, kind })`. Gotcha: cancelar durante la fase de carga deja un modelo huérfano (llamar `unloadModel` antes de reintentar); en `embed` y `transcribe`, cancelar aborta todas las llamadas de ese modelo. Logging silencioso por defecto desde 0.14: activar `loggerConsoleOutput: true`, `loggerLevel: "info"`. Profiler: `profiler.enable({ mode:"summary"|"verbose" })`, `exportTable()`.

## 2. Plataformas y requisitos

| Plataforma | Mínimo | GPU |
|---|---|---|
| macOS | 14+, arm64 (Intel solo CPU) | Metal |
| iOS | 17+, solo vía Expo | Metal |
| Linux | Ubuntu 22+, g++ ≥ 13 | Vulkan ≥ 1.4, fallback CPU |
| Android | 12+ (minSdk 29 en Expo), arm64 | Vulkan / OpenCL (Adreno 700+) |
| Windows | 10+, x64 | Vulkan obligatorio incluso en CPU |

Node ≥ 22.17, npm ≥ 10.9, RAM ≥ 2 GB (4 rec.), 5 GB de disco. Móvil solo en dispositivo físico (los emuladores no funcionan). `qvac doctor` valida el host (en el Mac ya pasa todo: Metal, adb, Xcode, ffmpeg, Bare, Bun).

> **NO VERIFICADO (9 sep, 14:30).** Una versión anterior de esta línea afirmaba
> "cuota de caché de modelos: 512 MiB en React Native, 4 GiB en el resto".
> Buscado el 9 sep en `about/how-it-works`, `system-requirements`,
> `configuration`, `troubleshooting` y `llms-full.txt`: **no aparece en ninguna**.
> `configuration` documenta `cacheDirectory` (default `~/.qvac/models`,
> personalizable) y **ningún** límite de tamaño. Puede venir del CHANGELOG o de
> los tipos del paquete, pero hasta corroborarlo no se planifica contra este
> dato. Lo que los docs sí dicen y sí aplica: *"Below 4 GB, most LLMs will fail
> to load"* y ≥ 2 GB de RAM disponible al cargar. **El límite real a vigilar en
> el teléfono es RAM, no caché.**

**Node**: `npm i @qvac/sdk`, config en `qvac.config.json|js|ts` o `QVAC_CONFIG_PATH`.

**Expo (móvil)**: `create-expo-app --template blank-typescript@sdk-54`; `npm i @qvac/sdk`; `npx expo install expo-file-system expo-build-properties expo-device`; peers `react-native-bare-kit@^0.11.5`, `bare-pack@^1.5.1`, `bare-rpc`. `app.json` con `expo-build-properties` (`minSdkVersion: 29`) y `"@qvac/sdk/expo-plugin"`; `qvac.config.json` con `plugins: ["@qvac/sdk/llamacpp-completion/plugin"]`; `npx expo prebuild`; `npx expo run:android --device`. Importar constantes de modelos desde `@qvac/sdk/models` (sin módulos de servidor, apto para Metro). Ojo: el tutorial fija `@qvac/sdk ^0.7.0`, está viejo; re-verificar nombres de plugins con la versión que usemos.

**Electron (desktop)**: SDK en el main process, IPC vía preload, empaquetado con Electron Forge + `QvacForgePlugin` de `@qvac/sdk/electron-forge`. ASAR prohibido, sin universal builds en macOS (arm64 y x64 por separado).

**Bare puro**: importar `bare-process` global y registrar plugins con `plugins([...])` desde `@qvac/inference`; `qvac bundle sdk` genera el bundle tree-shaken.

**Python**: `pip install tetherto-qvac-sdk` (0.19.0) + worker Node; API asíncrona espejo de la JS. JS/TS sigue siendo lo maduro.

## 3. Configuración y CLI

`qvac.config.json` (inmutable tras el init): `plugins[]`, `loggerConsoleOutput`, `loggerLevel`, `swarmRelays[]` (claves hex de relays Hyperswarm), `cacheDirectory` (default `~/.qvac/models`), `httpDownloadConcurrency` (3), `requireHttpChecksum`, `registryDownloadMaxRetries` (3), `registryStreamTimeoutMs` (60000), `deviceDefaults[]` (defaults de `modelConfig` por plataforma/marca/modelo de teléfono, muy útil para Android), `bareRuntimeVersion`, `serve{}`.

CLI (`npm i -g @qvac/cli`): `qvac doctor`, `qvac configure` (genera `serve.models` por modalidad), `qvac serve` (`--openai --no-default -p 11434 -H 127.0.0.1 --api-key ... --cors-origin ... --docs`; bind fuera de loopback exige api-key), `qvac bundle sdk`, `qvac openai spec`.

`qvac serve` expone endpoints OpenAI-compatibles: `/v1/chat/completions` (tools, `response_format: json_schema`, streaming, reasoning), `/v1/responses`, `/v1/embeddings`, `/v1/audio/transcriptions`, `/v1/audio/speech`, `/v1/images/generations`, `/v1/vector_stores` (+`/search`), `/v1/models` y `/v1/models/catalog?role=chat`. Límites: ctx default 1024 (subir con `config.ctx_size`), `default:true` no es fallback, multipart 100 MB. Hay `@qvac/ai-sdk-provider` (Vercel AI SDK) y plugins para OpenCode y OpenClaw que envuelven `qvac serve`. Esto es lo que hace viable la "delegación a nivel app": la laptop sirve, el teléfono consume.

## 4. Capacidades de IA

Patrón común: `loadModel` -> función de la capacidad -> `unloadModel`. Valores de `modelType`: `llamacpp-completion`, `llamacpp-embedding`, `whispercpp-transcription`, `parakeet-transcription`, `nmtcpp-translation`, `tts-ggml`, `ggml-ocr`, `ggml-classification`, `sdcpp-generation`, `ggml-vla`, `audiogen`, `video`, `bci-transcription` (alias cortos en docs: `"llm"`, `"embeddings"`, `"whisper"`, `"parakeet"`).

### 4.1 LLM y tool calling (`@qvac/llm-llamacpp`) - núcleo del reto Philips
`completion({ modelId, history:[{role, content, attachments?}], stream, generationParams:{ temp, seed, predict }, tools?, mcp?, kvCache?, captureThinking?, responseFormat? })` -> `{ events, final, requestId, tokenStream }`. Eventos: `contentDelta`, `thinkingDelta`, `toolCall`, `toolError`, `completionStats`, `completionDone`. `final` -> `{ contentText, thinkingText, toolCalls[], stats }`.

`modelConfig`: `ctx_size` (**default 1024**, subir a 4096+), `device:"gpu"|"cpu"`, `n_gpu_layers`, `parallel` (continuous batching; el ctx se reparte entre slots), `tools:true` (obligatorio para tool calling), `lora` (adapter .gguf), `load_mode`, `reasoning_budget` (-1 ilimitado, 0 apagado), `remove_thinking_from_context`, TurboQuant `cache-type-k:"tbq4_0"` / `cache-type-v:"pq4_0"` (solo Vulkan desktop).

- **Tool calling**: `tools:[{ name, description, parameters (JSON Schema) }]` + `modelConfig.tools:true`. Dialectos detectados solos (Hermes, Qwen3.5, Gemma4, Harmony, DeepSeek). El worker orquesta el loop.
- **Structured output**: `responseFormat: { type:"json_schema", ... }` o `json_object`. **Incompatible con `tools`/`mcp`** en la misma llamada. Para extraer la observación del hospital a JSON esto es lo que queremos: un schema con cliente, ciudad, país, modalidad, cantidad, marca, modelo, antigüedad, estado.
- **MCP**: `mcp:[{ client }]`, las tool calls se enrutan solas.
- **KV cache**: `kvCache: "clave"` | `true` (auto, expira 24 h) | `false`; `deleteCache()`. Sirve para mantener el system prompt largo cacheado entre observaciones.
- **Batch**: `batchCompletion` con `modelConfig.parallel ≥ 2`, prompts con `id`, consumo por `byId(id)` o iterable. Útil para reprocesar N observaciones en la vista agregada.
- Modelos: `LLAMA_3_2_1B_INST_Q4_0`, `LLAMA_TOOL_CALLING_1B_INST_Q4_K`, `QWEN3_600M_INST_Q4`, `QWEN3_1_7B_INST_Q4`, `QWEN3_4B_INST_Q4_K_M`, `QWEN3_8B_INST_Q4_K_M`, Gemma4 2B/4B multimodal, Qwen3.5/3.8 multimodal. Del curso: el 1B se equivoca en extracción y aritmética; para el hackathon **≥ 4B en desktop**, 1.7B-4B en móvil según RAM. `ContextOverflowError` trae `requiredTokens`, `ctxSize`.

### 4.2 Embeddings y RAG (`@qvac/embed-llamacpp`, `@qvac/rag`)
`embed({ modelId, text: string|string[] })` -> `{ embedding }`. Modelos: `GTE_LARGE_FP16` (1024 dims, inglés, **ctx 512**), `EMBEDDINGGEMMA_300M_{Q4_0,Q8_0,BF16,F32}` (768 dims, multilingüe: **mejor para español**, medido en el curso).
RAG: `ragChunk`, `ragIngest({ modelId, documents, workspace, chunk:true, chunkOpts:{ chunkSize, chunkOverlap, chunkStrategy, splitStrategy } })`, `ragSearch({ modelId, workspace, query, topK })` -> `[{ id, content, score }]`, `ragReindex`, `ragDeleteEmbeddings`, `ragListWorkspaces`, `ragCloseWorkspace`, `ragDeleteWorkspace`. El vector store integrado "no es production grade": para el dataset de observaciones usar `embed()` + SQLite (sqlite-vec) o LanceDB, que además nos da el dataset estructurado que pide Philips. Un workspace por modelo de embeddings (dimensiones distintas). 0.19 añade "TurboVec RAG index injection".

Uso en el reto: dedupe de observaciones (similitud entre "tres resonadores en DemoCare" y "3 MRI en Hospital DemoCare Pacific"), y consultas en lenguaje natural sobre el dataset (mejor aún: LLM con tool calling que traduzca la pregunta a un filtro SQL; el recipe "Natural Language to SQL" de qvac.tether.io/recipes hace exactamente eso).

### 4.3 Transcripción (`@qvac/transcription-whispercpp`, `@qvac/transcription-parakeet`)
`transcribe({ modelId, audio|audioChunk, language?, translate?, metadata? })` -> string; `transcribeStream()` -> eventos `text`, `segment`, `vad` (`emitVadEvents:true`), `endOfTurn`. Entrada **16 kHz mono PCM WAV**. Whisper: `WHISPER_TINY` (+ tamaños), VAD `VAD_SILERO_5_1_2`, `contextParams:{ use_gpu, flash_attn }`. Parakeet GGUF: `PARAKEET_TDT_0_6B_V3_Q8_0` (multilingüe, incluye español), `PARAKEET_CTC_0_6B_Q8_0`, `PARAKEET_SORTFORMER_4SPK_*` (diarización), `PARAKEET_EOU_120M_V1_Q8_0` (fin de turno), Parakeet Unified (0.19); `parakeetStreamingConfig:{ chunkMs, historyMs, emitPartials, emitEnergyVad }`. Para dictado en español al salir del hospital: Whisper small/base con `language:"es"` o Parakeet TDT v3.

### 4.4 Text to speech (`@qvac/tts-ggml`)
`textToSpeech({ modelId, text, stream, outputSampleRate })` -> PCM int16 sin cabecera. Motores: Supertonic (`TTS_MULTILINGUAL_SUPERTONIC3_Q8_0`, `voice:"F1"`, 44.1 kHz, multilingüe), Chatterbox (en/ja/zh, clonación de voz), Parler (`TTS_MINI_V1_EN_PARLER_TTS_Q8_0`, emoción/pitch, solo inglés, único con `textToSpeechStream`), CosyVoice3 (0.18). Post-proceso LavaSR (denoiser/enhancer a 48 kHz). Supertonic3 es el candidato para respuestas en español ("¿de qué marca son los resonadores?").

### 4.5 Voice assistant (tutorial de referencia)
Mic -> Whisper Tiny + Silero VAD (`threshold 0.6`, `min_silence_duration_ms 700`, `speech_pad_ms 200`) -> LLM -> TTS -> parlante, con gating del mic durante playback, cooldown 300 ms y filtro de alucinaciones (`[BLANK_AUDIO]`). Solo desktop (usa ffmpeg/ffplay). Es la plantilla del flujo "dictado por voz al terminar la visita".

### 4.6 Traducción (`@qvac/translation-nmtcpp`)
`translate({ modelId, from, to, text: string|string[], stream? })`. Bergamot (`BERGAMOT_EN_ES`), NLLB-200 (200+ pares), TranslatePsy-Nano, TranslatePsy-AfriSLM (sep 2026). Extra opcional: guardar observaciones en español y exponer el dataset en inglés para la casa matriz.

### 4.7 Visión, OCR y clasificación
- Multimodal: `history[].attachments:[{ path }]` + `modelConfig.projectionModelSrc` (mmproj). `VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` (Flash: `image_no_upscale:'on'` obligatorio o degrada en silencio) y `_Q8_0_1` (Base); alternativas Qwen3-VL, Gemma4 multimodal, SmolVLM2.
- OCR (`@qvac/ocr-ggml`): `ocr({ modelId, image, paragraph? })` -> bloques `{ text, bbox, confidence }`; `OCR_LATIN`, `modelConfig:{ langList:['en'] }`. El recipe "Invoice OCR" (OCR + LLM con validación de totales) es el patrón para leer placas de equipos: foto de la etiqueta -> OCR -> LLM extrae marca/modelo/serial/año.
- Clasificación: `classify({ modelId, image, topK })`, MobileNetV3 bundled con labels fijos; custom GGUF vía `modelSrc`.

### 4.8 Fine tuning LoRA en el edge
`finetune({ modelId, dataset (JSONL messages), numberOfEpochs, learningRate, loraModules, checkpointSaveDir, validation, assistantLossOnly })` -> adapter `.gguf` -> `modelConfig.lora`. Solo arquitecturas `qwen3`, `gemma3`, `bitnet` en F32/F16/Q4_0/Q8_0/TQ1_0/TQ2_0 (confirmado en docs el 9 sep, textual: *"not every model constant is fine-tunable: for example, many Qwen3-4B/8B constants are `Q4_K_M`"*). Soporta además `pause`/`resume` con checkpoints. **"Corre en móvil (Vulkan/Metal)" NO está verificado**: la página de fine-tuning no menciona Android ni iOS. Probar antes de prometerlo en el guion del video. Idea de alto impacto en Technical si sobra tiempo: LoRA de Qwen3 con 200 ejemplos sintéticos de observaciones de hospital -> JSON, entrenado en el propio dispositivo. Muy vistoso, pero es de las últimas horas, no de las primeras.

### 4.9 Lo que NO conviene tocar en 48 h
Generación de imagen (`diffusion`, FLUX.2-klein, Ideogram 4, SD), video (`video`, WAN 2.1/2.2, LTX-2; 16 a 20 GB de VRAM, 11 min por clip), música (`audioGen`, ACE-Step/MiniMax, 3.3 GB, solo desktop), BCI, VLA (robótica, `ggml-vla`, 2 a 4 GB), ABot-World (0.19). Todo existe y es impresionante, pero no aporta al reto y consume horas en descargas.

## 5. P2P

**Distribución de modelos**: las constantes del catálogo son "registry-backed" y se descargan por Hyperdrive/Hyperswarm (stack Pears/Holepunch) o por HTTP/HF. Descargas resumables, deduplicadas, con SHA-256 contra el catálogo. `fallbackSrc` (0.18) = URL o path local si el registry falla (solo con constantes de catálogo). Para redes lentas: `registryStreamTimeoutMs: 600000`, `registryDownloadMaxRetries: 10`. `downloadAsset({ assetSrc, onProgress })` para bajar sin cargar. **Pre-descargar todos los modelos hoy** (ya está Llama 1B; faltan Qwen3 4B, EmbeddingGemma, Whisper base/small, Supertonic3, OCR_LATIN, VisionPsy) para que el 9 no se vaya en descargas.

**Blind relays** (`/p2p-capabilities/blind-relays`, única página P2P que queda): nodos intermedios para atravesar NAT/firewall en Hyperswarm. `swarmRelays: ["<hex>"]` en config. Los ejemplos usan claves mock; "for real deployments you must use your own relay servers or trusted public relays". No documentan cómo desplegar uno.

**Inferencia delegada (0.18.2, verificada en el Mac)**: ver §0. El paquete instalado trae los ejemplos completos en `node_modules/@qvac/sdk/dist/examples/delegated-inference/` (`provider.js`, `consumer.js`, `consumer-profiled.js`, `composite.js`), y esa es la documentación real que nos queda. Cómo funciona:

- Proveedor: `const { publicKey } = await startQVACProvider({ firewall?: { mode:'allow', publicKeys:[...] } })`. Identidad reproducible con `process.env.QVAC_HYPERSWARM_SEED = '<64 hex>'`. Imprime su public key; `stopQVACProvider()` para parar.
- Consumidor: `loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, delegate: { providerPublicKey, timeout: 60_000, fallbackToLocal: true, forceNewConnection?: false } })` y luego `completion()` normal con streaming. No hay `topic` ni descubrimiento: el consumidor se conecta directo por `dht.connect(publicKey)` de HyperDHT. La primera conexión en frío tarda 15 a 45 s (bootstrap del DHT); las siguientes en el mismo proceso son sub-segundo. Firewall opcional por public key del consumidor (`getConsumerPublicKey(seed)`).
- `composite.js` lanza proveedor y consumidor en el mismo host (útil para probar sin dos máquinas). `consumer-profiled.js` muestra métricas de delegación con `profiler`.
- Eliminada en 0.19.0. Si la usamos, fijar `"@qvac/sdk": "0.18.2"` y `"@qvac/cli"` compatible, y no actualizar.

## 6. Registry y elección de modelos

`modelRegistryList()` (~650 entradas), `modelRegistrySearch({ ...filtros por tipo, engine, quantization })`, `modelRegistryGetModel()`, `getModelInfo()` (estado de caché, cuantización; necesario antes de fine-tune), `getLoadedModelInfo({ modelId })`, `assessModelFit()` (0.19), `getSystemResources()` (0.17). Fuentes aceptadas: constante, URL HTTP/HF `.gguf`, path local (con `modelType`), `.tar.gz`, GGUF sharded. Familia propia QVAC Psy: MedPsy 1.7B/4B (médico, curioso para Philips aunque el reto no es clínico), VisionPsy-Nano, TranslatePsy. HF: `huggingface.co/qvac`.

Recomendación para el reto: desktop -> `QWEN3_4B_INST_Q4_K_M` (o 8B en el Mac de 48 GB), `EMBEDDINGGEMMA_300M_Q8_0`, Whisper small/Parakeet TDT v3, Supertonic3, `OCR_LATIN`. Móvil -> `QWEN3_1_7B_INST_Q4` o Gemma4 2B, `WHISPER_TINY`/base, EmbeddingGemma Q4.

## 7. Ejemplos, recipes y plugins

Docs: tutoriales Electron y Expo (chat), voice assistant, ejemplos JS/Python en cada capacidad. Recipes en qvac.tether.io/recipes (todas desktop, 25-35 min): **Invoice OCR**, A Folder That Sorts Itself, Smart Security Camera (YOLOv10 ONNX + Qwen3-VL 2B), **Natural Language to SQL**. Repo `tetherto/qvac-examples`: `qvac-invoice-manager-demo` (LLM 2.5 GB + visión 1.6 GB, OCR, validación) y `qvac-smart-camera`. Plugins: `@qvac/ai-sdk-provider`, `@qvac/opencode-plugin`, `@qvac/openclaw-plugin`. Invoice OCR + NL-to-SQL son las dos recetas que más se parecen al reto de Philips; hay que declararlas en el README si usamos código de ellas.

## 8. Gotchas consolidados

1. Delegación P2P eliminada en 0.19; docs y landing inconsistentes. Fijar versión y no hacer `npm update` a mitad del hackathon.
2. ctx default 1024 en SDK y en `qvac serve`; poner `ctx_size: 4096`+ siempre.
3. `responseFormat` y `tools` no van juntos: extracción con JSON schema en una llamada, preguntas de seguimiento/consultas con tools en otra.
4. Tools requieren `modelConfig.tools:true`. `parallel` reparte el contexto entre slots.
5. GTE Large: chunks ≤ 512 tokens; un workspace por modelo de embeddings; RAG integrado solo para prototipo.
6. Audio de entrada 16 kHz mono WAV; salida TTS PCM crudo sin cabecera (envolver en WAV para reproducir).
7. Emuladores no; Windows exige Vulkan; Intel Mac sin GPU; tutorial Expo desactualizado (`^0.7.0`).
8. ~~Cuota 512 MiB de caché en React Native~~ **retirado, no verificado**: no aparece en ningún doc (ver sección 2). El límite real en móvil es **RAM** (*"Below 4 GB, most LLMs will fail to load"*) y el **peso de la primera descarga**: los pesos NO se empaquetan en el APK, bajan en el primer arranque. MedPsy Q8_0 son 2.1 GB por la red del evento. Pre-descargar con `downloadAsset()` antes de la demo.
9. Logs apagados por defecto; `unloadModel` no cierra el worker (llamar `close()`); cancelar en carga deja huérfanos.
10. VisionPsy Flash necesita `image_no_upscale:'on'`.
11. Mismatch `@qvac/cli` vs `@qvac/sdk` -> error "does not provide an export named 'default'": `npm i -g @qvac/cli@latest && qvac bundle sdk`.
12. 1B alucina en extracción; usar ≥ 4B para el JSON estructurado y validar con schema.

## 9. Línea de tiempo 2026 (para hablar con propiedad ante el jurado)

Abr 9 lanzamiento público del SDK (Apache 2.0). Jun 0.12 TurboQuant KV cache, TTS GGML, Parakeet GGUF, VLA, `classify`, `video`. Jun 0.13 BCI, Electron Forge. Jun 29 0.14 OCR GGML, logs silenciosos, `reasoning_budget`. Jul 13 0.15 `batchCompletion`, LavaSR. Jul 27 0.16 Python SDK preview, KV reuse en serve. Ago 10 0.17 AudioGen, Parler, Wan 2.2, `getSystemResources`. Ago 24 0.18 continuous batching, `fallbackSrc`, CosyVoice3. Sep 2 TranslatePsy-AfriSLM. **Sep 7 0.19 `@qvac/inference`, delegación eliminada, `assessModelFit`, ABot-World.** QVAC Workbench (oct 2025) hoy aparece como "QV.AC Assistant"; su página da 404.

## 10. Arquitectura sugerida para el reto Philips con este stack

Desktop (Electron o Node + UI web local) como app principal en el Mac; opcional Expo en Android como capturador ligero.

1. Captura: texto o voz. Voz -> Whisper small (`language:"es"`) con VAD Silero y `endOfTurn`.
2. Extracción: `completion` con `responseFormat: json_schema` sobre Qwen3 4B, `ctx_size 4096`, system prompt cacheado con `kvCache`. Schema: `{ cliente, ciudad, pais, equipos:[{ modalidad, cantidad, marca?, modelo?, antiguedad_anios?, estado:"Confirmado"|"Reportado"|"Estimado"|"Desconocido" }], faltantes:[] }`.
3. Seguimiento: segunda llamada con `tools` (`ask_followup`, `save_observation`) para preguntar por el dato faltante más valioso y guardar.
4. Almacenamiento: SQLite con tabla de observaciones + columna de embedding (EmbeddingGemma) para dedupe por similitud y para búsqueda semántica.
5. Vistas: base instalada por cliente, agregación por país/modalidad, puntaje de confianza (completitud × antigüedad × confirmaciones independientes), alertas de datos no verificados.
6. Consultas en lenguaje natural: LLM con tool `run_query` (NL -> SQL) sobre el dataset.
7. Extras si hay tiempo: foto de placa -> `ocr` -> LLM; TTS Supertonic3 para el asistente de voz; LoRA de 200 ejemplos; delegación teléfono -> laptop (0.18.2 nativa o vía `qvac serve`).
8. Video: mostrar Wi-Fi apagado, arranque en frío, dictado, JSON, dedupe, consulta NL, todo en menos de 5 minutos y en español.

## Fuentes

docs.qvac.tether.io: introduction, system-requirements, js-ts-sdk, python-sdk, configuration, cli, cli/http-server, models/download-lifecycle, models/sharded-models, addons, ai-capabilities/{text-generation, text-embeddings, rag, fine-tuning, multimodal, batch-processing, image-generation, video-generation, music-generation, transcription, text-to-speech, voice-assistant, translation, bci, vla, ocr, image-classification}, p2p-capabilities/blind-relays, runtime/{cancellation, lifecycle, logging, profiler}, tutorials/{electron, expo}, reference/{api, release-notes}, troubleshooting, about/{how-it-works, vision}, llms-full.txt. qvac.tether.io: /, /blog, /changelog, /products/sdk, /recipes, /plugins, /dev/sdk, /models y posts (future-of-ai-is-local, security-camera, invoice, afrislm, memory-limits, turboquant, lora-bitnet). github.com/tetherto/qvac: README y CHANGELOG de packages/sdk, releases. github.com/tetherto/qvac-examples. pypi.org/project/tetherto-qvac-sdk. No accesibles: /p2p-capabilities/delegated-inference (redirige), /p2p-capabilities/model-distribution (404), npmjs.com (403), examples/ del monorepo (robots.txt), /products/workbench (404).
