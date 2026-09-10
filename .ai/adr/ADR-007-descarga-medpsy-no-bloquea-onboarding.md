# ADR-007: La descarga de MedPsy no bloquea el onboarding

- Estado: aceptada
- Contexto: MedPsy 1.7B Q8_0 pesa **2.1 GB**. En el smoke de iOS Bare arranca
  (`2b/4`) y `loadModel` se queda en `descarga 0%` mientras bajan los pesos. En
  Android todavía no llegamos a esa fase (abort de Bare). Si la primera pantalla
  espera a `loadModel`, el usuario rural ve un splash de minutos o un cuelgue.

  QVAC en móvil, al irse a background, llama `suspend()` y **pausa** descargas.
  No hay una vía documentada para bajar 2.1 GB con la app cerrada o el teléfono
  bloqueado.

## Decisión

La app es usable **sin MedPsy en RAM**. Los pesos se bajan con `downloadAsset()`
en primer plano, sin bloquear navegación. `loadModel()` solo cuando hace falta
inferencia.

| Qué | Cuándo corre |
| --- | --- |
| Perfil, historial, laboratorio, reglas, cola SQLite, fotos | Siempre. Las reglas de `ADR-005` no necesitan el LLM |
| `downloadAsset(MedPsy)` | Al arranque si `getModelInfo()` dice que no está en caché. Barra persistente, progreso frecuente, Wi-Fi, “mantén la app abierta” |
| `loadModel` + `completion` | Al pulsar explicar alerta o extraer JSON, y solo si el asset ya está |
| OCR (`OCR_LATIN`) | Independiente y más chico; no espera a los 2.1 GB |
| Demo / pueblo | Pre-descarga o nodo que reparte el `.gguf` por LAN (`A6b`, `ADR-001` uso 1) |

No metemos los 2.1 GB en el APK. No añadimos un segundo modelo “rápido” que
rompa `ADR-002`. No prometemos descarga con la app en segundo plano.

## Qué haremos (cuando Android arranque Bare)

1. Un proveedor de arranque: `getModelInfo` → si falta, `downloadAsset` en
   paralelo al onboarding; barra global cada 1%.
2. Las pantallas de ficha y mediciones no esperan al modelo. Si la señal ya
   existe y MedPsy no está, se muestra la alerta por reglas y el texto de
   MedPsy queda pendiente.
3. `loadModel` se llama una vez, al primer uso de inferencia, no al splash.
4. En el evento: caché caliente en el 14T Pro **antes** de grabar.

Esto **no se implementa ahora**. El bloqueo actual es Android: Bare aborta en
`loadModel` / `worklet.start` (`libbare-kit.so` / `js_callback_s::on_call`)
aunque `2b/4` (worker JS) esté bien. Hasta que eso viva, una barra de descarga
no sirve en el Xiaomi.

## Alternativas consideradas

- **Splash hasta 100%.** Simple y pésima UX; parece un crash.
- **Meter el GGUF en el binario.** Choca con tamaño de Play/EAS y con “la
  inteligencia llega al pueblo”, no al APK.
- **Background fetch nativo.** El worklet de QVAC no sigue descargando
  suspendido; reanuda al volver (caché resumable). Útil, no es segundo plano.
- **Q4 de entrada.** Eso es `ADR-006` (modo ligero), no un truco de UX. Sigue
  haciendo falta no bloquear la UI.

## Reabrir si

QVAC documenta una descarga que sobrevive `suspend()`, o el catálogo deja un
MedPsy entrenable claramente más chico y `ADR-006` lo adopta como default.
