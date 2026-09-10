# Adaptadores LoRA empaquetados en la app

| Archivo | Versión | Uso |
| --- | --- | --- |
| `lora-lab-v3.gguf` | `lab-v3` | Extracción de informes de laboratorio (vía B) |

Para reemplazar: deja el `.gguf` nuevo aquí con otro nombre, actualiza
`LORA_LAB_VERSION` y el `require(...)` en `mobile/src/lora.ts`, y vuelve a
compilar. MedPsy base no cambia.

Origen de `lab-v3`: corrida 3 en `spikes/lora-medpsy/` (lab JSON 5% → 68%).
