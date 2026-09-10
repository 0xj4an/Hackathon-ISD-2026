# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre de trabajo: **(pendiente)**. Equipo: 0xj4an y Artur.

## Una frase
Una app para personas en zonas rurales de Panamá con señal intermitente, que detecta en el teléfono una señal de riesgo de salud, explica en español qué examen conviene y cuánto cuesta, y permite solicitar un crédito de salud fotografiando los documentos **sin que ninguna imagen salga del dispositivo**: la solicitud queda en cola y viaja al banco cuando hay red o por P2P a través del nodo del corregimiento.

## Retos a los que aplica
- **General** (podio 6,000): conectividad intermitente, datos sensibles, trabajo en campo, uso de Pears para transporte P2P.
- **Tether · QVAC Psy** (1,500): MedPsy redacta la alerta y VisionPsy/OCR lee documentos; ambos con función central. Hardware chico (Android de gama media). Licencia MIT, log de rendimiento, nombres honestos de modelo.
- **Caja de Ahorros** (1,500): inclusión financiera con conectividad intermitente; documentos y trámites leídos en el dispositivo; la ejecución local como ventaja (el asesor nunca ve la cédula ni el extracto).

## Flujo de usuario (el que se graba)
1. **Alerta local.** Un dataset sintético de mediciones (glucosa, presión, pulso, saturación, frecuencia respiratoria, temperatura, peso y estatura) dispara una de las 14 reglas de `ADR-008`; MedPsy 1.7B redacta en español: qué se observa, qué examen conviene, costo aproximado, disclaimer. Sin diagnóstico.
2. **Decisión.** "¿Necesitas ayuda para pagarlo?" → entra el flujo de crédito de salud. El banco **no** recibe el motivo de salud.
3. **Documentos en el dispositivo.** Foto de cédula, comprobante de ingresos (carta laboral o similar) y extracto. OCR (`OCR_LATIN`, plan B VisionPsy-Nano) → LLM extrae campos a JSON con schema → validaciones en código (rangos, consistencia, EXIF) → **las fotos se borran**, queda el JSON firmado localmente.
4. **Cola offline.** La solicitud se guarda en SQLite con estado `pendiente`. Se muestra "sin señal, se enviará cuando haya conexión".
5. **Transporte.** Cuando hay red, o cuando el teléfono descubre por Hyperswarm al **nodo del corregimiento** (laptop del corresponsal), la solicitud viaja cifrada al banco. Demo: Wi-Fi apagado → cola; Wi-Fi encendido o nodo cerca → sale.
6. **Respuesta del banco.** El nodo del banco (mock, modelo de crédito de juguete declarado como tal) devuelve monto, plazo, tasa. Llega por el mismo camino.
7. **Firma.** La persona acepta y firma con un trazo en pantalla (no es firma electrónica legal; se declara).

## Arquitectura
```
mobile/   Expo (Android físico) + @qvac/sdk 0.18.2 · UI, cámara, OCR, LLM, SQLite, cola, cliente Hyperswarm
core/     TypeScript puro compartido: schemas (zod), prompts, validaciones, lógica de cola, datos sintéticos
nodo/     Node: peer Hyperswarm "nodo del corregimiento" + "banco" mock (modelo de crédito de juguete)
data/     datasets sintéticos: mediciones de salud, documentos de ejemplo (nunca datos reales)
eval/     set de evaluación y script reproducible (calidad de extracción, % JSON válido, campos correctos)
perf/     log de rendimiento estructurado (carga, prompt, tokens, TTFT, throughput, hardware)
docs/     brief, guion del video, decisiones
```
Modelos (nombres honestos): `HEALTHCARE_1_7B_MEDICAL_Q8_0` (MedPsy 1.7B, Q8_0) para la alerta; `OCR_LATIN` para documentos; `QWEN3_1_7B_INST_Q4` o el mismo MedPsy para extracción a JSON; opcional `VISIONPSY_NANO_460M_MULTIMODAL_Q8_0_1`. SDK fijado en **0.18.2** (0.19 eliminó la delegación P2P y es breaking; no actualizar).

## Reglas duras
- Ninguna inferencia fuera del dispositivo. El nodo/banco solo recibe JSON, nunca imágenes ni prompts.
- `README` declara la base preexistente: la plantilla AI Engineering Kit.
- Log de rendimiento desde el primer día (`perf/perf.jsonl`): cada inferencia real registra modelo, cuantización, hardware, tokens, TTFT, tok/s.
- Disclaimers de salud visibles. Validación de entradas antes del modelo. Sin VIH en el demo público.
- Video ≤ 5 min, español, sin login. Grabar con margen.

## Reparto sugerido
- 0xj4an: mobile (Expo + QVAC), cola, Hyperswarm, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco mock, eval set, README y guion.

## Plan por bloques, en orden

0. **Desbloqueo.** Expo + QVAC corriendo en el Android: primer token y OCR de una foto. Nada más importa hasta que esto pase.
1. **Rebanada vertical.** Core: schemas y prompts. Nodo: peer que recibe y responde.
2. **Flujo completo, sin UI bonita.** Alerta, fotos, JSON, cola, nodo, respuesta, firma.
3. **Descanso por turnos.** Con el eval set y el perf log corriendo.
4. **Integrar el LoRA y medir.**
5. **P2P y la demo.** UI, validaciones, textos, wifi apagado y encendido.
6. **Video** (guion en `docs/VIDEO.md`)**, README, licencia y declaración de base.**
7. **Colchón.** Extras solo si todo está entregado: LoRA de extracción, VisionPsy.