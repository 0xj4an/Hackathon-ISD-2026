# Registro de rendimiento estructurado

`perf.jsonl`: una línea por inferencia real de la app (se genera en el dispositivo y se exporta).
Es **entregable obligatorio** del reto Tether QVAC Psy, no un extra.

## De dónde salen las métricas

**No de la API de logging.** `loggingStream()`, `subscribeServerLogs()` y
`getLogger()` existen, pero los logs del SDK son diagnóstico: traen `level`,
`namespace`, `message`, `timestamp` (ejemplo textual de los docs:
`[DEBUG] llamacpp:llm: Loading model weights...`). **No traen tokens, ni TTFT,
ni throughput.**

Las métricas salen del objeto `stats` de `await result.final`. Lo que sí aporta
la API de logging es `getLogger()` con transporte propio: ese es el mecanismo
correcto para **escribir** este archivo (solo JS/TS).

## Qué campos existen de verdad

Verificado en `docs.qvac.tether.io/ai-capabilities/text-generation/` el 9 sep:

| Campo | Estado |
| --- | --- |
| `tokensPerSecond` | **Confirmado en docs** |
| `avgConcurrentSeq` | **Confirmado en docs** ("how busy the shared backend was") |
| `timeToFirstToken` | No documentado |
| `promptTokens` | No documentado |
| `generatedTokens` | No documentado |
| `backendDevice` | No documentado |

Los cuatro últimos venían de una versión anterior de este README y **no se
pudieron corroborar**. No construir el logger asumiendo que existen.

## Cómo escribirlo

1. Volcar el objeto `stats` **completo, tal cual venga**, bajo la clave `stats`.
   Si el SDK trae más campos de los documentados, quedan registrados; si no los
   trae, no se rompe nada.
2. Medir el **TTFT a mano** con `Date.now()` entre el inicio de `completion()` y
   el primer token del stream. Es lo que ya hace `mobile/App.tsx`, y es robusto
   frente a lo que el SDK documente o deje de documentar.
3. Medir `load_ms` igual, alrededor de `loadModel()`.
4. Contexto del dispositivo desde `getSystemResources()`.

Línea resultante:

```jsonc
{
  "ts": "2026-09-10T14:03:11.412Z",
  "task": "alerta | ocr | extraccion",
  "model": "HEALTHCARE_1_7B_MEDICAL_Q8_0",
  "quant": "Q8_0",
  "lora": "<ruta del adaptador, o null>",
  "sdk": "0.18.2",
  "ctx_size": 2048,
  "device_cfg": "gpu",
  "ttft_ms": 412,          // medido a mano
  "load_ms": 2140,         // medido a mano, solo en la primera carga
  "stats": { },            // objeto stats del SDK, completo y sin filtrar
  "system": { }            // getSystemResources(), completo
}
```

## Honestidad

El reto pide "nombres honestos de modelo, cuantización y hardware de ejecución".
`model`, `quant` y `system` se escriben con lo que devuelve el SDK y el
dispositivo, nunca a mano. Si al final la inferencia se delega al nodo, el campo
`device_cfg` tiene que decirlo.
