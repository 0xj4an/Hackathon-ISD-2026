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
| [`docs/PRUEBA-NODO.md`](PRUEBA-NODO.md) | HTTP y Hyperswarm laptop ↔ teléfono | Sí |
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

## Lo que todavía no se puede afirmar (auditoría 10 sep)

Código por delante de la evidencia en el aparato. Ver [`CHECKLIST.md`](CHECKLIST.md).

- Que la foto de la cédula ya lee después del arreglo JPEG/base64.
- Que ingresos y extracto leen por cámara. El arreglo es el mismo camino; no se
  vio en el aparato.
- Que la copia se borra del disco (C6): el código lo hace, la UI lo puede decir,
  no se listó el contenedor.
- Cola SQLite durable: código en `cola.ts` / `colaSqlite.ts`. Falta ver en el
  iPhone que sobrevive un kill y que al volver la red sale sola.
- HTTP banco/pueblo **desde el iPhone** (sí medido desde laptop en
  [`PRUEBA-NODO.md`](PRUEBA-NODO.md)).
- Alerta redactada por MedPsy **vista en el iPhone** (código: `redactarAlerta`).
- `perf.jsonl` exportado de una corrida de producto (logger ya cableado).
