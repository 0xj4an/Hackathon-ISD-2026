# Ina Igar · Camino de la medicina

> ISD Summit 2026 · 0xj4an y Artur · General · Tether QVAC Psy · Caja de Ahorros.

App de **salud y crédito**. Lee lo que el teléfono ya midió —o un papel de
laboratorio—. Cotiza el año. Pide el préstamo. Las fotos no salen. Si este
aparato no corre el modelo, el pueblo lo corre.

Dos tuberías: **inferencia** (MedPsy / LoRA / QVAC delegate) y **solicitud**
(JSON al banco o al pueblo). Nunca un proveedor de IA remoto.

**Sitio:** [isd-hackathon-landing-production.up.railway.app](https://isd-hackathon-landing-production.up.railway.app/) · [pitch](https://isd-hackathon-landing-production.up.railway.app/pitch)  
**Estado vivo:** [`docs/ESTADO.md`](docs/ESTADO.md) · **cómo venderlo:** [`docs/VENTA.md`](docs/VENTA.md) · **mapa:** [`docs/README.md`](docs/README.md)

## Qué hace

1. **Salud.** Apple Salud / Health Connect, o foto de un examen. Catorce
   umbrales citados. Las reglas marcan el rango. MedPsy redacta: qué se vio,
   qué hacer, a quién ver y cuánto cuesta. El caso sano no dispara. No es
   diagnóstico.
2. **Ruta y costo.** El crédito es el año de esa ruta (consulta, controles,
   medicamento), no un mínimo de consumo ni un nombre de enfermedad.
3. **Documentos.** OCR de cédula, ingresos y extracto en el teléfono. Las
   fotos se borran. El banco recibe JSON: nombre, cédula, ingreso, monto,
   motivo «salud». Nunca la foto ni el hallazgo clínico.
4. **Laboratorio.** OCR aquí → MedPsy + LoRA `lab-v3`. JSON válido de lab:
   **5 % → 68 %**. Clasificar el rango es código, no el adaptador.

## Tres caminos ([`ADR-006`](.ai/adr/ADR-006-tres-modos-segun-el-telefono.md))

OCR siempre en el teléfono. Inferencia y préstamo son tuberías distintas.

| Camino | Inferencia | Solicitud |
|---|---|---|
| WiFi · modelo local | MedPsy + LoRA en el teléfono | HTTPS al banco |
| Sin WiFi · modelo local | MedPsy + LoRA en el teléfono | Pueblo / cola |
| Delegar al nodo | QVAC `delegate` al par; plano B `POST /inferir` | Pueblo / cola |

El tercer camino es el producto cuando el aparato no carga 2.1 GB: el pueblo
presta el cómputo. Delegate medido: **72** extracciones `@p2p-delegate`.

La malla nodo↔nodo (Hyperswarm topic) es el siguiente tramo: un par en cada
corregimiento. Hoy el crédito viaja por HTTP.

## Modelos (nombres honestos)

| Uso | Modelo | Cuantización | Tamaño |
|---|---|---|---|
| Alerta / extracción docs | MedPsy 1.7B (`HEALTHCARE_1_7B_MEDICAL_Q8_0`) | Q8_0 | 2.1 GB |
| OCR | `OCR_LATIN` | - | - |
| Lab (examen) | MedPsy + LoRA `lab-v3` | Q8_0 + LoRA | +33 MB |

Producto: Android de gama media + Health Connect. Demo de hoy: iPhone 17 Pro
Max, iOS 26.6.1, CPU (TTFT 2915 ms). SDK `@qvac/sdk` **0.18.2**. Log:
[`perf/`](perf/).

## Cómo correrlo

Node ≥ 22.17, iPhone físico. `npx qvac doctor`.

```bash
cd mobile && npm install && npx expo start
cd nodo && npm install && npm run corregimiento   # misma WiFi; la app descubre sola
```

URLs de banco/admin: [`docs/ESTADO.md`](docs/ESTADO.md). Primera vez: descarga
MedPsy (~2.1 GB) con wifi.

## Evaluación

```bash
node eval/run.mjs
node --test eval/credito/*.test.mjs
node --test eval/salud/alerta.test.mjs eval/nodo/inferir.test.mjs
```

LoRA spike: [`spikes/lora-medpsy/`](spikes/lora-medpsy/).

## Producto y siguiente

La app es esta. El recorte de la demo: historial sintético, un pueblo en la
LAN, cierre de muestra (trazo en pantalla).

- **Banco.** Scorecard ya compartido. Siguiente: origination y desembolso en
  producción.
- **LoRA.** lab-v3 en el producto. Siguiente: un adaptador por cédula,
  ingresos, extracto y más paneles.
- **Malla.** Delegate ya presta cómputo. Siguiente: topic entre pueblos.
- **Campo.** El esquema ya es Health Connect / HealthKit. Siguiente: el
  historial real en Android.

## Seguridad

No es diagnóstico. Banco: solo JSON de crédito. Crédito: scorecard
determinista ([`ADR-011`](.ai/adr/ADR-011-el-modelo-de-credito.md)).

## El nombre

**Ina Igar** = "Camino de la medicina" en gunagaya (*Gayamar sabga*, Orán / Wagua).

## Base preexistente (obligatoria)

Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit)
(ago 2026): `standards/`, `templates/`, `.ai/`, y el README del kit en
[`docs/_archive/ai-engineering-kit.md`](docs/_archive/ai-engineering-kit.md).
Septiembre en `docs/superpowers/` es nuestro.

## Docs del equipo

Ver [`docs/README.md`](docs/README.md): VENTA, ESTADO, CHECKLIST, BRIEF, PRUEBA-*, ADRs.

## Licencia

MIT. Ver [LICENSE](LICENSE).
