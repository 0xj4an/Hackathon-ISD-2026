# Spike · LoRA en el dispositivo sobre MedPsy 1.7B (8-9 sep 2026)

Objetivo: validar que `finetune()` de `@qvac/sdk` 0.18.2 entrena un adaptador LoRA en el Mac y que el adaptador se carga con `modelConfig.lora`. No es un experimento de calidad clínica.

- Modelo: `HEALTHCARE_1_7B_MEDICAL_Q8_0` (MedPsy 1.7B, Q8_0, 2.1 GB). Único de la familia Qwen3 en el catálogo con cuantización entrenable (F32/F16/Q4_0/Q8_0/TQ); los `QWEN3_*_INST` vienen en Q4_K_M, no entrenable.
- Hardware: MacBook Pro M5 Pro, 48 GB, Metal. SDK 0.18.2, Node 22.
- Dataset: 52 ejemplos sintéticos (8 marcadores de laboratorio × 3 estados × 5 fraseos) → JSON de triaje; 8 de validación.
- Config: 3 épocas, lr 2e-4, rank 8, alpha 16, ctx 1024, `assistantLossOnly`, módulos attn+ffn.
- Tiempo: ~416 batches por época a ~4 s/batch ≈ **28 min por época** (el log marca 53,621 s porque el Mac durmió a mitad; el tiempo activo fue ≈ 90 min).
- Loss: train 2.0 → 0.010; val 0.009; accuracy val 0.994.
- Artefacto: `out/trained-lora-adapter.gguf`, 34 MB (no versionado).
- Resultado en 3 pruebas: base 1/3 JSON parseable → LoRA 2/3. El base inventa rangos de referencia ("plaquetas 45-60"); con LoRA los rangos y el formato mejoran, pero con 52 ejemplos aún fuga `</think>` y clasifica mal algún caso.

Conclusiones para el producto:
1. El pipeline funciona de punta a punta; el costo es ~30 min por época en el Mac. Para el video: entrenar 1 o 2 épocas con un dataset de 150 a 300 ejemplos, y mostrar antes/después.
2. `</think>` se filtra aunque `reasoning_budget: 0`: limpiar siempre la salida (`core/prompts.ts → limpiarJson`).
3. Es capa opcional de las últimas horas, no núcleo. Si se usa, declararlo en README como "MedPsy-1.7B Q8_0 + adaptador LoRA entrenado por el equipo".

Los scripts que produjeron esta medicion se retiraron del repo (vivian en `qvac-course`). Para repetirlo hay que escribir el generador de dataset y el de entrenamiento; la tabla de marcadores y rangos ya esta en `core/marcadores.ts`.
