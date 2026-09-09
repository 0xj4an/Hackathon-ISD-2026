# Registro de rendimiento estructurado

`perf.jsonl`: una línea por inferencia real de la app (se genera en el dispositivo y se exporta).

Campos: `ts`, `device` (modelo, RAM, SoC, Android), `sdk` (0.18.2), `model` (nombre de catálogo), `quant`, `task` (alerta | ocr | extraccion), `prompt_tokens`, `generated_tokens`, `ttft_ms`, `tokens_per_s`, `load_ms` (si aplica), `backend` (gpu|cpu), `ctx_size`.

Fuente: `completionStats` del SDK (`timeToFirstToken`, `tokensPerSecond`, `promptTokens`, `generatedTokens`, `backendDevice`) + `getSystemResources()`.
