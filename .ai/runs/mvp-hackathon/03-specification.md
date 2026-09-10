# Especificación · MVP hackathon

Referencias: `01-idea-validation.md` (decisión de idea), `02-stack-y-plan.md`
(stack, plan por bloques, LoRA), `docs/BRIEF.md`, `references/retos.md`.
Decisiones difíciles de revertir: `adr/ADR-001` a `ADR-005`.

---

## Problema y usuario

Persona en zona rural de Panamá, con un Android y señal intermitente, sin
medicina prepagada. Dos problemas encadenados:

1. No sabe cuándo un resultado de laboratorio o una medición casera amerita un
   examen, ni cuánto costaría.
2. Si necesita crédito para pagarlo, hoy tiene que entregar cédula y extractos
   **en físico** a un asesor. Riesgo de fraude y de fuga de datos, y a menudo
   implica un viaje al pueblo.

El sistema tiene que ser útil **con el avión encendido**. La conectividad es la
excepción, no la norma.

## Resultado esperado

Una app Android que, sin internet, detecta una señal de riesgo de salud, la
explica en español, y permite solicitar un crédito de salud fotografiando
documentos **sin que ninguna imagen salga del teléfono**. La solicitud espera en
cola y viaja al banco cuando hay red o cuando aparece el nodo del corregimiento.

Éxito medible al cierre:

- El flujo completo corre de punta a punta en el **iPhone 17 Pro Max**, grabado.
  El Xiaomi 14T Pro se abandonó: Bare aborta al arrancar el worklet.
- `perf/perf.jsonl` con métricas reales de cada inferencia.
- `eval/` con una tabla base contra LoRA sobre el mismo set.
- README que declara modelos, cuantización, hardware y base preexistente.

## Alcance

| # | Capacidad | Detalle |
| --- | --- | --- |
| A0 | Onboarding sin esperar 2.1 GB | Perfil, mediciones y reglas usables mientras `downloadAsset` corre. `loadModel` solo al explicar. Ver `ADR-007` |
| A1a | Detección por **historial** | Export de Google Health / Apple Health -> reglas de tendencia -> `Senal` |
| A1b | Detección por **laboratorio** | Un resultado de examen -> reglas de rango de referencia -> `Senal` |
| A1c | Explicación de la señal | `Senal` (venga de donde venga) -> MedPsy la redacta -> `AlertaSchema` |
| A2 | Lectura de cédula | Foto -> `ocr()` -> LLM extrae -> `CedulaSchema` -> **se borra la foto** |
| A3 | Lectura de comprobante de ingresos | Igual que A2 -> `IngresosSchema` |
| A4 | Validaciones en código | `mobile/src/core/validaciones.ts` sobre el JSON extraído, antes de armar la solicitud |
| A5 | Cola offline | SQLite, estado `pendiente`, la app dice que no hay señal |
| A6 | Transporte | HTTP local cuando hay red; Hyperswarm al nodo del corregimiento cuando no |
| A6b | **El nodo reparte el modelo** | El nodo sirve los 2.1 GB de pesos (y el adaptador LoRA) a los teléfonos por P2P local, sin internet. Ver abajo |
| A7 | Respuesta del banco | `nodo/credito.mjs` decide y responde por el mismo camino |
| A8 | Aceptación | Botón "Acepto" que guarda `firma_hash` |
| A9 | Log de rendimiento | `perf/perf.jsonl`, una línea por inferencia |
| A10 | Evaluación | `eval/run.mjs`, base contra LoRA |
| A11 | Adaptador LoRA | Entrenado en el Mac sobre extracción + triaje (ver `ADR-003`) |

## Fuera de alcance

Decidido, no se discute de nuevo:

- **Extracto bancario.** `ExtractoSchema` queda `.optional()` y sin pantalla. El
  modelo de crédito ya contempla su ausencia (sube la tasa de 9.5 a 12.5).
- **Firma con trazo en pantalla.** Se reemplaza por A8. No es firma electrónica
  legal y se declara así.
- **TranslatePsy y cualquier idioma que no sea español.**
- **Voz** (Whisper, TTS). Ninguna de las dos suma a los retos elegidos.
- **Datos reales de cualquier persona o entidad.** Solo sintéticos.
- **Autenticación, cuentas de usuario, backend en la nube.**
- **Android como único dispositivo de demo.** El 14T Pro abortó Bare. La demo
  es el iPhone 17 Pro Max. El usuario del brief sigue siendo rural con Android.

## Flujo principal

```text
1. ALERTA        DOS VÍAS DE ENTRADA, UNA SOLA SALIDA

                 vía A: historial de Google/Apple Health
                        -> reglasTendencia()  (¿el valor viene mal N días seguidos?)
                                                                    \
                                                                     -> Senal
                                                                    /
                 vía B: un resultado de laboratorio
                        -> reglasRango()      (¿el valor está fuera del rango?)

                 Senal -> MedPsy redacta -> limpiarJson() -> AlertaSchema.parse()
                 -> pantalla: qué se observa, qué examen, cuánto cuesta, disclaimer

2. DECISIÓN      "¿Necesitas ayuda para pagarlo?" -> entra el flujo de crédito
                 El motivo clínico NO viaja: la solicitud lleva proposito:"salud"

3. DOCUMENTOS    foto cédula -> ocr() -> LLM -> CedulaSchema -> BORRAR FOTO
                 foto ingresos -> ocr() -> LLM -> IngresosSchema -> BORRAR FOTO
                 validarCoherencia() -> si hay problemas, se muestran y se corrige

4. COLA          SolicitudSchema -> SQLite estado "pendiente"
                 pantalla: "sin señal, se enviará cuando haya conexión"

5. TRANSPORTE    hay red      -> POST http://<nodo>:8787/solicitud
                 no hay red   -> Hyperswarm, topic isd-hackathon-credito-salud-v1
                 el corregimiento hace store-and-forward hacia el banco

6. RESPUESTA     decidir() -> RespuestaBancoSchema -> vuelve por el mismo camino
                 estado "respondida", pantalla con monto, plazo, tasa, cuota

7. ACEPTACIÓN    botón "Acepto" -> firma_hash -> estado "aceptada"
```

## Las dos vías de detección (A1a y A1b)

La versión anterior solo contemplaba mediciones
caseras. Son dos vías distintas, y la diferencia no es cosmética: **detectan
cosas de forma distinta**.

| | Vía A: historial | Vía B: laboratorio |
| --- | --- | --- |
| De dónde viene | Export de Google Health o Apple Health | Un examen de rutina, escrito o fotografiado |
| Qué mira | Una **tendencia**: el valor viene mal N días seguidos | Un **valor suelto** contra su rango de referencia |
| Necesita historia | Sí, sin serie temporal no hay señal | No, con un dato basta |
| Ejemplo | "glucosa en ayunas sobre 126 en las últimas 3 tomas" | "hemoglobina 9.1 g/dL, rango 12 a 16, anemia" |
| Estado hoy | `mobile/src/core/reglas.ts`, **14 señales** sobre 9 variables, cada una con su fuente (`ADR-008`) | **`mobile/src/core/marcadores.ts`**, con los 8 marcadores, sus rangos y el clasificador |

**Las dos desembocan en el mismo tipo `Senal`** (`codigo`, `descripcion`,
`examen`, `costo_usd`, `urgencia`) y de ahí en adelante el flujo es uno solo:
MedPsy redacta, `AlertaSchema` valida, la pantalla lo muestra. Una sola ruta de
explicación, dos de detección. Esto mantiene `ADR-005` intacto: las dos vías
deciden en código, el modelo sigue solo redactando.

### Los 8 marcadores de la vía B ya están escritos

En `mobile/src/core/marcadores.ts`, con rango y siguiente paso:
glicemia en ayunas, hemoglobina, plaquetas, creatinina, linfocitos CD4,
colesterol total, hematocrito y TSH. Hay que moverlos a `mobile/src/core/reglas.ts` como
`reglasRango()`. Es trabajo de copiar y adaptar, no de diseñar.

> **Quitar `linfocitos CD4` del demo.** Su siguiente paso es "referir a programa
> de VIH", y `docs/BRIEF.md` dice explícitamente "sin VIH en el demo público".
> El marcador se queda en el dataset de entrenamiento si hace falta volumen,
> pero no puede aparecer en pantalla ni en el video.

### Los datos: dos usuarios, uno sano y uno no

Para el hackathon se carga un historial ya exportado de dos usuarios ficticios.

- **Usuario sano.** Todas sus series dentro de rango. **La app no dice nada.**
  Esto vale tanto como la alerta: demuestra que el sistema no alarma por gusto,
  que es la crítica obvia a cualquier app de salud.
- **Usuario con hallazgo.** Dispara al menos dos señales, una por cada vía.

Ese par es a la vez la demo y el set de evaluación de las reglas.

### Decisión sobre el formato de entrada

**No se integra con Health Connect ni con HealthKit en vivo.** Se define un
formato normalizado propio (JSON o CSV: `usuario`, `ts`, `tipo`, `valor`,
`unidad`) y un importador de 30 líneas que traduce el export real a ese formato.

Por qué: el export de Apple Health es un XML enorme, HealthKit es solo iOS y
nuestro objetivo es Android, y Health Connect en vivo pide permisos y una
integración que no cabe en 41 horas. El importador demuestra el mismo punto y
cuesta una hora en vez de una noche.

**Se declara tal cual en el README**: los datos entran por archivo exportado, no
por conexión viva a Health Connect, y esa es la ruta de producción pendiente.

## El nodo del corregimiento tiene dos usos, y el segundo es el bueno

El nodo es una laptop que
vive en el pueblo, típicamente donde el **corresponsal bancario** (la tienda o
farmacia donde la gente ya hace vueltas del banco), no la laptop del usuario.

**Uso 1, cartero (`nodo/index.mjs`, rol `corregimiento`).** Recibe solicitudes
de teléfonos que pasen cerca, las guarda y las reenvía al banco cuando ella
consigue internet. Ya está escrito y funciona.

> **Aporta menos de lo que parece.** Si el teléfono va a conseguir señal en
> algún momento, la solicitud sale sola y el nodo sobra. Solo ayuda en el caso
> estrecho de que el teléfono nunca consiga señal pero el nodo sí.

**Uso 2, distribuir el modelo. No está escrito y es el que justifica el nodo.**
Los pesos son 2.1 GB y cada teléfono los necesita. Bajarlos por datos móviles en
zona rural no ocurre. El nodo los tiene en caché y se los sirve a los teléfonos
por wifi local o Hyperswarm, sin internet. Lo mismo con el adaptador LoRA de
34 MB cuando se reentrene.

Esto no hay que inventarlo: las constantes del catálogo de QVAC son
"registry-backed" y se distribuyen por Hyperdrive y Hyperswarm, que es el mismo
stack que ya usa `nodo/`. Y resuelve de paso el riesgo 2 del plan, que es la
descarga de 2.1 GB en el evento.

**Consecuencia para el vídeo:** la escena "el teléfono baja la inteligencia
artificial desde la laptop del pueblo, sin tocar internet" es mejor pitch que la
del cartero, y sostiene mejor el criterio de Pears que los tres retos valoran.
Va al guion.

**Consecuencia para el alcance:** el uso 1 ya está hecho y se deja. El uso 2 es
trabajo nuevo del bloque 5. Si el tiempo aprieta, se degrada a pre-descargar los
modelos con `downloadAsset()` y contar el uso 2 como trabajo pendiente, sin
fingir que está.

## Criterios de aceptación

| # | Criterio | Cómo se verificará |
| --- | --- | --- |
| C1 | MedPsy carga en el **iPhone 17 Pro Max** y produce texto | Captura: TTFT 2915 ms CPU, load 93.7 s. El 14T aborta Bare |
| C2 | TTFT medido con `gpu` y con `cpu`, y se usa el mejor | Dos líneas en `perf.jsonl` con `device_cfg` distinto |
| C3 | Las reglas de tendencia (vía A) disparan con el historial del usuario con hallazgo | `eval/run.mjs` recorre el historial y las cuenta |
| C3b | Las reglas de rango (vía B) clasifican bien los 8 marcadores, alto, bajo y normal | `eval/run.mjs` contra los casos de `mobile/src/core/marcadores.ts` |
| C3c | **El usuario sano no dispara ninguna alerta** | `eval/run.mjs` sobre su historial completo: cero señales |
| C3d | `linfocitos CD4` no aparece en pantalla ni en el video | Grep en la app y revisión del guion |
| C4 | Toda salida del modelo pasa por `limpiarJson()` antes de `JSON.parse` | Grep: cero `JSON.parse` sin `limpiarJson` en el repo |
| C5 | La alerta valida contra `AlertaSchema` | `.parse()` sin excepción sobre 20 corridas |
| C6 | La foto se borra tras extraer | Listar el directorio después del paso 3: cero imágenes |
| C7 | Ninguna imagen ni dato clínico sale del teléfono | Inspección del JSON que recibe el nodo: solo `SolicitudSchema`, `proposito:"salud"` |
| C8 | Con Wi-Fi apagado la solicitud queda `pendiente` y la app lo dice | Vídeo: avión activado, la pantalla lo muestra |
| C9 | Al reaparecer la red o el nodo, la solicitud sale y vuelve la respuesta | Vídeo: la respuesta aparece sin tocar nada |
| C10 | `perf.jsonl` tiene una línea por inferencia con `stats` completo | `wc -l` y validación de que cada línea parsea |
| C11 | Tabla base contra LoRA sobre el mismo set de evaluación | `eval/run.mjs` corre dos veces y emite la tabla |
| C12 | Cero llamadas a proveedores de IA remotos | Grep en el bundle: cero `api.openai.com`, `api.anthropic.com`, etc. |
| C13 | README declara modelo, cuantización, hardware y base preexistente | Revisión manual contra el checklist del bloque 6 |

**C12 es la que descalifica.** Ya está verificado limpio en el bundle actual;
hay que repetirlo antes de entregar.

## Errores y casos límite

| Situación | Comportamiento |
| --- | --- |
| El modelo devuelve JSON inválido tras `limpiarJson()` | Reintentar 1 vez con `temp: 0`. Si falla, mostrar "no pude leer, intenta de nuevo" y **no** inventar campos |
| `</think>` se fuga pese a `reasoning_budget: 0` | Es conocido y esperado. `limpiarJson()` lo quita. No es un bug a investigar |
| OCR con confianza < 0.5 | `validarCoherencia()` marca "lectura poco legible, repetir foto". No se envía |
| Cédula vencida o menor de edad | `validarCoherencia()` bloquea antes de armar la solicitud |
| Monto > 6 veces el ingreso mensual | Se avisa, se deja continuar; el banco ajusta a capacidad de pago |
| Sin red y sin nodo a la vista | La solicitud se queda `pendiente`. **Esto es el caso normal, no un error** |
| El nodo responde `revision` por baja confianza | Pantalla honesta: "un agente revisará", sin prometer plazos |
| `ContextOverflowError` | Trae `requiredTokens` y `ctxSize`. Subir `ctx_size`, nunca truncar en silencio |
| El modelo no carga por memoria | Ir a delegación P2P (ver Decisiones abiertas) |
| Cancelar durante la carga del modelo | Deja el modelo huérfano: llamar `unloadModel` antes de reintentar |

## Requisitos no funcionales

**Seguridad y privacidad** (es el corazón del pitch, no un anexo):

- Ninguna imagen sale del dispositivo, nunca. Se borran tras la extracción.
- El motivo clínico no viaja al banco. `SolicitudSchema.proposito` es el literal
  `"salud"` y nada más.
- Cero datos reales de personas o entidades financieras. Solo sintéticos.
- Sin credenciales ni tokens en el repo.
- El nodo y el banco reciben **solo** JSON que valida contra `SolicitudSchema`.

**Rendimiento:**

- Arranque en frío del modelo y TTFT medidos y publicados, no estimados.
- La app tiene que ser usable con el avión encendido desde el primer segundo.
- La descarga de 2.1 GB ocurre **antes** de la demo, nunca durante.

**Accesibilidad:**

- Español sencillo, sin tecnicismos. Máximo 3 frases en el mensaje de la alerta.
- Disclaimer de salud visible **en pantalla**, no escondido en el README.

**Coste:** cero. Sin servicios de pago, sin nube.

## Observabilidad

**Señales necesarias:**

- `perf/perf.jsonl`: una línea por inferencia. Campos y método en
  `perf/README.md`. Las métricas salen de `stats` de `await result.final`, **no**
  de la API de logging del SDK, que solo emite diagnóstico. TTFT medido a mano.
- `eval/resultados.md`: tabla base contra LoRA, con el número de ejemplos y la
  fecha.
- Estado de la cola visible en la app: cuántas solicitudes `pendiente`.

**Runbook para la demo:**

1. Modelos pre-descargados en el teléfono. Verificar antes de salir.
2. Nodo banco y nodo corregimiento corriendo en la laptop, misma LAN.
3. Ensayar el flujo entero 3 veces seguidas antes de grabar.

## Decisiones abiertas

Se resuelven con evidencia, no con opinión, antes de construir sobre ellas:

| # | Pregunta | Cómo se cierra |
| --- | --- | --- |
| D1 | ¿MedPsy carga on-device? | **Cerrado:** sí en iPhone 17 Pro Max CPU Q8_0. El 14T Pro aborta `libbare-kit` |
| D2 | ¿`gpu` o `cpu`? | Solo CPU medido (TTFT 2915 ms). Falta Metal en el iPhone |
| D3 | ¿USB / HyperOS / cuenta Mi? | **Cerrado:** ya no usamos el Xiaomi |
| D4 | Si D1 falla, ¿bajar cuantización o delegar? | Q4_0 primero (entrenable, ~1.1 GB), delegar después. **Q4_K_M nunca**: rompe el LoRA (`ADR-006`) |
| D6 | ¿Existe constante **Q4_0** de MedPsy 1.7B en el catálogo? | `modelRegistrySearch({ quantization })`. De esto depende el modo ligero de `ADR-006` |
| ~~D8~~ | ~~¿0.19 rompe el pipeline de Expo?~~ | **Cerrada:** `ADR-013` deja 0.18.2, lo instalado y prebuildeado. No hay migración que probar |
| ~~D9~~ | ~~¿Sobrevive la distribución P2P de modelos en 0.19?~~ | **No aplica:** nos quedamos en 0.18.2 |
| D10 | ¿`delegate` de 0.18.2 atraviesa el NAT? | Es la vía sin topic. De eso depende el bonus P2P de `ADR-013`. `provider.js` en la laptop; `composite.js` no corre tal cual |
| D7 | ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0? | Probar con el adaptador del spike. Si no, son dos entrenamientos de ~2 h |
| D5 | ¿`finetune()` corre en Android? | Prueba corta, solo si todo lo demás está entregable. No se promete en el guion antes |

---

## Reparto

`0xj4an` define el dominio y el diseno. Artur implementa.

| `0xj4an` (dominio y diseno) | Artur (implementacion) |
| --- | --- |
| Que datos de salud se generan y los dos usuarios ficticios | `mobile/` completo (UI, camara, OCR, SQLite, cola) |
| Umbrales de alerta, examen, especialista y costo | `core/` (schemas, prompts, reglas, validaciones) |
| Politica de credito y que documentos se piden | `nodo/` (peer, banco, `credito.mjs`) |
| Pantallas, estados y textos | Cliente Hyperswarm y HTTP en el telefono |
| Guion y grabacion del video | `perf/logger.ts`, `eval/` y la tabla base contra LoRA |
| | Entrenamiento del LoRA en el Mac y el README |

Frontera: los valores de dominio (umbrales, examenes, costos, politica de
credito) viven dentro de `mobile/src/core/reglas.ts`, `mobile/src/core/marcadores.ts` y
`nodo/credito.mjs`. `0xj4an` los revisa y edita ahi; Artur no los cambia sin
avisar. `core/` se mueve a `mobile/src/core/` (`ADR-004`); una vez movido, los
cambios de schema se avisan antes de tocar.
