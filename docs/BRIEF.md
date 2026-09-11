# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre: **Ina Igar** ("Camino de la medicina" en gunagaya). Equipo: 0xj4an y Artur.

## Una frase
Una app para personas en zonas rurales de Panamá con señal intermitente, que detecta en el teléfono una señal de riesgo de salud, muestra en español qué examen conviene y cuánto cuesta (MedPsy redacta el mensaje en inglés, `ADR-009`), y permite solicitar un crédito de salud fotografiando los documentos **sin que ninguna imagen salga del dispositivo**. Inferencia: en el teléfono si hay capacidad; si no, se delega al nodo. Solicitud: al banco con WiFi, o por el nodo si no hay.

## Retos a los que aplica
- **General** (podio 6,000): conectividad intermitente, datos sensibles, trabajo en campo. Tres caminos: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).
- **Tether · QVAC Psy** (1,500): MedPsy redacta la alerta y `OCR_LATIN` lee documentos; ambos con función central. Hardware de demo: iPhone (Android gama media es el usuario del brief; el Xiaomi de prueba aborta Bare). Licencia MIT, log de rendimiento, nombres honestos de modelo.
- **Caja de Ahorros** (1,500): inclusión financiera con conectividad intermitente; documentos y trámites leídos en el dispositivo; la ejecución local como ventaja (el asesor nunca ve la cédula ni el extracto).

## Flujo de usuario (el que se graba)

Camino en app: Entrada → **Salud** → **Revisión** → Alerta (si hay señal) → …
(crédito y/o examen) → documentos → cuota → banco → firma → desembolso.

1. **Historial y alerta.** Dataset sintético → reglas `ADR-008`; MedPsy **solo
   redacta** (`ADR-009`). UI y disclaimer en español. Sin diagnóstico.
2. **Resultado.** Desde ahí: crédito si hay paquete, y/o examen de lab. Si el
   lab sale fuera de rango, también crédito. El banco **nunca** recibe el motivo
   de salud.
3. **Documentos.** Foto cédula / ingresos / extracto. OCR aquí. MedPsy extrae
   en el teléfono o, sin capacidad, se delega al nodo. **Fotos se borran**.
4. **Examen de laboratorio.** OCR aquí → **MedPsy + LoRA `lab-v3`** en el
   teléfono (carga y resultados lo nombran). En `nodo-offline` el nodo corre
   MedPsy; la UI sigue nombrando LoRA lab-v3. Rangos: `clasificar()`, no el
   modelo.
5. **Cola offline.** SQLite si no hay salida; al reabrir se retoma en cuota.
6. **Envío.** Mismo JSON, nunca fotos. `local-wifi`: banco Railway (luego
   pueblo si hace falta). `local-offline` y `nodo-offline`: LAN al pueblo.
   Discovery: sweep HTTP, sin IP fija. Inferencia: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).
7. **Respuesta del banco.** Mismo motor que `preCalificar()` / `decidir()`.
   Persistencia vía `STATE_DIR`. Admin: hora + canal. URLs: [`ESTADO.md`](ESTADO.md).
8. **Firma y cierre.** Trazo (no firma electrónica legal) → desembolso
   **simulado** → Listo.

## Arquitectura
```
mobile/   Expo + @qvac/sdk 0.18.2 · UI, cámara, OCR, MedPsy, LoRA lab-v3, cola, HTTP
          cinta de modo + consola negra · descubrimiento LAN · core/
nodo/     pueblo LAN :8788 + /inferir + /consola; banco remoto (Railway)
landing/  sitio + admin
data/ eval/ perf/ docs/ spikes/
```
Detalle vivo y URLs: [`ESTADO.md`](ESTADO.md). Índice: [`README.md`](README.md).
Modelos: MedPsy 1.7B Q8_0, `OCR_LATIN`, LoRA `lab-v3` (examen). SDK **0.18.2**
([`ADR-013`](../.ai/adr/ADR-013-quedarnos-en-sdk-0.18.2.md)).

## Reglas duras
- Inferencia y solicitud son tuberías distintas ([`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md)). Nunca imágenes ni proveedores de IA remotos. Banco: solo JSON de crédito.
- `README` declara la base preexistente: la plantilla AI Engineering Kit.
- Log de rendimiento (`perf/perf.jsonl`): cada inferencia real registra modelo, cuantización, hardware, tokens, TTFT, tok/s.
- Disclaimers de salud visibles. Validación de entradas antes del modelo. Sin VIH en el demo público.
- Video ≤ 5 min, español, sin login. Grabar con margen. **Demo en iPhone 17 Pro Max.**

## Reparto sugerido
- 0xj4an: mobile (Expo + QVAC), cola, transporte, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco, eval, README y guion.

Abierto / foto viva: [`CHECKLIST.md`](CHECKLIST.md), [`ESTADO.md`](ESTADO.md).
Ensayo previo al video: [`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md).
Guion: [`VIDEO.md`](VIDEO.md).
