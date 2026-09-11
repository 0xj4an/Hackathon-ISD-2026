# Probar el flujo en el teléfono físico

Para `[A]`. Todo lo de aquí se vio con el aparato en la mano, no se infirió
del código. Lo que no se probó dice que no se probó. Lo que falló se deja
escrito: es evidencia, no suciedad.

El emulador no cuenta. La demo es un **iPhone 17 Pro Max**.

---

## Qué va aquí y qué no

| Dónde | Qué prueba | Se commitea |
| --- | --- | --- |
| [`eval/resultados.md`](../eval/resultados.md) | Reglas, scorecard, contrato del banco. Sin teléfono | Sí, lo genera `node eval/run.mjs` |
| [`perf/perf.jsonl`](../perf/README.md) | Una línea por inferencia real (`stats` del SDK) | No: está en `.gitignore`. Se exporta del teléfono para Tether Psy |
| **Este archivo** | El flujo en el iPhone: qué se tocó, qué salió, qué se rompió | Sí |
| [`docs/PRUEBA-NODO.md`](PRUEBA-NODO.md) | HTTP banco/pueblo (LAN) | Sí |
| Fotos de cédulas reales, pantallazos con PII | Nada. Ni sintéticas si se ve una cara real | Nunca |

Qué probar en el iPhone con el Release de ahora (avión, correo, fotos, qué
cuenta como éxito): [`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md).

Los documentos de prueba son los de [`data/documentos/`](../data/documentos/):
Mariela Quiros, `esperado.json`. Fotografiar el JPG en la pantalla del Mac o
subirlo desde Archivos. No una cédula verdadera.

---

## Cómo anotar una corrida

Con el teléfono todavía caliente, no al día siguiente. Copiar el bloque de
abajo, pegarlo **arriba** de Corridas, y llenar. Un renglón vacío es una
pregunta sin responder, no un sí.

Build: el SHA de `git rev-parse --short HEAD`, más «sucio» si hay cambios sin
commitear. Sin SHA no se sabe qué código se estaba mirando.

No hace falta adjuntar captura. Basta el JSON que mostró la pantalla contra
`esperado.json`. Si un campo no salió, se escribe `—` y el mensaje de error
tal cual, en inglés si vino en inglés.

Para sacar `perf.jsonl` / `qvac.jsonl` del iPhone: viven en el directorio de
documentos de la app (`expo-file-system` `Paths.document`). Xcode → Window →
Devices and Simulators → el iPhone → el contenedor de la app. Esos archivos
no se commitean; aquí se copian `load_ms`, TTFT y si OCR/extracción escribieron
línea.

---

## Plantilla

```
### YYYY-MM-DD HH:MM · iPhone 17 Pro Max · <SHA o sucio>

Build: Release / Metro
Quién: Artur | Juan
Documento: cedula-nitido | cedula-dificil | ingresos-* | extracto-* | otro
Cómo: tomar foto de la pantalla | subir archivo JPG
Caso clínico: diabetes.json | sano.json | …

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| Entrada / revisión | ok / fallo / no se tocó | |
| Alerta (reglas + MedPsy redacta) | | |
| Monto del crédito | | |
| Cédula → JSON | | nombre / número / fechas vs esperado |
| Ingresos → JSON | | empleador / B/. / tipo |
| Extracto → JSON | | banco / saldo promedio / meses |
| Fotos borradas | | la UI lo dijo / no se comprobó el disco |
| PantallaLeido | | |
| Cuota (`preCalificar`) | | |
| Banco (`decidir`, mora 0) | | |

Error literal, si hubo:

Criterios que mueve: C6, C10, …
```

---

## Corridas

### 2026-09-10 ~20:47–20:53 · iPhone 17 Pro Max · Sentry `1.0.5+2`

Build: Release en mano · release Sentry `isd-hackathon-mobile@1.0.5+2` (dist `2`).
Nativo reportó aún `app_version 1.0.4` / `HackathonISD` (JS alineado; IPA a medias).
Quién: equipo (evidencia Sentry; sin `perf.jsonl` en el Mac)
Documento: al menos ingresos (`kind=work` en breadcrumbs)
Modo: `local-wifi`
Detalle ops: [`SENTRY.md`](SENTRY.md) § Corrida medida

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| Arranque / loading | **ok** | ~1.8 s hasta `sesion: start local-wifi` |
| Entrada | ok | breadcrumb `navegacion: entrada` |
| Alerta (MedPsy) | **mixto** | `alerta: fail` ×2 en la ventana; no bloqueó el resto |
| Lectura docs | **ok** (1/1) | `lectura: ok 1/1`; extract `work` ~950 chars, borrada |
| OCR | **mixto** | ok en el lote que cerró; también `galloc` / foto grande en la misma ventana |
| Cuota → Firmar y enviar | **ok** | POST Railway `/solicitud` HTTP 200 |
| Banco | **ok** | `credito: ok via banco` |
| Nodo LAN al boot | warning | `nodo: no hallado` (esperado sin pueblo; wifi usó banco) |

Error literal (OCR, no en el lote ok): `StepDetectionInference: ggml_gallocr_alloc_graph failed` / mensaje UI de foto demasiado grande.

Criterios: cierra anotación de envío directo Railway (antes `[~]`). Telemetría
usable. C6 disco y ensayos ×3 / video siguen abiertos.

### 2026-09-10 ~19:15 · iPhone · OCR documentos · `5165830`+

Build: Metro / Release en mano.
Quién: Juan (reporte al equipo)
Documento: cédula / ingresos / extracto (flujo docs)
Cómo: foto o archivo (JPEG compatible en código)

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| Cédula → JSON | **ok** | OCR + extracción en el teléfono; ya no `invalid input` |
| Ingresos → JSON | **ok** | idem |
| Extracto → JSON | **ok** | idem |
| Fotos borradas | no anotado | Código lo hace; disco no listado |

Error literal: ninguno en OCR.

Criterios: cierra verificación OCR de 1.2 / desbloquea ensayo+video.
C6 (borrar foto en disco) sigue pendiente de comprobar contenedor.

### 2026-09-10 (tarde) · iPhone · pueblo LAN → Railway · ~`b5d69d6`

Build: Metro / Release en mano (descubrimiento LAN activo).
Quién: Juan (+ Artur en paralelo de docs)
Documento: atajo demo / flujo crédito (no OCR en esta corrida)
Caso: envío al pueblo

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| Entrada / Buscar WiFi | ok | App halló `:8788` sin IP hardcodeada (`servicio: inaigar-pueblo`) |
| Salud / alerta / docs | no el foco | Se llegó a cuota / envío |
| Cuota → envío | **ok** | Cliente `192.168.0.17` → laptop pueblo → Railway |
| Banco | **aprobada** | Montos **90**, **812**, **920** (logs del nodo) |
| Admin | ok | `recibida` + canal `pueblo` |
| Firma / desembolso | no se tocó / no anotado | Pendiente en corrida de video |

Error literal: ninguno en el POST.

Criterios: mueve evidencia de C8 parcial (camino B vivo). C6 OCR sigue abierta.
Ver [`PRUEBA-NODO.md`](PRUEBA-NODO.md) § Medido 10 sep.

### 2026-09-10 ~02:40 · iPhone 17 Pro Max · `b27afc0` + cambios locales

Build: el Release/Metro que tenía Artur en la mano. En el working tree, sin
commitear todavía: `leerDocumento.ts` (JPEG/base64 para el OCR) y
`PantallaDocumentos.tsx` (campos leídos en la misma fila). El fallo de abajo
es **anterior** a esos dos cambios.

Quién: Artur
Documento: cédula (foto con la cámara)
Cómo: Tomar foto

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| Cédula → JSON | **fallo** | Error literal: `invalid input`. No hubo JSON. El OCR de QVAC rechazó la imagen (HEIC y/o bytes que el SDK 0.18.2 no trata como `Buffer`) |
| Ingresos | no se tocó | |
| Extracto | no se tocó | |
| Leido / cuota / banco | no se tocó | bloqueado por la cédula |

Error literal: `invalid input`

Qué se hizo después (código, no re-probado en el teléfono al escribir esto):

1. Cámara pide JPEG compatible (`preferredAssetRepresentationMode: Compatible`,
   `quality: 0.55`).
2. `ocr()` recibe base64 con `toString('base64')`, no un `Uint8Array`.
3. La fila de cada documento muestra los campos si la lectura cierra.

**Pendiente:** repetir cédula, ingresos y extracto con foto y con archivo,
nítido y difícil, y anotar una corrida nueva encima de esta.

Criterios: C6 y la verificación de 1.2 siguen `[~]`.

### 2026-09-09 · iPhone 17 Pro Max · bloque 0

Ya está en [`CHECKLIST.md`](CHECKLIST.md), se copia aquí para no perder el hilo.

| Paso | Resultado | Qué se vio |
| --- | --- | --- |
| MedPsy carga y produce texto (C1) | **ok** | `load_ms` 93722, TTFT 2915 ms, CPU, 56 tokens, Q8_0 |
| Android Xiaomi 14T Pro | **fallo** | aborta `libbare-kit.so` al `worklet.start`. Aparcado |

iOS 26.6.1. Release `expo run:ios --device --configuration Release`.

---

## Lo que todavía no se puede afirmar

Lista viva de cierre: [`ESTADO.md`](ESTADO.md) y [`CHECKLIST.md`](CHECKLIST.md).
OCR en iPhone **sí** está medido; siguen fallos intermitentes `galloc` en
algunas fotos (Sentry). Banco wifi **sí** anotado vía Sentry. Sigue abierto:
borrado de foto en disco (C6), cola post-kill, `perf.jsonl` exportado, ensayos
×3, video. Cómo leer Sentry: [`SENTRY.md`](SENTRY.md).