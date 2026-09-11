# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre: **Ina Igar** ("Camino de la medicina" en gunagaya). Equipo: 0xj4an y Artur.

## Una frase
App de salud y crédito para quien vive lejos, con señal intermitente. Lee Apple
Salud, Health Connect o un papel de laboratorio. Catorce umbrales. MedPsy
redacta la ruta y el costo (`ADR-009`). El crédito es ese monto. OCR de cédula
e ingresos **sin que ninguna imagen salga**. Si este teléfono no corre 2.1 GB,
QVAC `delegate` al pueblo. El JSON del crédito va al banco con wifi, o al nodo
si no hay.

## Retos a los que aplica
- **General** (podio 6,000): conectividad intermitente, datos sensibles, trabajo
  en campo. Tres caminos: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).
- **Tether · QVAC Psy** (1,500): MedPsy redacta; `OCR_LATIN` lee documentos;
  LoRA `lab-v3` parsea el examen (JSON válido 5 % → 68 %). Delegate P2P cuando
  el aparato no carga el modelo. MIT, log de rendimiento, nombres honestos.
- **Caja de Ahorros** (1,500): inclusión con señal intermitente; documentos en
  el dispositivo; el asesor nunca ve la cédula ni el extracto. El monto es la
  ruta, no un mínimo de consumo.

## Flujo de usuario (el que se graba)

Camino en app: Entrada → **Salud** → **Revisión** → Alerta (si hay señal) →
crédito y/o examen → documentos → cuota → banco → firma → desembolso.

1. **Historial y alerta.** Apple Salud / Health Connect, o dataset de demo con
   el mismo esquema. Reglas `ADR-008`; MedPsy **solo redacta** (`ADR-009`). UI
   y disclaimer en español. Sin diagnóstico.
2. **Resultado.** Ruta (casa, lab, centro) y precio del año. Crédito por ese
   monto. El banco **nunca** recibe el motivo de salud.
3. **Documentos.** Foto cédula / ingresos / extracto. OCR aquí. MedPsy extrae
   en el teléfono o, sin capacidad, se delega al nodo. **Fotos se borran**.
4. **Examen de laboratorio.** OCR aquí → **MedPsy + LoRA `lab-v3`**. En
   `nodo-offline` el nodo corre MedPsy; la UI nombra el fine-tune. Rangos:
   `clasificar()`, no el modelo.
5. **Cola offline.** SQLite si no hay salida; al reabrir se retoma en cuota.
6. **Envío.** Mismo JSON, nunca fotos. WiFi: banco (pueblo si hace falta). Sin
   red: LAN al pueblo. Inferencia: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).
7. **Respuesta del banco.** Mismo motor que `preCalificar()` / `decidir()`.
   Persistencia vía `STATE_DIR`. Admin: hora + canal. URLs: [`ESTADO.md`](ESTADO.md).
8. **Firma y cierre.** Trazo en pantalla → desembolso de muestra → Listo.
   Origination y desembolso en producción son el siguiente tramo.

## Arquitectura
```
mobile/   Expo + @qvac/sdk 0.18.2 · UI, cámara, OCR, MedPsy, LoRA lab-v3,
          QVAC delegate, cola, HTTP · cinta de modo + consola negra · core/
nodo/     pueblo LAN :8788 + /inferir + /consola; banco remoto (Railway)
landing/  sitio + pitch + admin
data/ eval/ perf/ docs/ spikes/
```
Detalle vivo y URLs: [`ESTADO.md`](ESTADO.md). Índice: [`README.md`](README.md).
Modelos: MedPsy 1.7B Q8_0, `OCR_LATIN`, LoRA `lab-v3`. SDK **0.18.2**
([`ADR-013`](../.ai/adr/ADR-013-quedarnos-en-sdk-0.18.2.md)).

Producto: Android + Health Connect. Demo de hoy: **iPhone 17 Pro Max**.

## Reglas duras
- Inferencia y solicitud son tuberías distintas ([`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md)).
  Nunca imágenes ni proveedores de IA remotos. Banco: solo JSON de crédito.
- `README` declara la base preexistente: la plantilla AI Engineering Kit.
- Log de rendimiento (`perf/perf.jsonl`): cada inferencia real registra modelo,
  cuantización, hardware, tokens, TTFT, tok/s.
- Disclaimers de salud visibles. Validación de entradas antes del modelo. Sin
  VIH en el demo público.
- Video ≤ 5 min, español, sin login. Grabar con margen.

## Siguiente (el producto sigue)
- Banco: origination y desembolso en producción. El scorecard ya es el mismo.
- LoRA: un adaptador por cédula, ingresos, extracto y más paneles.
- Malla: topic entre pueblos. Delegate ya presta cómputo (72× `@p2p-delegate`).
- Campo: Health Connect / HealthKit en vivo en Android de gama media.

## Reparto sugerido
- 0xj4an: mobile (Expo + QVAC), cola, transporte, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco, eval, README y guion.

Abierto / foto viva: [`CHECKLIST.md`](CHECKLIST.md), [`ESTADO.md`](ESTADO.md).
Ensayo previo al video: [`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md).
Guion: [`VIDEO.md`](VIDEO.md).

## Texto para Dojo (pegar)

**Short description**

Ina Igar: cualquier hallazgo, una ruta, un crédito. MedPsy, OCR, LoRA y QVAC delegate en el teléfono o en el pueblo. Las fotos no salen. El banco ve un JSON.

**Description**

App de salud y crédito para quien vive lejos, con señal intermitente.

Lee Apple Salud, Health Connect o un papel de laboratorio. Catorce umbrales citados. Las reglas marcan el rango. MedPsy redacta qué se vio, qué hacer, a quién ver y cuánto cuesta el año. El caso sano no dispara. No es diagnóstico.

El crédito es ese monto —consulta, controles, medicamento— no un mínimo de consumo. OCR de cédula, ingresos y extracto en el aparato. Las fotos se borran. El banco recibe JSON: nunca la imagen ni el hallazgo clínico.

Tres caminos. WiFi: MedPsy aquí, JSON al banco. Sin red: la alerta no se apaga; el crédito va al pueblo. Si este teléfono no corre 2.1 GB: QVAC delegate, el pueblo presta el cómputo.

LoRA lab-v3: JSON válido de laboratorio 5 % → 68 %. Delegate medido 72 veces. Eval 9/9.

Siguiente: origination real, un LoRA por documento, malla de pueblos, Health Connect en Android de gama media.

Sitio: https://isd-hackathon-landing-production.up.railway.app/
Pitch: https://isd-hackathon-landing-production.up.railway.app/pitch
Repo: https://github.com/0xj4an/Hackathon-ISD-2026

