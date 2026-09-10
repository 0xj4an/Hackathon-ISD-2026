# Checklist

`[x]` hecho y comprobado. `[~]` a medias, dice qué falta. `[ ]` sin empezar.

Ordenado por lo que decide el resultado, no por horario. El detalle de cada
punto está en [`02-stack-y-plan.md`](../.ai/runs/mvp-hackathon/02-stack-y-plan.md).

## Dónde estamos

El dominio está terminado y medido: 14 señales con fuente, seis casos clínicos,
modelo de crédito con scorecard entrenado, `eval/run.mjs` y el contrato del
crédito pasan en verde sin tocar un teléfono. Catorce pantallas, guion de video
escrito, documentos sintéticos listos con su ground truth.

Lo que falta no es código, es **evidencia en el aparato**. La única corrida
registrada en un iPhone con la rama de documentos terminó en `invalid input`:
el OCR rechazó la foto. Hay un arreglo escrito (JPEG compatible, base64 en vez
de `Uint8Array`) que **nadie ha visto funcionar todavía**. Ver
[`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

Mientras eso no se repita en el teléfono, seis criterios siguen sin poder
cerrarse y el video no se puede grabar.

---

## 1. Lo que decide el resultado

Tres cosas, en este orden.

### 1.1 El modelo tiene que entrar al producto

Technical pesa 35% y mide **uso genuino de QVAC**. La rama de documentos ya
lo usa de verdad (OCR + MedPsy en `leerDocumento.ts`). La de salud no: detecta
con reglas y muestra el resultado sin pasarlo por el modelo.

- [ ] `PantallaAlerta` invoca `completion()` con `SYSTEM_ALERTA` y valida con `AlertaSchema`. Hoy muestra solo la salida de las reglas
- [ ] El modelo se carga una vez al arrancar, no por pantalla. `ADR-007` dice que la descarga no bloquea el onboarding
- [ ] `perf/logger.ts` se conecta al flujo de producto. Hoy solo lo importa `SmokeTest.tsx`, así que `perf/perf.jsonl` solo tendría líneas del smoke, y es **entregable obligatorio** de Tether Psy

### 1.2 La rama de documentos ya lee; falta cola y envío

`PantallaDocumentos` toma foto o archivo, corre `ocr()` + MedPsy → JSON y borra
la copia (`leerDocumento.ts`). MedPsy es local primero; si no carga, el texto
va al pueblo. Sigue `PantallaLeido`, la cuota con `preCalificar()`
y el envío: **camino A** al banco remoto si hay wifi, **camino B** al nodo del
pueblo si no. Falta verificar en el iPhone.

`PantallaDatos.tsx` (pantalla 11 del mapa, editable, deudas y personas a cargo)
sigue en el repo; el camino de la demo no pasa por ella todavía.

La rama del examen tiene el mismo hueco de lectura y lo dice en un comentario
de `PantallaExamen.tsx`: *"Cuando `ocr()` exista"*.

- [~] `ocr()` sobre la foto, extracción a JSON con `SYSTEM_EXTRACCION_*`, validación con `CedulaSchema` e `IngresosSchema`. Código listo; falta verificar en el iPhone
- [~] **Borrar la foto** después de extraer. El código lo hace; falta verificar en el iPhone (C6)
- [ ] Persistencia y cola. `expo-sqlite` no se importa en ninguna parte y `pendiente` hoy es solo un estilo de texto
- [ ] Envío: camino A al banco (Railway) si hay wifi; camino B al pueblo si no. Código listo; falta el iPhone

Material listo para probarlo: `data/documentos/` tiene los seis ficticios
(nítido y difícil de cada uno) más `esperado.json` como ground truth.
Cada corrida en el iPhone se anota en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md):
lo que pasó, lo que falló, el error literal y el SHA.

### 1.3 P2P no conecta

Hyperswarm entre dos procesos del Mac no conecta (NAT, `firewalled`, sin mDNS).
La demo de crédito va por HTTP en la LAN. Inferencia: MedPsy en el teléfono;
si no puede, HTTP de texto al pueblo. QVAC `delegate` no es el plan (NAT).

- [ ] Decidir: o se hace andar el transporte, o el guion del video no promete P2P y se explica por qué. Lo segundo es honesto y barato; lo primero suma en Technical
- [ ] El video no promete QVAC `delegate`. El respaldo de MedPsy es HTTP al pueblo

---

## 2. La demo tiene que correr entera

- [ ] Wi-Fi apagado: la solicitud queda en cola y la app lo dice
- [ ] Wi-Fi encendido: la solicitud sale, el banco responde, la respuesta vuelve
- [ ] **Ensayarla tres veces seguidas** con el iPhone en la mano. Lo que falla, falla aquí y no grabando
- [ ] Disclaimers de salud visibles **en pantalla**, no en el README

---

## 3. Entregables

- [x] Guion en `docs/VIDEO.md`, 223 líneas, minuto a minuto y con las cifras verificadas
- [ ] Video <= 5 min, español, enlace sin login. Es lo primero que mira el jurado del reto General
- [ ] `perf/perf.jsonl` con una línea por inferencia real (ver 1.1)
- [x] README: modelo, cuantización, hardware, base preexistente y fila de extracción a JSON
- [x] **Declarar la base preexistente**: una línea, la plantilla AI Engineering Kit. Omitirlo descalifica

---

## 4. Si sobra tiempo: el LoRA

No es núcleo, es capa de las últimas horas. `RESULTADOS.md` se retiró en
`248476d` por no ser reproducible; los números de esta corrida van en uno nuevo.

- [ ] Entrenar con `caffeinate -i`, o el Mac se duerme como en el spike
- [ ] Cargar el adaptador y volver a correr la evaluación
- [ ] **La tabla antes/después.** Si se llega, es el activo más fuerte para Technical y para "calidad de dominio medible" de Tether Psy

---

## 5. Lo que ya está

### Dominio

- [x] 14 señales sobre 9 variables, cada una con su `fuente`. Ver [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md) y [`salud.md`](../.ai/references/salud.md)
- [x] Costos con fuente en rangos publicados; donde no hay precio citable, el campo va ausente y la pantalla no muestra número
- [x] El especialista entró en el tipo `Ruta`, con qué hacer ahora, qué examen, dónde y qué síntomas obligan a ir de inmediato
- [x] CD4 fuera, con filtro de respaldo en el generador del spike
- [x] Nueve casos clínicos en `data/usuarios/` con historial de ~un año. Cubren las 14 señales de vía A. El sano da cero señales
- [x] Modelo de crédito real ([`ADR-011`](../.ai/adr/ADR-011-el-modelo-de-credito.md)): capacidad de pago con piso de subsistencia, scorecard logístico sobre cartera sintética (AUC 0.723, KS 0.379 en holdout), tasa descompuesta y plazo despejado de la cuota
- [x] Paquete por condición a un año en vez de un monto suelto ([`ADR-010`](../.ai/adr/ADR-010-el-paquete-y-cuando-ofrecer-credito.md))
- [x] 15 lienzos en `docs/design/` y dirección visual decidida ([`ADR-012`](../.ai/adr/ADR-012-senaletica-y-el-modo-denso.md))
- [x] `data/documentos/`: seis imágenes sintéticas (nítida y difícil de cada documento) más `esperado.json`
- [~] Los tres documentos y sus campos están decididos, y `PantallaDatos.tsx` ya captura `deudas_mensuales_usd` y `personas_a_cargo`. Falta **qué pasa si falta uno**

### Implementación

- [x] Las dos vías de detección en `mobile/src/core/`, evaluadas por `eval/run.mjs`
- [x] `eval/run.mjs` cubre vía A, vía B e integridad de rutas. Determinista, sin teléfono, exit 1 si algo falla
- [x] `eval/credito/contrato.test.mjs` llama al `decidir()` real del nodo y valida contra `RespuestaBancoSchema` en los tres caminos
- [x] El nodo importa el motor de crédito en vez de tener su propia política
- [x] Nueve pantallas escritas y navegación en `App.tsx`
- [x] La cuota se calcula **en el teléfono y sin señal**: `PantallaLeido` muestra lo extraído, `PantallaCuota` corre `preCalificar()` y `PantallaBanco` muestra `decidir()`. `PantallaDatos` sigue en el repo para deudas y personas a cargo
- [x] `data/generar-usuarios.mjs` produce el formato normalizado y `PantallaUsuarios.tsx` lo consume
- [x] `core/` unificado en `mobile/src/core/`, sin duplicado en la raíz

### Bloque 0, cerrado en iPhone

Cerrado en iPhone 17 Pro Max (iOS 26.6.1), no en el Xiaomi 14T Pro. El 14T
(HyperOS 3 / Android 16) aborta en `libbare-kit.so` al `worklet.start`. Android
queda aparcado.

- [x] Dispositivo emparejado, modo desarrollador y certificado confiados
- [x] Los 2.1 GB de MedPsy en caché QVAC del iPhone
- [x] `expo run:ios --device --configuration Release`: Bare arranca, `loadModel` en CPU, primer token. `load_ms` 93722, **TTFT 2915 ms**, 56 tokens
- [x] HTTP del nodo OK

---

## Criterios de entrega

| | Criterio | Estado |
| --- | --- | --- |
| [x] C1 | MedPsy carga en el iPhone y produce texto | `load_ms` 93722, TTFT 2915 ms CPU, 56 tokens |
| [ ] C2 | TTFT con `gpu` y `cpu`, se usa el mejor | Solo `cpu`. Falta Metal |
| [x] C3 | La vía A dispara con el caso con hallazgo | `eval/run.mjs` exit 0 |
| [x] C3b | La vía B clasifica en los tres estados | Los 7 marcadores |
| [x] C3c | **El sano no dispara ninguna alerta** | Cero señales |
| [x] C3d | CD4 no aparece en pantalla ni en el video | Fuera del código. Falta revisar el guion cuando exista |
| [x] C4 | Toda salida del modelo pasa por `limpiarJson()` | Cero `JSON.parse` sueltos en `mobile/src/` |
| [ ] C5 | La alerta valida contra `AlertaSchema` | **Bloqueado por 1.1**: hoy no hay salida del modelo que validar |
| [~] C6 | La foto se borra tras extraer | Código en `leerDocumento.ts`. Falta verificar en el iPhone |
| [ ] C7 | Ninguna imagen ni dato clínico sale del teléfono | **Bloqueado por 1.2**: la app todavía no envía nada |
| [ ] C8 | Con Wi-Fi apagado queda `pendiente` y se dice | **Bloqueado por 1.2** |
| [ ] C9 | Al volver la red, sale y vuelve la respuesta | **Bloqueado por 1.2** |
| [ ] C10 | `perf.jsonl` con una línea por inferencia | **Bloqueado por 1.1** |
| [ ] C11 | Tabla base contra LoRA | Solo si se llega al punto 4 |
| [x] C12 | **Cero llamadas a proveedores de IA remotos** | Verificado en `mobile/src`, `nodo`, `eval`, `data`. Repetir sobre el bundle antes de entregar |
| [x] C13 | README declara modelo, cuantización, hardware y base | MedPsy Q8_0, OCR_LATIN, extracción = MedPsy, iPhone 17 Pro Max, Kit declarado |

**C12 y C13 descalifican.** Los demás cuestan puntos. Cinco de los pendientes
(C5, C7, C8, C9, C10) los desbloquean los puntos 1.1 y 1.2: son la misma
tarea vista desde el otro lado.

---

## Decisiones abiertas

- [x] D1 ¿MedPsy carga on-device? **Sí**, iPhone 17 Pro Max, CPU, Q8_0
- [x] D3 ¿HyperOS pide cuenta Mi? **Aparcado**, ya no usamos el Xiaomi
- [ ] D2 ¿`gpu` o `cpu`? Solo CPU medido. Falta Metal en el iPhone
- [ ] D5 ¿`finetune()` corre en el dispositivo? Solo si todo lo demás está entregable
- [ ] D7 ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0?
- [ ] D11 ¿Se recupera el transporte P2P, o el video no lo promete? Ver 1.3
