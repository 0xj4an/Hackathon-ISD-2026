# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre: **Ina Igar** ("Camino de la medicina" en gunagaya). Equipo: 0xj4an y Artur.

## Una frase
Una app para personas en zonas rurales de Panamá con señal intermitente, que detecta en el teléfono una señal de riesgo de salud, muestra en español qué examen conviene y cuánto cuesta (MedPsy redacta el mensaje en inglés, `ADR-009`), y permite solicitar un crédito de salud fotografiando los documentos **sin que ninguna imagen salga del dispositivo**: la solicitud queda en cola y viaja al banco con wifi (directo) o, sin internet, por el nodo del pueblo.

## Retos a los que aplica
- **General** (podio 6,000): conectividad intermitente, datos sensibles, trabajo en campo. Transporte de demo: HTTP (wifi al banco o LAN al nodo); Hyperswarm P2P no conectó en las pruebas y no se promete.
- **Tether · QVAC Psy** (1,500): MedPsy redacta la alerta y `OCR_LATIN` lee documentos; ambos con función central. Hardware de demo: iPhone (Android gama media es el usuario del brief; el Xiaomi de prueba aborta Bare). Licencia MIT, log de rendimiento, nombres honestos de modelo.
- **Caja de Ahorros** (1,500): inclusión financiera con conectividad intermitente; documentos y trámites leídos en el dispositivo; la ejecución local como ventaja (el asesor nunca ve la cédula ni el extracto).

## Flujo de usuario (el que se graba)
1. **Alerta local.** Un dataset sintético de mediciones dispara una de las 14 reglas de `ADR-008`; MedPsy 1.7B **solo redacta** el mensaje (prompts en inglés, `ADR-009`); la UI y el disclaimer van en español. Sin diagnóstico.
2. **Resultado.** El historial siempre se lee (alerta o en orden). Desde ahí se puede pedir crédito si hay paquete, y/o subir un examen de laboratorio. Si el examen sale fuera de rango, también se puede pedir crédito. El banco **nunca** recibe el motivo de salud.
3. **Documentos en el dispositivo (crédito).** Foto de cédula, ingresos y extracto. OCR (`OCR_LATIN`) → MedPsy base → JSON → **las fotos se borran**.
4. **Examen de laboratorio.** Opción tras el resultado: foto del papel → OCR → **MedPsy + LoRA `lab-v3`** → `clasificar()` contra el catálogo. El adaptador solo corre aquí; cédula/ingresos/alerta siguen en MedPsy base.
5. **Cola offline.** La solicitud va a SQLite (`cola.ts`) si no hay salida. Al reabrir, se retoma en cuota.
6. **Envío.** Mismo JSON, nunca fotos. Con wifi (modo `local-wifi`): al banco remoto. Sin internet (`local-offline` / `nodo-offline`): LAN al nodo del pueblo.
7. **Respuesta del banco.** Railway corre el mismo motor que `preCalificar()` en el teléfono. Cartera sintética, declarada.
8. **Firma y cierre.** Trazo en pantalla (no es firma electrónica legal; se declara) → desembolso **simulado** → Listo.

## Arquitectura
```
mobile/   Expo + @qvac/sdk 0.18.2 · UI, cámara, OCR, MedPsy, LoRA lab-v3, cola SQLite, HTTP A/B
          core: schemas, prompts, reglas, crédito, laboratorio
nodo/     "nodo del pueblo" (LAN :8788) + banco remoto (Railway)
landing/  Sitio del proyecto + admin mock del banco
data/     9 usuarios sintéticos, documentos de ejemplo (nunca datos reales)
eval/     reglas + paquetes + crédito + alerta + laboratorio
perf/     log estructurado (carga, prompt, tokens, TTFT, throughput, lora)
docs/     brief, checklist, guion, DEMO-OBJETIVO-1, pruebas, decisiones
spikes/   LoRA MedPsy (RESULTADOS.md); el adaptador de corrida 3 vive en mobile/assets/models/
```
Modelos (nombres honestos): MedPsy 1.7B Q8_0 (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) para alerta y extracción de documentos; `OCR_LATIN` para texto; LoRA `lab-v3` (33 MB) solo en examen de lab. SDK **0.18.2** ([`ADR-013`](../.ai/adr/ADR-013-quedarnos-en-sdk-0.18.2.md)).

## Reglas duras
- Inferencia: MedPsy en el teléfono primero. Si no puede (modo `nodo-offline` o fallo), POST de texto al nodo local. Nunca imágenes. Ningún proveedor de IA remoto. El banco solo recibe JSON de crédito, nunca fotos ni el motivo de salud. QVAC `delegate` no es el camino de la demo.
- `README` declara la base preexistente: la plantilla AI Engineering Kit.
- Log de rendimiento (`perf/perf.jsonl`): cada inferencia real registra modelo, cuantización, hardware, tokens, TTFT, tok/s.
- Disclaimers de salud visibles. Validación de entradas antes del modelo. Sin VIH en el demo público.
- Video ≤ 5 min, español, sin login. Grabar con margen. **Demo en iPhone 17 Pro Max.**

## Reparto sugerido
- 0xj4an: mobile (Expo + QVAC), cola, transporte, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco, eval, README y guion.

## Plan por bloques, en orden

0. **Desbloqueo.** Expo + QVAC en iPhone: primer token medido (hecho). OCR en aparato: **aún por verificar**.
1. **Rebanada vertical.** Core + nodo HTTP (hecho).
2. **Flujo completo.** Alerta MedPsy, docs OCR+MedPsy, cola SQLite, envío banco/pueblo, examen+LoRA en código. **Falta corrida iPhone** ([`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md)).
3. **Eval y perf.** Dominio en verde; falta exportar `perf.jsonl` del teléfono.
4. **LoRA.** Spike corrida 3 (lab JSON 5%→68%) **ya en la app** (`lora-lab-v3.gguf`); falta verlo en el iPhone.
5. **Demo y honestidad de transporte.** No prometer Hyperswarm P2P ni QVAC `delegate`; la demo es HTTP (banco o pueblo).
6. **Video** ([`VIDEO.md`](VIDEO.md)), README, licencia y declaración de base.
7. **Colchón.** Metal/GPU, VisionPsy, otro adaptador si hace falta.
