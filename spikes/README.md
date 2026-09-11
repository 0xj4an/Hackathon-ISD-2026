# Spikes (experimentos de validación, no producto)

Código propio del equipo, dentro de la ventana del hackathon.

## `lora-medpsy/`

Adaptador LoRA sobre MedPsy Q8_0 para **examen de laboratorio** (ADR-002/003).
Evidencia y cómo repetir: [`lora-medpsy/RESULTADOS.md`](lora-medpsy/RESULTADOS.md).
En producto: `mobile/assets/models/lora-lab-v4.gguf` (solo lab; no cédula/alerta).

```bash
cd spikes && npm install
node lora-medpsy/make-dataset.mjs
caffeinate -i node lora-medpsy/spike.mjs   # EPOCHS=1 para corto
```

## Qué no está versionado

- `node_modules/`, `lora-medpsy/out/` (regenerables).

QVAC `delegate` / Hyperswarm **no** son el camino de la demo (ver `docs/ESTADO.md`).
