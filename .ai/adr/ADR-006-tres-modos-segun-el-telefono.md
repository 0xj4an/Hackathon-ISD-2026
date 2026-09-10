# ADR-006: Tres modos de ejecución según el teléfono que toque

- Estado: aceptada
- Contexto: la demo corre en un **iPhone 17 Pro Max** (MedPsy Q8_0, CPU, TTFT
  2915 ms). Se intentó el Xiaomi 14T Pro (Dimensity 9300+, 12 GB, HyperOS 3) y
  Bare aborta al `worklet.start`. El usuario objetivo del brief sigue siendo
  "una persona en zona rural de Panamá con Android de **gama media**". No son
  el mismo aparato, y los docs de QVAC son explícitos:
  *"Below 4 GB, most LLMs will fail to load"*.

  `ADR-002` fijó MedPsy 1.7B **Q8_0**, que pesa 2.1 GB. Esa decisión se validó
  contra el teléfono de la demo, no contra el del usuario. Es un hueco de
  razonamiento, y además un riesgo de credibilidad: un jurado técnico nota de
  inmediato una demo en gama alta que promete gama media.

## Decisión

La app decide su modo en arranque con `getSystemResources()`, que ya existe en
0.18.2 y que `mobile/App.tsx` ya llama.

| Modo | Cuándo | Qué corre en el teléfono |
| --- | --- | --- |
| **Completo** | RAM holgada (el iPhone 17 Pro Max y similares) | MedPsy Q8_0 (2.1 GB) más el adaptador. Autónomo total |
| **Ligero** | RAM ajustada | MedPsy **Q4_0** (~1.1 GB) más el adaptador. Autónomo total |
| **Delegado** | RAM insuficiente | Solo OCR en el teléfono. El LLM corre en el nodo del corregimiento, por HTTP en la LAN (texto, nunca fotos). QVAC `delegate` no atraviesa NAT; no es este modo |

En los tres modos las fotos se borran en el teléfono y nunca salen. En modo
delegado viaja **texto**, nunca imágenes, y sigue cumpliendo el reglamento
("en el dispositivo o en el nodo local; nunca un proveedor remoto").

## Alternativas consideradas

- **Solo Q8_0 y asumir gama alta.** Es lo que había. Demo bonita, promesa que no
  se sostiene, y contradice el usuario que el propio brief define.
- **Solo Q4_K_M**, que es la cuantización que el blog de MedPsy recomienda
  (~1.2 GB, pierde menos de un punto de score). **Descartada: no es entrenable.**
  `finetune()` solo acepta F32, F16, Q4_0, Q8_0, TQ1_0 y TQ2_0, y Q4_K_M no está
  en esa lista. Elegirla mata el LoRA de `ADR-003`.
- **Bajar todo a Q4_0 y olvidarse del modo completo.** Más simple, pero
  desperdicia el hardware de la demo y regala calidad sin necesidad. Q8_0 es
  descrita como "exactly lossless" (66.31 contra 66.31).
- **Delegar siempre.** Mata el argumento del proyecto, que es que la inteligencia
  vive en el bolsillo.

## Consecuencias

- **El nodo del corregimiento gana su tercera razón de existir**: reparte los
  pesos, hace de cartero, y ahora también presta cómputo al teléfono que no
  alcanza. Deja de ser un adorno del pitch.
- Hay que confirmar que existe una constante Q4_0 de MedPsy 1.7B en el catálogo.
  Si no existe, el modo ligero se cae y quedan dos modos.
- El adaptador LoRA se entrena sobre una cuantización concreta. Hay que verificar
  si un adaptador entrenado sobre Q8_0 carga sobre Q4_0; si no, son dos
  entrenamientos, y con ~2 h cada uno eso cabe pero hay que planearlo.
- **El README declara los tres modos y en cuál se grabó el vídeo.** El reto
  Tether Psy exige "nombres honestos de modelo, cuantización y hardware de
  ejecución": decir "corre en un teléfono" mientras se demuestra en un buque
  insignia es exactamente lo que ese criterio penaliza.
- Mejora el pitch en vez de debilitarlo: **la app se adapta al aparato que le
  toque**, que es lo que "Sovereign Intelligence at the Edge" significa cuando
  el edge es real y no un laboratorio.

## Reabrir si

El bloque 0 muestra que el iPhone 17 Pro Max no carga Q8_0 con holgura (load
~94 s en CPU), en cuyo caso el modo completo desaparece y Q4_0 pasa a ser el
único local. O si no existe constante Q4_0 entrenable, en cuyo caso los modos
son completo y delegado, sin escalón intermedio.
