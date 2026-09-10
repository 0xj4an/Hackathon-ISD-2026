# Línea base del proyecto

## Estado actual

Repo generado a partir de la plantilla AI Engineering Kit (ArturVargas/AI_Engineering_Kit). Idea en `docs/BRIEF.md`. Scaffold de producto: `mobile/` (Expo SDK 54 + `@qvac/sdk` 0.18.2 fijado, prebuild Android OK, smoke test MedPsy), `core/` (schemas, prompts, reglas, validaciones), `nodo/` (peer Hyperswarm + banco mock).

## Arquitectura y despliegue

Por definir. Restricción base: `@qvac/sdk` levanta un worker Bare y se comunica por RPC; un worker por app, varios modelos cargados a la vez; ciclo `loadModel()` -> operaciones -> `unloadModel()` -> `close()`.

## Dependencias e integraciones

- `@qvac/sdk` 0.18.2, `@qvac/cli` 0.12.0.
- Addons según capacidad: `@qvac/llm-llamacpp`, `@qvac/embed-llamacpp`, `@qvac/transcription-whispercpp` / `-parakeet`, `@qvac/tts-ggml`, `@qvac/translation-nmtcpp`, visión/OCR, `@qvac/diffusion-cpp`.
- Móvil: Expo ≥ 54 con `@qvac/sdk/expo-plugin`, `react-native-bare-kit`, `bare-rpc`.

## Lo que ya está probado (en `../qvac-course/`, fuera del repo)

- Entorno: `qvac doctor` pasa completo en el Mac (Metal, Node 26, adb, Xcode, ffmpeg, Bare 1.31).
- Chat offline con `LLAMA_3_2_1B_INST_Q4_0`: carga en caliente 2.1 s, primer token 57-130 ms en caliente, 60-200 tok/s. El 1B falla en aritmética, hechos y razonamiento sobre historial largo; sirve para chat acotado, no como enciclopedia.
- RAG con embeddings (`m2/rag.js`).
- Descarga y caché de modelos con `downloadAsset()`.
- Delegación P2P entre pares, probada en 0.18.2. `ADR-001` la había descartado al mover a 0.19; **`ADR-013` revirtió eso y nos quedamos en 0.18.2**, que la conserva. Es la única vía P2P que no usa descubrimiento por topic (`dht.connect(publicKey)` directo), justo el paso que falla detrás de NAT. Pendiente de correr.
- Fine tuning LoRA sobre MedPsy 1.7B Q8_0: **sin validar en este repo.** Hubo un spike anterior con buenos indicios, pero se retiró porque no era reproducible aquí. Se rehace desde cero, con los scripts dentro del repo. Hasta que corra, no se planifica como si funcionara.

## Riesgos y deuda conocida

- Un teléfono de gama media no corre cómodo 1B + embeddings + Whisper: la salida es delegar P2P a la laptop, no la nube.
- Móvil solo en dispositivo físico; el pipeline Expo hay que probarlo antes de depender de él para la demo.
- Los relays P2P de los ejemplos usan claves mock; para una demo entre redes distintas hace falta relay propio o misma LAN.
- Cualquier `fetch` a un proveedor de IA externo descalifica: revisar dependencias y ejemplos copiados.

## Próxima iniciativa

`runs/mvp-hackathon/`: decidir idea y reto(s), especificar el MVP, arquitectura y plan para 48 h.

## Transporte del nodo: lo que se probó y lo que falta

Probado el 9 sep con `nodo/` corriendo de verdad por primera vez.

**HTTP en la LAN: funciona.** Un POST con una `SolicitudSchema` válida al rol
`banco` devuelve una `RespuestaBancoSchema` correcta. Con 520 USD de ingreso
declarado y 300 pedidos: aprobado 300, 6 meses, 12.5% anual, cuota 51.84, que
respeta el tope del 30% del ingreso. La política de `nodo/credito.mjs` hace lo
que dice.

**Hyperswarm entre dos procesos en la misma máquina: NO conecta.** Ni con el
código de `nodo/`, ni con una prueba mínima de dos peers y un topic aislado.
Cero conexiones tras dos minutos en ambos casos.

La causa, medida: `hyperdht` arranca bien y llega a la red (61 nodos conocidos,
o sea que el UDP sale), pero reporta **`firewalled: true`**. El nodo está detrás
de NAT y no acepta entrantes. Dos peers detrás del mismo NAT necesitan que el
router haga *hairpinning*, y muchos no lo hacen. El firewall de macOS estaba
desactivado, así que no es eso.

**Lo que esto sí implica:** no se puede demostrar el P2P con dos procesos en el
Mac. Cualquier ensayo que dependa de eso va a fallar.

**Lo que NO implica todavía:** el caso de la demo es teléfono y laptop, dos
aparatos distintos. Eso no se ha probado y no se puede probar sin el teléfono.
Dato en contra: `hyperswarm` 4.17.1 **no trae descubrimiento en LAN**, ni mDNS
ni multicast, así que dos aparatos en el mismo wifi igual pasan por la DHT
pública y dependen del mismo hole punching. Puede fallar por la misma razón.

**Plan que no depende de que funcione:** el transporte HTTP en la LAN ya está
escrito y probado. El teléfono le pega a la IP local de la laptop, sin internet
y sin nube, que es lo que el reglamento pide. Decirle a eso "los aparatos se
hablan directo, sin internet" es exacto; decirle "Hyperswarm P2P" cuando en la
demo salió por HTTP no lo sería.

**Pendiente:** probar Hyperswarm entre teléfono y laptop en cuanto haya
teléfono. Si falla, queda la opción de `swarmRelays` con relay propio, que los
docs de QVAC mencionan pero no documentan cómo desplegar.
