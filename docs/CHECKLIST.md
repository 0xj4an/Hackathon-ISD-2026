# Checklist

Se sigue en orden. Un bloque no empieza hasta que el anterior tiene su salida
verificable. `[J]` es 0xj4an, `[A]` es Artur.

`[x]` hecho y comprobado. `[~]` a medias, dice qué falta. `[ ]` sin empezar.

El detalle de cada punto está en
[`.ai/runs/mvp-hackathon/02-stack-y-plan.md`](../.ai/runs/mvp-hackathon/02-stack-y-plan.md).
Las condiciones de "listo" son los criterios C1 a C13 del final.

---

## Bloque 0 · Desbloqueo

Nada más avanza hasta que esto pase.

- [ ] `[A]` El 14T Pro aparece en `adb devices`. Opciones de desarrollador, depuración USB **y la opción de instalar por USB**, que en Xiaomi suele faltar y puede pedir cuenta Mi
- [ ] `[A]` `adb shell df -h /data` muestra >= 5 GB libres
- [ ] `[A]` `cd mobile && npx expo run:android --device` (o APK EAS **1.0.2+**) pasa de `2b/4` sin abort de `libbare-kit`. Luego carga MedPsy y suelta el primer token. La primera vez baja 2.1 GB, no es un cuelgue (`ADR-007`: no bloquear onboarding; ahora el smoke sí espera)
- [ ] `[A]` Repetir con `device: "cpu"` y anotar los dos TTFT
- [ ] `[A]` `npm install` en `nodo/` y `core/`; `npm run banco` y `npm run corregimiento` se descubren por Hyperswarm

**Salida:** captura del teléfono con "modelo cargado" y texto en español, más los dos TTFT.
**Cierra:** D1, D2, D3.

---

## Bloque 1 · Rebanada vertical

### Dominio

- [x] `[J]` **Hecho.** Umbrales revisados y citados, y la cobertura pasó de 4 señales a 14. Ver [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md) y [`salud.md`](../.ai/references/salud.md). Cada señal lleva su `fuente` en el código
- [x] `[J]` **Hecho.** Los costos inventados salieron. Ahora son rangos publicados con fuente (glucosa 6 a 15 USD, ECG 20 a 45), y donde no hay precio citable el campo va ausente y la pantalla no muestra número
- [x] `[J]` **Hecho.** El especialista entró como parte del tipo `Ruta`, junto con qué hacer ahora, qué examen, dónde y qué síntomas obligan a ir de inmediato. Ver `ADR-008`
- [x] `[J]` **Hecho.** CD4 fuera de la tabla, con filtro de respaldo en el generador del spike
- [x] `[J]` **Hecho, y son seis.** `data/usuarios/` con seis casos clínicos coherentes generados por `data/generar-usuarios.mjs`. El sano da cero señales, verificado por `eval/run.mjs`

### Implementación

- [~] `[A]` **Código listo, sin verificar.** `mobile/src/PantallaAlerta.tsx` existe y las seis pantallas están escritas. Nadie lo ha visto correr en un teléfono: eso lo cierra el bloque 0
- [~] `[A]` **Escrito, nunca ejecutado.** `mobile/src/perf/logger.ts` existe y `perf/perf.jsonl` tiene cero líneas, porque no ha corrido una sola inferencia. Original: `perf/logger.ts` **desde ya**. Si no se hace ahora no se hace nunca, y es entregable de Tether Psy. Las métricas salen de `stats` de `await result.final`, no de la API de logging. Volcar `stats` entero sin filtrar y medir TTFT a mano con `Date.now()`
- [x] `[A]` **Hecho.** Las dos vías viven en `mobile/src/core/reglas.ts` y `marcadores.ts`, 14 señales sobre 9 variables (`ADR-008`). `eval/run.mjs` evalúa ambas y pasa
- [x] `[A]` **Hecho.** `data/generar-usuarios.mjs` produce el formato normalizado y `PantallaUsuarios.tsx` lo consume

---

## Bloque 2 · Flujo completo, UI fea

### Dominio

- [x] `[J]` **Hecho.** `ADR-010` cambió el modelo: se cotiza un paquete por condición a un año, con costos con fuente, en vez de un monto suelto. `mobile/src/core/paquete.ts` y `nodo/credito.mjs` lo implementan
- [~] `[J]` **Decidido a medias.** Son tres: cédula, comprobante de ingresos y extracto, y los campos están en `mobile/src/core/prompts.ts` y `schemas.ts`. Falta decidir **qué pasa si falta uno**
- [ ] `[J]` `data/documentos/` **está vacío.** Faltan los tres ficticios renderizados como imagen, con tipografía y ruido. Texto plano perfecto no prueba el OCR
- [x] `[J]` **Hecho.** 15 lienzos en `docs/design/`, más el comparador de direcciones y el diseño de app

### Implementación

- [~] `[A]` **Solo la cámara.** `PantallaDocumentos.tsx` toma la foto con `ImagePicker`. Faltan `ocr()`, la extracción a JSON, **el borrado de la foto** y SQLite: hoy no se usa `expo-sqlite` en ninguna parte
- [ ] `[A]` Cola en SQLite con estado `pendiente` y envío al nodo. **Sin empezar**: `pendiente` hoy es solo un estilo de texto en pantalla. HTTP primero, que se depura más fácil que Hyperswarm
- [x] `[A]` **Hecho en la parte de reglas.** `eval/run.mjs` evalúa la vía A (los 6 casos), la vía B (clasificación de los 7 marcadores) y la integridad de las rutas. Determinista, sin teléfono, sale con código 1 si algo falla. La medición del modelo (% JSON, % campos) vive en `spikes/lora-medpsy`
- [~] `[A]` **Afinado, sin verificar.** `nodo/credito.mjs` ya cotiza el paquete a un año. Falta comprobar que `RespuestaBancoSchema` valida lo que el nodo devuelve de verdad, con el nodo corriendo

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
| [ ] C1 | MedPsy carga en el 14T Pro y produce texto en español | Captura con "modelo cargado" y TTFT |
| [ ] C2 | TTFT medido con `gpu` y `cpu`, se usa el mejor | Dos líneas en `perf.jsonl` con `device_cfg` distinto |
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

- [ ] D1 ¿MedPsy carga en el 14T Pro? Con 12 GB debería
- [ ] D2 ¿`gpu` o `cpu`? El 14T Pro lleva Mali, no Adreno, así que OpenCL no aplica
- [ ] D3 ¿Instalar por USB en HyperOS pide cuenta Mi?
- [ ] D4 Si D1 falla, ¿bajar cuantización o delegar? Q4_0 primero. **Q4_K_M nunca**, rompe el LoRA
- [ ] D6 ¿Existe constante Q4_0 de MedPsy en el catálogo? De eso depende el modo ligero
- [ ] D8 ¿0.19 rompe el pipeline de Expo? Smoke test en 0.18.2 primero, mover, repetir
- [ ] D9 ¿Sobrevive la distribución P2P de modelos en 0.19? No bloquea
- [ ] D7 ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0?
- [ ] D5 ¿`finetune()` corre en Android? Solo si todo lo demás está entregable
