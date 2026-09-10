# Checklist

`[x]` hecho y comprobado. `[~]` a medias, dice qué falta. `[ ]` sin empezar.

Ordenado por lo que decide el resultado, no por horario. El detalle de cada
punto está en [`02-stack-y-plan.md`](../.ai/runs/mvp-hackathon/02-stack-y-plan.md).

Auditado contra el código el **10 sep 2026** (HEAD de trabajo). Los evals de
dominio pasan; lo que falta es **evidencia en el iPhone** y cola durable.

## Dónde estamos

El dominio está terminado y medido: 14 señales con fuente, **nueve** casos
clínicos, modelo de crédito con scorecard entrenado, `eval/run.mjs` y el
contrato del crédito en verde sin tocar un teléfono. Trece pantallas en
`mobile/src/` (once cableadas en `App.tsx`; `PantallaDatos` y `PantallaUsuarios`
siguen en el repo fuera del camino de la demo). Guion de video escrito;
documentos sintéticos listos con su ground truth.

En código, la rama de salud ya pide a MedPsy la redacción (`redactarAlerta` →
`SYSTEM_ALERTA` + `AlertaSchema`), la de documentos lee con OCR + MedPsy
(`leerDocumento.ts`), el envío HTTP camino A/B existe, y `perf/logger` escribe
desde esos flujos. El LoRA del spike se midió otra vez (tres corridas en
`spikes/lora-medpsy/RESULTADOS.md`).

Lo que falta no es “inventar el producto”, es **cerrar en el aparato**. La
única corrida registrada de documentos en iPhone terminó en `invalid input`:
el OCR rechazó la foto. Hay un arreglo escrito (JPEG compatible, base64) que
**nadie ha visto funcionar todavía**. Ver [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).
Sin esa corrida no se graba el video, y C6–C10 siguen abiertos en la práctica.

---

## 1. Lo que decide el resultado

Tres cosas, en este orden.

### 1.1 El modelo tiene que entrar al producto

Technical pesa 35% y mide **uso genuino de QVAC**. Ambas ramas ya lo invocan en
código. Falta carga única al arrancar y líneas reales de `perf.jsonl` en el
aparato.

- [x] `PantallaAlerta` invoca MedPsy vía `redactarAlerta()` con `SYSTEM_ALERTA` y
  valida con `AlertaSchema`. Las reglas siguen decidiendo la señal; el modelo
  redacta el mensaje. Si MedPsy falla, la UI muestra el texto de reglas
- [ ] El modelo se carga una vez al arrancar, no por pantalla. Hoy es lazy +
  `soltarMedPsy` tras alerta/documentos. `ADR-007` dice que la descarga no
  bloquea el onboarding
- [x] `perf/logger.ts` conectado al flujo de producto (`medpsy.ts`,
  `leerDocumento.ts`, `redactarAlerta.ts`, envíos/errores). SmokeTest ya no es
  el único consumidor. Falta exportar `perf/perf.jsonl` de una corrida real en
  el iPhone (entregable Tether Psy)

### 1.2 La rama de documentos ya lee; falta cola durable y prueba en iPhone

`PantallaDocumentos` toma foto o archivo, corre `ocr()` + MedPsy → JSON y borra
la copia (`leerDocumento.ts`). MedPsy es local primero; si no carga, el texto
va al pueblo. Sigue `PantallaLeido`, la cuota con `preCalificar()` y el envío:
**camino A** al banco remoto si hay wifi, **camino B** al nodo del pueblo si
no. HTTP A/B medido desde laptop ([`PRUEBA-NODO.md`](PRUEBA-NODO.md)); desde el
iPhone, no.

`PantallaDatos.tsx` (editable, deudas y personas a cargo) sigue en el repo; el
camino de la demo no pasa por ella.

La rama del examen **no** tiene OCR todavía: `PantallaExamen.tsx` sigue con el
comentario *"Cuando `ocr()` exista"* y entrada manual + `clasificar()`.

- [~] `ocr()` sobre la foto, extracción a JSON con `SYSTEM_EXTRACCION_*`,
  validación con `CedulaSchema` e `IngresosSchema`. Código listo; falta
  verificar en el iPhone
- [~] **Borrar la foto** después de extraer. El código lo hace; falta verificar
  en el iPhone (C6)
- [ ] Persistencia y cola. `expo-sqlite` está en dependencias y en el plugin de
  Expo, pero **no se importa** en `mobile/src`. `pendiente` hoy es estado en
  memoria + UI en `PantallaCuota` (se pierde al matar la app)
- [~] Envío: camino A al banco (Railway) si hay wifi; camino B al pueblo si no.
  Código en `envio.ts`; medido sin teléfono; falta el iPhone

Material listo: `data/documentos/` tiene los seis ficticios (nítido y difícil)
más `esperado.json`. Cada corrida en el iPhone se anota en
[`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

### 1.3 P2P no conecta

Hyperswarm entre dos procesos del Mac no conecta (NAT, `firewalled`, sin mDNS).
La demo de crédito va por HTTP en la LAN. Inferencia: MedPsy en el teléfono;
si no puede, HTTP de texto al pueblo. QVAC `delegate` no es el plan (NAT).

- [ ] Decidir: o se hace andar el transporte, o el guion del video no promete P2P
  y se explica por qué. Lo segundo es honesto y barato; lo primero suma en
  Technical. El guion ya advierte no decir “Hyperswarm P2P” si la demo salió
  por HTTP
- [x] El video no promete QVAC `delegate`. El respaldo de MedPsy es HTTP al pueblo

---

## 2. La demo tiene que correr entera

- [ ] Wi-Fi apagado: la solicitud queda en cola y la app lo dice (hoy: en
  memoria; sin SQLite no sobrevive un kill)
- [ ] Wi-Fi encendido: la solicitud sale, el banco responde, la respuesta vuelve
- [ ] **Ensayarla tres veces seguidas** con el iPhone en la mano. Lo que falla,
  falla aquí y no grabando
- [~] Disclaimers de salud visibles **en pantalla**: fuertes en Alerta y Examen;
  faltan en Salud / Revisión

---

## 3. Entregables

- [x] Guion en `docs/VIDEO.md`, minuto a minuto y con cifras (verificar tasa/
  cuota contra `decidir()` antes de grabar: **17.4% / B/. 84.08** para 920)
- [ ] Video <= 5 min, español, enlace sin login. Es lo primero que mira el
  jurado del reto General
- [ ] `perf/perf.jsonl` con una línea por inferencia real del iPhone (logger ya
  escribe; falta la corrida exportada)
- [x] README: modelo, cuantización, hardware, base preexistente y fila de
  extracción a JSON
- [x] **Declarar la base preexistente**: plantilla AI Engineering Kit

---

## 4. LoRA (spike medido; no en producto)

`RESULTADOS.md` se retiró en `248476d` por no ser reproducible; **volvió** con
tres corridas documentadas en `spikes/lora-medpsy/RESULTADOS.md` (corrida 3:
laboratorio JSON válido 5% → 68%). El adaptador **no** está cargado en la app.

- [x] Entrenar con evidencia (corridas 1–3; `caffeinate` + lecciones del sueño)
- [x] Tabla base contra LoRA en el spike (cierra la evidencia de C11 a nivel
  spike; no a nivel producto)
- [ ] Cargar el adaptador en la app y re-medir en el iPhone — solo si sobra
  tiempo y lab OCR entra al flujo de Examen

---

## 5. Lo que ya está

### Dominio

- [x] 14 señales sobre 9 variables, cada una con su `fuente`. Ver [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md) y [`salud.md`](../.ai/references/salud.md)
- [x] Costos con fuente en rangos publicados; donde no hay precio citable, el campo va ausente y la pantalla no muestra número
- [x] El especialista entró en el tipo `Ruta`, con qué hacer ahora, qué examen, dónde y qué síntomas obligan a ir de inmediato
- [x] CD4 fuera, con filtro de respaldo en el generador del spike
- [x] Nueve casos clínicos en `data/usuarios/` con historial de ~un año. Cubren las 14 señales de vía A. El sano da cero señales. **8 de 9** ofrecen crédito
- [x] Modelo de crédito real ([`ADR-011`](../.ai/adr/ADR-011-el-modelo-de-credito.md)): capacidad de pago con piso de subsistencia, scorecard logístico sobre cartera sintética (AUC 0.723, KS 0.379 en holdout), tasa descompuesta y plazo despejado de la cuota
- [x] Paquete por condición a un año en vez de un monto suelto ([`ADR-010`](../.ai/adr/ADR-010-el-paquete-y-cuando-ofrecer-credito.md))
- [x] 15 lienzos en `docs/design/` y dirección visual decidida ([`ADR-012`](../.ai/adr/ADR-012-senaletica-y-el-modo-denso.md))
- [x] `data/documentos/`: seis imágenes sintéticas (nítida y difícil de cada documento) más `esperado.json`
- [~] Los tres documentos y sus campos están decididos, y `PantallaDatos.tsx` ya captura `deudas_mensuales_usd` y `personas_a_cargo`. Falta **qué pasa si falta uno** y meter Datos en el camino de la demo si se quiere

### Implementación

- [x] Las dos vías de detección en `mobile/src/core/`, evaluadas por `eval/run.mjs`
- [x] `eval/run.mjs` cubre vía A, vía B e integridad de rutas. Determinista, sin teléfono, exit 1 si algo falla
- [x] `eval/credito/*.test.mjs` (58 tests) llama al motor real y valida contrato/schemas; `eval/salud/alerta.test.mjs` y `eval/nodo/inferir.test.mjs` en verde
- [x] El nodo importa el motor de crédito en vez de tener su propia política
- [x] Trece `Pantalla*.tsx`; navegación en `App.tsx` (Entrada → … → Banco; Examen y Registro laterales)
- [x] La cuota se calcula **en el teléfono y sin señal**: `PantallaLeido` muestra lo extraído, `PantallaCuota` corre `preCalificar()` y `PantallaBanco` muestra `decidir()`
- [x] `data/generar-usuarios.mjs` produce el formato normalizado; casos embebidos en `mobile/src/datos/`
- [x] `core/` unificado en `mobile/src/core/`, sin duplicado en la raíz
- [x] Sentry cableado (init compartido, breadcrumbs, hooks EAS)
- [x] Landing + admin del banco (`landing/`)

### Bloque 0, cerrado en iPhone

Cerrado en iPhone 17 Pro Max (iOS 26.6.1), no en el Xiaomi 14T Pro. El 14T
(HyperOS 3 / Android 16) aborta en `libbare-kit.so` al `worklet.start`. Android
queda aparcado.

- [x] Dispositivo emparejado, modo desarrollador y certificado confiados
- [x] Los 2.1 GB de MedPsy en caché QVAC del iPhone
- [x] `expo run:ios --device --configuration Release`: Bare arranca, `loadModel` en CPU, primer token. `load_ms` 93722, **TTFT 2915 ms**, 56 tokens
- [x] HTTP del nodo OK (desde laptop; ver PRUEBA-NODO)

---

## Criterios de entrega

| | Criterio | Estado |
| --- | --- | --- |
| [x] C1 | MedPsy carga en el iPhone y produce texto | `load_ms` 93722, TTFT 2915 ms CPU, 56 tokens |
| [ ] C2 | TTFT con `gpu` y `cpu`, se usa el mejor | Solo `cpu`. Falta Metal |
| [x] C3 | La vía A dispara con el caso con hallazgo | `eval/run.mjs` exit 0 |
| [x] C3b | La vía B clasifica en los tres estados | Los 7 marcadores |
| [x] C3c | **El sano no dispara ninguna alerta** | Cero señales |
| [x] C3d | CD4 no aparece en pantalla ni en el video | Fuera del código. Revisar guion al grabar |
| [x] C4 | Toda salida del modelo pasa por `limpiarJson()` | Cero `JSON.parse` sueltos en `mobile/src/` |
| [~] C5 | La alerta valida contra `AlertaSchema` | Código listo (`redactarAlerta`). Falta verlo en el iPhone |
| [~] C6 | La foto se borra tras extraer | Código en `leerDocumento.ts`. Falta verificar en el iPhone |
| [~] C7 | Ninguna imagen ni dato clínico sale del teléfono | Schema del banco rechaza motivo/foto (`eval` + PRUEBA-NODO). Falta E2E en iPhone |
| [ ] C8 | Con Wi-Fi apagado queda `pendiente` y se dice | UI parcial; sin SQLite no es cola durable |
| [ ] C9 | Al volver la red, sale y vuelve la respuesta | Poll en memoria; falta prueba en iPhone + cola durable |
| [ ] C10 | `perf.jsonl` con una línea por inferencia | Logger cableado; falta export de corrida real |
| [~] C11 | Tabla base contra LoRA | Spike medido (RESULTADOS.md). Adaptador no en producto |
| [x] C12 | **Cero llamadas a proveedores de IA remotos** | Verificado en `mobile/src`, `nodo`, `eval`, `data`. Repetir sobre el bundle antes de entregar |
| [x] C13 | README declara modelo, cuantización, hardware y base | MedPsy Q8_0, OCR_LATIN, extracción = MedPsy, iPhone 17 Pro Max, Kit declarado |

**C12 y C13 descalifican.** Los demás cuestan puntos. El cuello de botella
ahora es **1.2 en el iPhone** (OCR + envío E2E) y la cola durable (C8/C9).

---

## Decisiones abiertas

- [x] D1 ¿MedPsy carga on-device? **Sí**, iPhone 17 Pro Max, CPU, Q8_0
- [x] D3 ¿HyperOS pide cuenta Mi? **Aparcado**, ya no usamos el Xiaomi
- [ ] D2 ¿`gpu` o `cpu`? Solo CPU medido. Falta Metal en el iPhone
- [ ] D5 ¿`finetune()` corre en el dispositivo? Solo si todo lo demás está entregable
- [ ] D7 ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0?
- [ ] D11 ¿Se recupera el transporte P2P, o el video no lo promete? Ver 1.3
  (guion ya recomienda no prometerlo si la demo fue HTTP)
