# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre: **Ina Igar** ("camino de la medicina" en gunagaya). Equipo: 0xj4an y Artur.

## Una frase
Una app para personas en zonas rurales de Panamá con señal intermitente, que detecta en el teléfono una señal de riesgo de salud, explica en español qué examen conviene y cuánto cuesta, y permite solicitar un crédito de salud fotografiando los documentos **sin que ninguna imagen salga del dispositivo**: la solicitud queda en cola y viaja al banco: por wifi directo (camino A) o, sin internet, por el nodo del pueblo (camino B).

## Retos a los que aplica
- **General** (podio 6,000): conectividad intermitente, datos sensibles, trabajo en campo. Transporte de demo: HTTP (wifi o LAN al nodo); Hyperswarm P2P no conectó en las pruebas.
- **Tether · QVAC Psy** (1,500): MedPsy redacta la alerta y `OCR_LATIN` lee documentos; ambos con función central. Hardware de demo: iPhone (Android gama media es el usuario del brief; el Xiaomi de prueba aborta Bare). Licencia MIT, log de rendimiento, nombres honestos de modelo.
- **Caja de Ahorros** (1,500): inclusión financiera con conectividad intermitente; documentos y trámites leídos en el dispositivo; la ejecución local como ventaja (el asesor nunca ve la cédula ni el extracto).

## Flujo de usuario (el que se graba)
1. **Alerta local.** Un dataset sintético de mediciones (glucosa, presión, pulso, saturación, frecuencia respiratoria, temperatura, peso y estatura) dispara una de las 14 reglas de `ADR-008`; MedPsy 1.7B redacta en español: qué se observa, qué examen conviene, costo aproximado, disclaimer. Sin diagnóstico.
2. **Decisión.** "¿Necesitas ayuda para pagarlo?" -> entra el flujo de crédito de salud. El banco **no** recibe el motivo de salud.
3. **Documentos en el dispositivo.** Foto de cédula, comprobante de ingresos (carta laboral o similar) y extracto. OCR (`OCR_LATIN`) -> MedPsy extrae campos a JSON con schema -> validaciones en código -> **las fotos se borran**, queda el JSON.
4. **Cola offline.** La solicitud debe guardarse con estado `pendiente` y decir "sin señal, se enviará cuando haya conexión". Hoy la UI marca pendiente en memoria; falta SQLite durable.
5. **Transporte.** Dos caminos, el mismo JSON, nunca fotos. **Camino A:** hay wifi o datos → el teléfono POST al banco remoto. **Camino B:** no hay internet → LAN al nodo del pueblo; él se la lleva al banco cuando tiene salida.
6. **Respuesta del banco.** El banco remoto (Railway) corre el mismo motor que el teléfono usa para precalificar. Cartera sintética, declarada. La respuesta vuelve por el camino por el que salió.
7. **Firma.** La persona acepta y firma con un trazo en pantalla (no es firma electrónica legal; se declara).

## Arquitectura
```
mobile/   Expo + @qvac/sdk 0.18.2 · UI, cámara, OCR, MedPsy, cola (pendiente SQLite), HTTP A/B
          core compartido en mobile/src/core/: schemas (zod), prompts, reglas, crédito
nodo/     Node: "nodo del pueblo" (camino B, LAN :8788) y arranque del banco remoto
          (el motor vive en mobile/src/core/credito/; raíz package.json = Railway)
landing/  Sitio del proyecto + admin mock del banco
data/     datasets sintéticos: 9 usuarios, documentos de ejemplo (nunca datos reales)
eval/     reglas + paquetes + crédito (run.mjs) y tests de contrato/alerta/nodo
perf/     log de rendimiento estructurado (carga, prompt, tokens, TTFT, throughput)
docs/     brief, checklist, guion, pruebas en teléfono/nodo, decisiones
spikes/   LoRA MedPsy medido (RESULTADOS.md); no va al producto todavía
```
Modelos (nombres honestos): `HEALTHCARE_1_7B_MEDICAL_Q8_0` (MedPsy 1.7B, Q8_0) para alerta y extracción a JSON; `OCR_LATIN` para documentos. SDK fijado en **0.18.2** ([`ADR-013`](../.ai/adr/ADR-013-quedarnos-en-sdk-0.18.2.md)).

## Reglas duras
- Inferencia: MedPsy en el teléfono primero. Si no puede, POST de texto al nodo local. Nunca imágenes. Ningún proveedor de IA remoto. El banco solo recibe JSON de crédito, nunca fotos ni el motivo de salud.
- `README` declara la base preexistente: la plantilla AI Engineering Kit.
- Log de rendimiento (`perf/perf.jsonl`): cada inferencia real registra modelo, cuantización, hardware, tokens, TTFT, tok/s.
- Disclaimers de salud visibles. Validación de entradas antes del modelo. Sin VIH en el demo público.
- Video ≤ 5 min, español, sin login. Grabar con margen. **Demo en iPhone 17 Pro Max.**

## Reparto sugerido
- 0xj4an: mobile (Expo + QVAC), cola, transporte, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco, eval, README y guion.

## Plan por bloques, en orden

0. **Desbloqueo.** Expo + QVAC en el iPhone: primer token medido. OCR de una foto: código listo, **falta verificar en el aparato**.
1. **Rebanada vertical.** Core: schemas y prompts. Nodo: HTTP que recibe y responde (hecho).
2. **Flujo completo.** Alerta con MedPsy, fotos, JSON, envío A/B, respuesta, firma. Falta cola durable + prueba iPhone.
3. **Eval y perf.** Dominio en verde; falta `perf.jsonl` exportado del teléfono.
4. **LoRA.** Spike medido (lab JSON 5%→68%). Integrar al producto solo si sobra tiempo.
5. **Demo y honestidad de transporte.** UI, wifi apagado/encendido; no prometer P2P si no corre.
6. **Video** (guion en `docs/VIDEO.md`)**, README, licencia y declaración de base.**
7. **Colchón.** Metal/GPU, VisionPsy, adaptador LoRA en app.
