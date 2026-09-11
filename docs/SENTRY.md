# Sentry · telemetría de la app

Proyecto: [ISD Hackathon Mobile](https://0xj4an.sentry.io/projects/isd-hackathon-mobile/)  
Org: `0xj4an` · DSN en `mobile/src/sentry.ts`.

**Qué manda:** eventos de corrida (info/warning/error) **sin** texto OCR, fotos,
base64 ni paths de archivos. El detalle de producto sigue en
[`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

---

## Releases

El `release` lo arma JS desde `app.json` + `ios.buildNumber`:

`isd-hackathon-mobile@<version>+<buildNumber>`

| Release | Notas |
|---|---|
| `…@1.0.5+2` | Arranque ≥1.8 s, pantallas de envío, telemetría completa. **Medido 10 sep noche** |
| `…@1.0.4` | JS nuevo sobre binario viejo (icono/splash no) |
| `…@1.0.2` / anteriores | Builds previos / debug |

**Trampa conocida:** Sentry puede mostrar `release` JS = `1.0.5+2` y a la vez
contexto nativo `app_version: 1.0.4` / `app_name: HackathonISD`. Eso significa
**JS nuevo + IPA nativo desfasado**. El icono del home solo cambia con
rebuild + borrar app + reinstalar.

Comprobar en el evento:
- tags `release`, `dist`
- context `app.app_version`, `app.app_build`, `app.app_name`

---

## Prefijos de mensaje (Issues)

Buscar en Issues por el prefijo (o filtrar `release:…`):

| Prefijo | Significado |
|---|---|
| `sesion:` | Cold start (`modo`, sdk, cola pendiente) |
| `modelo:` | Carga / fallo / unload MedPsy (± LoRA) |
| `lora:` | Asset LoRA: cache / copy / miss |
| `inferencia:` | Una corrida OCR/MedPsy/nodo (`task`, `device`, ttft/load/chars) |
| `lectura:` | Lote docs/lab ok o fallos |
| `alerta:` | Redacción de alerta ok/fail |
| `credito:` | Envío banco/pueblo (también OK) |
| `nodo:` | Scan LAN miss |

Breadcrumbs útiles (timeline del evento): `navegacion`, `lectura`, `envio`,
`modelo`, `sesion`. Categoría `lectura` no se scrubbea por palabras bloqueadas.

Código: `mobile/src/sentry.ts`, cableado en `App.tsx`, `medpsy.ts`, `lora.ts`,
`leerDocumento.ts`, `leerExamen.ts`, `redactarAlerta.ts`, `envio.ts`,
`perf/logger.ts` (`recordError` / `recordInference`).

---

## Rebuild limpio (icono + splash + loading)

Para Artur / cualquiera con el iPhone de demo:

```bash
cd Hackathon-ISD-2026 && git pull origin main && cd mobile && npm install
```

1. **Borrar** la app del iPhone (si no, iOS cachea el icono).
2. Instalar nativo:
   ```bash
   npx expo run:ios --device --configuration Release
   ```
3. Al abrir: splash negro → loading ≥ ~2 s → Entrada. Icono = huellas / **Ina Igar**.
4. En Sentry, cold start → `sesion:` con `release …@1.0.5+2` (o el de `main`)
   y nativo `app_version` alineado si el Info.plist salió del prebuild.

**No basta** solo `expo start` / reload sobre un IPA viejo: cambia JS, no el icono.

`ios/` está en `.gitignore`: el bump de versión vive en `mobile/app.json`
(`version` + `ios.buildNumber`). El prebuild/`run:ios` lo materializa en el
binario.

---

## Corrida medida · 10 sep 2026 ~21:03–21:36 (hora Panamá)

Release **`isd-hackathon-mobile@1.0.5+2`**. Evidencia Sentry Issues + Discover
(sin `perf.jsonl`). Producto: [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

### Qué salió bien

| Evento | Detalle |
|---|---|
| `sesion: start local-wifi` | Varios cold starts |
| `lectura: ok 3/3` | Lote completo de documentos |
| `credito: ok via banco` | Railway `/solicitud` OK |
| `credito: ok via pueblo` | Pueblo LAN `:8788` OK |
| `lora: lab-v3 copy/cache` | Adapter de lab visto en dispositivo |

### Qué falló / ruido

| Issue | Nivel | Count (issue) | Nota |
|---|---|---|---|
| `WatchdogTermination` (MOBILE-7) | fatal | 6 | iOS mató la app por RAM |
| `ggml_gallocr_alloc_graph` (MOBILE-3) | error | 28 | OCR / foto grande |
| `alerta: fail` (MOBILE-J) | warning | 7 | `err=parse` tras ~691 chars |
| `INFERENCE_CANCELLED` | error | 12+ | Ruido al salir/reintentar |
| `MODEL_LOAD_FAILED already registered` | error | 1 | Carrera `loadModel` |
| `nodo: no hallado en LAN` | warning | 2 | Boot sin pueblo |

### Mitigaciones en código (post-corrida, pendiente rebuild/reload)

- Alerta: system solo `{"mensaje"}` + `predict: 120` + alias `message`
- MedPsy: mutex de carga (anti `already registered`)
- OCR: lado máx. 1024, reintento a 800, `cederRam` 350 ms
- App: `soltarMedPsy(true)` al pasar a background (anti Watchdog)

Consola laptop: `http://127.0.0.1:8788/consola` (pueblo) espeja LOG del celular.

---

## Corrida medida · 10 sep 2026 ~20:47–20:53 (hora Panamá)

Release **`isd-hackathon-mobile@1.0.5+2`**, iPhone 17 Pro Max, modo
`local-wifi`. Evidencia solo Sentry (sin `perf.jsonl` exportado al Mac).

### Qué salió bien

| Evento | Detalle |
|---|---|
| `sesion: start local-wifi` | Arranque; ~1.8 s hasta el mensaje (min dwell) |
| `modelo: medpsy load` | MedPsy en CPU |
| `inferencia: ocr @cpu` / `extraccion @cpu` | Pipeline docs |
| `lectura: ok 1/1` | Doc `work` (~950 chars), copia borrada (breadcrumb) |
| `credito: ok via banco` | POST Railway `/solicitud` → HTTP 200, modo wifi |

Flujo UI visto en breadcrumbs: leído → cuota → «Firmar y enviar» →
`envio ok:banco`.

### Qué falló / ruido en la misma ventana

| Issue | Nivel | Nota |
|---|---|---|
| `ggml_gallocr_alloc_graph` / foto demasiado grande | error | OCR en **algunas** fotos; achicar/retry no siempre basta |
| `alerta: fail` | warning | Redacción MedPsy no cerró (×2) |
| `MODEL_LOAD_FAILED … already registered` | error | Carrera al cargar modelo |
| `INFERENCE_CANCELLED` | error | Cancel al salir/reintentar |
| `nodo: no hallado en LAN` | warning | Al boot; en wifi el banco igual responde |

### Logs locales

`perf.jsonl` / `qvac.jsonl` viven en el contenedor de la app en el iPhone
(`Paths.document`). No están en el repo. Export: Entrada → Registro → compartir,
o Xcode → Devices → contenedor. Ver [`perf/README.md`](../perf/README.md).

---

## Cómo mirar una corrida nueva

1. Releases → el `…@version+build` del build instalado.
2. Issues → filtrar ese `release:` o buscar `sesion:` / `credito:` / `lectura:`.
3. Abrir el evento → breadcrumbs + tags `modo`, `envio`, `task`, `device`.
4. Pegar el resumen en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) (Sentry no
   sustituye la anotación de producto).
