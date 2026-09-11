# Adaptadores LoRA empaquetados en la app

| Archivo | Versión | Uso |
| --- | --- | --- |
| `lora-lab-v4.gguf` | `lab-v4` | Extracción de informes de laboratorio (vía B) |

Para reemplazar: deja el `.gguf` nuevo aquí con otro nombre, actualiza
`LORA_LAB_VERSION` y el `require(...)` en `mobile/src/lora.ts`, y vuelve a
compilar. MedPsy base no cambia.

Origen de `lab-v4`: corrida 4 en `spikes/lora-medpsy/` (lab JSON 9% → 45%,
campos 76% sobre el eval con dígitos legibles).
