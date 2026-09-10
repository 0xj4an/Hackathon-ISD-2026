# Checklist

Se sigue en orden. Un bloque no empieza hasta que el anterior tiene su salida
verificable. `[J]` es 0xj4an, `[A]` es Artur.

`[x]` hecho y comprobado. `[~]` a medias, dice qué falta. `[ ]` sin empezar.

El detalle de cada punto está en
[`.ai/runs/mvp-hackathon/02-stack-y-plan.md`](../.ai/runs/mvp-hackathon/02-stack-y-plan.md).
Las condiciones de "listo" son los criterios C1 a C13 del final.

---

## Bloque 0 · Desbloqueo

**Cerrado el 9 sep en iPhone 17 Pro Max** (iOS 26.6.1), no en el Xiaomi 14T Pro.
El 14T (HyperOS 3 / Android 16) aborta en `libbare-kit.so` al `worklet.start`
tras `2b/4` (APK 1.0.2). Se aparca Android. La demo y C1 viven en el iPhone.

- [x] `[A]` **Hecho (iPhone).** Dispositivo físico emparejado; Modo desarrollador y certificado de `Apple Development` confiados. El 14T / `adb` queda fuera
- [x] `[A]` **Hecho.** Los 2.1 GB de MedPsy caben y están en caché QVAC del iPhone (la descarga retomó 20% → 100%)
- [x] `[A]` **Hecho en iOS, no en Android.** `npx expo run:ios --device --configuration Release`: Bare arranca, `loadModel` CPU, primer token. `load_ms` 93722, **TTFT 2915 ms**, 56 tokens. Texto del modelo (glucosa 132). Android 1.0.2 sigue abortando; no más EAS a ciegas
- [ ] `[A]` TTFT **GPU** en el iPhone (Metal). Solo se midió `cpu`. C2 incompleto
- [x] `[A]` **HTTP del nodo OK; Hyperswarm entre dos procesos del Mac no conecta** (NAT/`firewalled`, sin mDNS). La demo de crédito va por HTTP LAN, no por P2P. Ver `baseline.md`

**Salida:** captura del iPhone con modelo cargado, texto generado y TTFT CPU.
**Cierra:** D1 sí (iPhone). D2 parcial (solo CPU). D3 irrelevante (ya no es HyperOS).

---

## Bloque 1 · Rebanada vertical

### Dominio

- [x] `[J]` **Hecho.** Umbrales revisados y citados, y la cobertura pasó de 4 señales a 14. Ver [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md) y [`salud.md`](../.ai/references/salud.md). Cada señal lleva su `fuente` en el código
- [x] `[J]` **Hecho.** Los costos inventados salieron. Ahora son rangos publicados con fuente (glucosa 6 a 15 USD, ECG 20 a 45), y donde no hay precio citable el campo va ausente y la pantalla no muestra número
- [x] `[J]` **Hecho.** El especialista entró como parte del tipo `Ruta`, junto con qué hacer ahora, qué examen, dónde y qué síntomas obligan a ir de inmediato. Ver `ADR-008`
- [x] `[J]` **Hecho.** CD4 fuera de la tabla, con filtro de respaldo en el generador del spike
- [x] `[J]` **Hecho, y son seis.** `data/usuarios/` con seis casos clínicos coherentes generados por `data/generar-usuarios.mjs`. El sano da cero señales, verificado por `eval/run.mjs`

### Implementación

- [~] `[A]` **Código listo, sin verificar en producto.** `PantallaAlerta.tsx` existe; el bloque 0 corrió MedPsy en el iPhone vía smoke, no en esta pantalla. La alerta sigue mostrando solo reglas
- [~] `[A]` **Logger escrito; C1 midió TTFT en el smoke.** `mobile/src/perf/logger.ts` existe. Falta volcar `stats` a `perf/perf.jsonl` desde el flujo de producto. Métricas de `await result.final`, TTFT a mano con `Date.now()`
- [x] `[A]` **Hecho.** Las dos vías viven en `mobile/src/core/reglas.ts` y `marcadores.ts`, 14 señales sobre 9 variables (`ADR-008`). `eval/run.mjs` evalúa ambas y pasa
- [x] `[A]` **Hecho.** `data/generar-usuarios.mjs` produce el formato normalizado y `PantallaUsuarios.tsx` lo consume

---

## Bloque 2 · Flujo completo, UI fea

### Dominio

- [x] `[J]` **Hecho.** `ADR-010` cambió el modelo: se cotiza un paquete por condición a un año, con costos con fuente, en vez de un monto suelto. `mobile/src/core/paquete.ts` y `nodo/credito.mjs` lo implementan
- [~] `[J]` **Decidido a medias.** Son tres: cédula, comprobante de ingresos y extracto, y los campos están en `mobile/src/core/prompts.ts` y `schemas.ts`. `ADR-011` añadió los tres que faltaban para medir capacidad de pago: `deudas_mensuales_usd`, `personas_a_cargo` y `ingresos.antiguedad_meses`. Falta decidir **qué pasa si falta uno** y cómo se capturan los dos declarados en pantalla
- [x] `[J]` **Hecho.** El modelo de crédito de juguete salió. Motor determinista en
  `mobile/src/core/credito/`: capacidad de pago back-end con piso de subsistencia, scorecard
  logístico entrenado sobre cartera sintética (AUC 0.723, KS 0.379 en holdout), tasa
  descompuesta en fondeo, riesgo, opex, capital y margen, y plazo despejado de la cuota. El
  nodo lo importa sin build. Ver [`ADR-011`](../.ai/adr/ADR-011-el-modelo-de-credito.md)
- [ ] `[J]` `data/documentos/` **está vacío.** Faltan los tres ficticios renderizados como imagen, con tipografía y ruido. Texto plano perfecto no prueba el OCR
- [x] `[J]` **Hecho.** 15 lienzos en `docs/design/`, más el comparador de direcciones y el diseño de app

### Implementación

- [~] `[A]` **Solo la cámara.** `PantallaDocumentos.tsx` toma la foto con `ImagePicker`. Faltan `ocr()`, la extracción a JSON, **el borrado de la foto** y SQLite: hoy no se usa `expo-sqlite` en ninguna parte
- [ ] `[A]` Cola en SQLite con estado `pendiente` y envío al nodo. **Sin empezar**: `pendiente` hoy es solo un estilo de texto en pantalla. HTTP primero, que se depura más fácil que Hyperswarm
- [x] `[A]` **Hecho en la parte de reglas.** `eval/run.mjs` evalúa la vía A (los 6 casos), la vía B (clasificación de los 7 marcadores) y la integridad de las rutas. Determinista, sin teléfono, sale con código 1 si algo falla. La medición del modelo (% JSON, % campos) vive en `spikes/lora-medpsy`
- [x] `[A]` **Verificado.** `eval/credito/contrato.test.mjs` llama al `decidir()` real del nodo y valida su salida contra `RespuestaBancoSchema` en los tres caminos: aprobada, rechazada y revisión. `nodo/credito.mjs` es ahora una cáscara que importa el motor de `mobile/src/core/credito/`

**Al cerrar el bloque:** lanzar el entrenamiento del LoRA y dormir. Con `caffeinate -i`, o el Mac se duerme a mitad como pasó en el spike.

---

## Bloque 3 · Descanso por turnos

- [ ] El LoRA entrena sin supervisión
- [ ] `[A]` Eval base corriendo
- [ ] `[J]` Guion del video en `docs/VIDEO.md`

---

## Bloque 4 · LoRA y medición

- [ ] `[A]` Cargar el adaptador y correr `eval/run.mjs` otra vez
- [ ] `[A]` **La tabla antes/después.** Es el activo más valioso del proyecto para Technical (35%) y para "calidad de dominio medible" de Tether Psy
- [ ] `[J]` UI presentable, con los disclaimers de salud en pantalla y no en el README

---

## Bloque 5 · P2P y demo

- [ ] Wi-Fi apagado: la solicitud queda en cola y la app lo dice
- [ ] Wi-Fi encendido o nodo cerca: la solicitud sale, el banco responde, la respuesta vuelve
- [ ] **Ensayar la demo completa tres veces seguidas** con el teléfono en la mano. Lo que falla, falla aquí y no grabando

---

## Bloque 6 · Video y README

- [ ] `[J]` Video <= 5 min, español, enlace sin login. Es lo primero que mira el jurado del reto General
- [ ] `[A]` README: modelos con nombre y cuantización honestos, hardware real, setup reproducible, componentes de terceros declarados
- [ ] `[A]` **Declarar la base preexistente**: solo la plantilla AI Engineering Kit. Omitirlo descalifica

---

## Bloque 7 · Colchón

- [ ] Solo se arregla lo roto. Nada nuevo
- [ ] Entregar con margen

---

## Antes de entregar: los criterios

| | Criterio | Cómo se comprueba |
| --- | --- | --- |
| [x] C1 | MedPsy carga en el **iPhone 17 Pro Max** y produce texto | Captura 9 sep: `load_ms` 93722, TTFT 2915 ms CPU, 56 tokens. El 14T Pro aborta Bare; no es el aparato de demo |
| [ ] C2 | TTFT medido con `gpu` y `cpu`, se usa el mejor | Solo `cpu` en el iPhone. Falta Metal/`gpu` |
| [x] C3 | La vía A dispara con el historial del usuario con hallazgo | **Verificado**, `eval/run.mjs` exit 0 |
| [x] C3b | La vía B clasifica bien los marcadores: alto, bajo y normal | **Verificado**, los 7 marcadores en los tres estados |
| [x] C3c | **El usuario sano no dispara ninguna alerta** | **Verificado**, cero señales |
| [x] C3d | `linfocitos CD4` no aparece en pantalla ni en el video | **Fuera de `mobile/src/core/marcadores.ts`.** Falta revisar el guion cuando exista |
| [x] C4 | Toda salida del modelo pasa por `limpiarJson()` | **Verificado**, cero `JSON.parse` sueltos en `mobile/src/` |
| [ ] C5 | La alerta valida contra `AlertaSchema` | `.parse()` sin excepción en 20 corridas |
| [ ] C6 | La foto se borra tras extraer | Listar el directorio: cero imágenes |
| [ ] C7 | Ninguna imagen ni dato clínico sale del teléfono | El JSON que recibe el nodo: solo `SolicitudSchema` |
| [ ] C8 | Con Wi-Fi apagado la solicitud queda `pendiente` y se dice | Video: modo avión, la pantalla lo muestra |
| [ ] C9 | Al volver la red, sale y vuelve la respuesta | Video: aparece sin tocar nada |
| [ ] C10 | `perf.jsonl` con una línea por inferencia y `stats` completo | `wc -l` y cada línea parsea |
| [ ] C11 | Tabla base contra LoRA sobre el mismo set | `eval/run.mjs` dos veces |
| [x] C12 | **Cero llamadas a proveedores de IA remotos** | **Verificado** en `mobile/src`, `nodo`, `eval`, `data`. Repetir sobre el bundle antes de entregar |
| [~] C13 | README declara modelo, cuantización, hardware y base preexistente | Hardware y base ya están. Falta cerrar la fila "Extracción a JSON" de la tabla de modelos |

C12 y C13 son los dos que descalifican. Los demás cuestan puntos.

---

## Decisiones que siguen abiertas

Se cierran con evidencia, no con opinión.

- [x] D1 ¿MedPsy carga on-device? **Sí, iPhone 17 Pro Max, CPU, Q8_0.** El 14T Pro (HyperOS 3) aborta en `libbare-kit` al arrancar el worklet
- [ ] D2 ¿`gpu` o `cpu`? Solo CPU medido (TTFT 2915 ms). GPU/Metal en el iPhone pendiente. OpenCL/Mali del 14T ya no aplica
- [x] D3 ¿Instalar por USB en HyperOS pide cuenta Mi? **Aparcado.** Ya no usamos el Xiaomi. iOS: Modo desarrollador + confiar certificado
- [x] D4 Si D1 falla en el 14T… **D1 falló ahí; no bajamos cuantización.** Pasamos de aparato. Q8_0 corre en el iPhone. **Q4_K_M nunca**, rompe el LoRA
- [ ] D6 ¿Existe constante Q4_0 de MedPsy en el catálogo? De eso depende el modo ligero
- [x] D8 ~~¿0.19 rompe el pipeline de Expo?~~ **Cerrada sin moverse:** `ADR-013` deja el SDK en 0.18.2, que es lo instalado y prebuildeado. No hay migración que probar
- [x] D9 ~~¿Sobrevive la distribución P2P de modelos en 0.19?~~ **No aplica:** nos quedamos en 0.18.2
- [ ] D10 ¿`delegate` de 0.18.2 atraviesa el NAT? Es la vía sin topic, y de eso depende el bonus P2P de `ADR-013`. Se prueba con `provider.js` en la laptop (`composite.js` no corre tal cual, ver el ADR)
- [ ] D7 ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0?
- [ ] D5 ¿`finetune()` corre en Android? Solo si todo lo demás está entregable
