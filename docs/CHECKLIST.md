# Checklist

`[x]` hecho y comprobado. `[~]` a medias, dice qué falta. `[ ]` sin empezar.

Ordenado por lo que decide el resultado, no por horario. El detalle de cada
punto está en [`02-stack-y-plan.md`](../.ai/runs/mvp-hackathon/02-stack-y-plan.md).

Foto viva: [`ESTADO.md`](ESTADO.md). Índice: [`README.md`](README.md).
Evals en verde. Camino pueblo medido: [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

## Dónde estamos

Ver [`ESTADO.md`](ESTADO.md). **Abierto solo:** OCR iPhone → 3 ensayos →
`perf.jsonl` → video.

---

## 1. Lo que decide el resultado

Tres cosas, en este orden.

### 1.1 El modelo tiene que entrar al producto

Technical pesa 35% y mide **uso genuino de QVAC**. Ambas ramas ya lo invocan en
código. Falta carga única al arrancar y líneas reales de `perf.jsonl` en el
aparato.

- [x] `PantallaAlerta` invoca MedPsy vía `redactarAlerta()` con `SYSTEM_ALERTA` y
  valida con `AlertaSchema`. Las reglas siguen decidiendo la señal; el modelo
  redacta el mensaje. Si MedPsy falla, la UI muestra el texto de reglas
- [ ] El modelo se carga una vez al arrancar, no por pantalla. Hoy es lazy +
  `soltarMedPsy` tras alerta/documentos. `ADR-007` dice que la descarga no
  bloquea el onboarding
- [x] `perf/logger.ts` conectado al flujo de producto (`medpsy.ts`,
  `leerDocumento.ts`, `redactarAlerta.ts`, envíos/errores). Falta exportar
  `perf/perf.jsonl` de una corrida real en el iPhone (entregable Tether Psy)

### 1.2 La rama de documentos ya lee; falta cola durable y prueba en iPhone

`PantallaDocumentos` toma foto o archivo, corre `ocr()` + MedPsy → JSON y borra
la copia (`leerDocumento.ts`). MedPsy es local primero; si no carga, el texto
va al pueblo. Sigue `PantallaLeido`, la cuota con `preCalificar()` y el envío: al banco remoto si hay wifi (`local-wifi`), al nodo del pueblo si
no. Tras aprobación: `PantallaFirma` (trazo) → `PantallaDesembolso` (simulado).
HTTP al pueblo medido desde iPhone ([`PRUEBA-NODO.md`](PRUEBA-NODO.md));
directo a Railway en teléfono, pendiente de anotar.

`PantallaDatos.tsx` (editable, deudas y personas a cargo) sigue en el repo; el
camino de la demo no pasa por ella (`lectura.ts` manda deudas/personas en 0).

La rama del examen ya tiene foto → OCR → MedPsy+LoRA → `clasificar()`
(`PantallaExamen` / `leerExamen.ts`). Si hay hallazgos fuera de rango, ofrece
crédito vía `armarPaqueteDesdeLab`. Entrada manual sigue de respaldo. El
historial se lee siempre; el examen es opción tras el resultado (alerta o en orden).
Entrada ya no elige Historial|Examen como vías paralelas.

- [~] `ocr()` sobre la foto, extracción a JSON con `SYSTEM_EXTRACCION_*`,
  validación con `CedulaSchema` e `IngresosSchema`. Código listo; falta
  verificar en el iPhone
- [~] Examen con LoRA `lab-v3`. Código + asset en la app; falta rebuild
  nativo y corrida en el iPhone
- [~] Crédito tras examen si hay hallazgos (`armarPaqueteDesdeLab`). Código listo;
  falta verificar en el iPhone
- [~] **Borrar la foto** después de extraer. El código lo hace; falta verificar
  en el iPhone (C6)
- [x] Persistencia y cola. `expo-sqlite` en `colaSqlite.ts`; una pendiente a la
  vez. Si falla el envío, se guarda y al reabrir la app se vuelve a `PantallaCuota`.
  Falta verificar en el iPhone (C8/C9)
- [x] Envío al pueblo desde iPhone (LAN): **medido** — ver
  [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) / [`PRUEBA-NODO.md`](PRUEBA-NODO.md)
- [~] Envío directo al banco (Railway) en modo `local-wifi` desde iPhone:
  código listo; anotar corrida en `PRUEBA-TELEFONO.md`
- [x] Firma con trazo + disclaimer legal (`PantallaFirma`) y desembolso
  simulado (`PantallaDesembolso`) tras aprobación. Falta verlo en el iPhone
  en la misma corrida de demo grabada

Material listo: `data/documentos/` tiene ocho ficticios (nítido y difícil de
cédula, ingresos, extracto y examen) más `esperado.json`. Cada corrida en el
iPhone se anota en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

### 1.3 P2P no es la demo

Cerrado: HTTP (banco o pueblo). Detalle y cómo *no* decirlo en cámara:
[`ESTADO.md`](ESTADO.md) § Honestidad, [`PRUEBA-NODO.md`](PRUEBA-NODO.md),
[`VIDEO.md`](VIDEO.md).

- [x] Guion/README no prometen Hyperswarm ni QVAC `delegate`
---

## 2. La demo tiene que correr entera

- [x] Wi-Fi / LAN al pueblo: medido — [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md)
- [ ] Wi-Fi al banco directo (`local-wifi`): anotar corrida en teléfono
- [ ] **Ensayarla tres veces seguidas** con el iPhone en la mano. Lo que falla,
  falla aquí y no grabando
- [x] Disclaimers de salud visibles en Alerta, Examen, Salud y Revisión

---

## 3. Entregables

- [x] Guion en `docs/VIDEO.md`, minuto a minuto y con cifras (verificar tasa/
  cuota contra `decidir()` antes de grabar: **17.4% / B/. 84.08** para 920)
- [ ] Video <= 5 min, español, enlace sin login. Es lo primero que mira el
  jurado del reto General
- [ ] `perf/perf.jsonl` con una línea por inferencia real del iPhone (logger ya
  escribe; falta la corrida exportada)
- [x] README: modelo, cuantización, hardware, base preexistente y fila de
  extracción a JSON
- [x] **Declarar la base preexistente**: plantilla AI Engineering Kit

---

## 4. LoRA (examen; falta iPhone)

Evidencia: [`spikes/lora-medpsy/RESULTADOS.md`](../spikes/lora-medpsy/RESULTADOS.md)
(corrida 3 → `lora-lab-v3.gguf` en la app).

- [x] Entrenar + tabla base (C11 spike)
- [x] Adaptador en app (`lora.ts` / `leerExamen.ts`)
- [ ] Re-medir en el iPhone
---

## 5. Lo que ya está (resumen)

Inventario largo → git history + [`ESTADO.md`](ESTADO.md) +
[`eval/resultados.md`](../eval/resultados.md). Abierto residual:

- [~] Qué pasa si falta un documento; `PantallaDatos` (deudas/personas) fuera
  del camino demo
- [x] Dominio, motor crédito, eval, pantallas camino demo, landing/admin,
  bloque 0 iPhone (C1) — ver ESTADO / PRUEBA-TELEFONO

---

## Criterios de entrega

| | Criterio | Estado |
| --- | --- | --- |
| [x] C1 | MedPsy carga en el iPhone y produce texto | `load_ms` 93722, TTFT 2915 ms CPU, 56 tokens |
| [ ] C2 | TTFT con `gpu` y `cpu`, se usa el mejor | Solo `cpu`. Falta Metal |
| [x] C3 | El historial dispara con el caso con hallazgo | `eval/run.mjs` exit 0 |
| [x] C3b | El laboratorio clasifica en los tres estados | Los 7 marcadores |
| [x] C3c | **El sano no dispara ninguna alerta** | Cero señales |
| [x] C3d | CD4 no aparece en pantalla ni en el video | Fuera del código. Revisar guion al grabar |
| [x] C4 | Toda salida del modelo pasa por `limpiarJson()` | Cero `JSON.parse` sueltos en `mobile/src/` |
| [~] C5 | La alerta valida contra `AlertaSchema` | Código listo (`redactarAlerta`). Falta verlo en el iPhone |
| [~] C6 | La foto se borra tras extraer | Código en `leerDocumento.ts`. Falta verificar en el iPhone |
| [~] C7 | Ninguna imagen ni dato clínico sale del teléfono | Schema del banco rechaza motivo/foto (`eval` + PRUEBA-NODO). Falta E2E en iPhone |
| [~] C8 | Con Wi-Fi apagado queda `pendiente` y se dice | Código: SQLite + UI. Falta iPhone |
| [~] C9 | Al volver la red, sale y vuelve la respuesta | Poll + cola durable. Falta iPhone |
| [ ] C10 | `perf.jsonl` con una línea por inferencia | Logger cableado; falta export de corrida real |
| [~] C11 | Tabla base contra LoRA | Spike 5%→68% + adaptador en app (examen). Falta verlo en iPhone |
| [x] C12 | **Cero llamadas a proveedores de IA remotos** | Verificado en `mobile/src`, `nodo`, `eval`, `data`. Repetir sobre el bundle antes de entregar |
| [x] C13 | README declara modelo, cuantización, hardware y base | MedPsy Q8_0, OCR_LATIN, extracción = MedPsy, iPhone 17 Pro Max, Kit declarado |

**C12 y C13 descalifican.** Los demás cuestan puntos. El cuello de botella
ahora es **1.2 en el iPhone** (OCR + envío E2E) y la cola durable (C8/C9).

---

## Decisiones abiertas

Lista viva (no usar el snapshot de `03-specification.md`).

- [x] D1 ¿MedPsy carga on-device? **Sí**, iPhone 17 Pro Max, CPU, Q8_0
- [x] D3 ¿HyperOS pide cuenta Mi? **Aparcado**, ya no usamos el Xiaomi
- [ ] D2 ¿`gpu` o `cpu`? Solo CPU medido. Falta Metal en el iPhone
- [ ] D5 ¿`finetune()` corre en el dispositivo? Solo si todo lo demás está entregable
- [ ] D7 ¿Un adaptador entrenado sobre Q8_0 carga sobre Q4_0?
- [x] D10 ¿`delegate` atraviesa NAT? **No es plan de demo.** Bonus solo si se mide a propósito.
- [x] D11 ¿Se recupera el transporte P2P? **No.** Demo = HTTP. No prometer Hyperswarm ni `delegate`.