# Ina Igar · Camino de la medicina

**Esto es una app de teléfono** (Expo / React Native). El resto del repo —
nodo, banco, landing — existe para que esa app pueda avisar, cotizar y pedir
un crédito sin mandar fotos a nadie.

ISD Summit 2026 · 0xj4an y Artur.

[Ver la demo](https://youtu.be/oiW3VXyl36Q) ·
[Pitch](https://isd-hackathon-landing-production.up.railway.app/pitch) ·
[Sitio](https://isd-hackathon-landing-production.up.railway.app/)

## Qué quisimos hacer

En el interior y las comarcas la gente no se atiende porque no tiene plata y
porque ir al médico es un viaje. Quisimos un teléfono que **mire tu salud, te
avise, y te preste** para tratarte — sin que el banco vea qué te pasó.

La app se conecta a **Apple Health** o **Google Health** y monitorea. Si hay
una anomalía, avisa y recomienda qué hacer. El crédito se ofrece **desde esa
alerta**. Si tienes un laboratorio, lo puedes subir (es opcional). Cotiza el
año de tratamiento. Si no puedes pagar, pide un crédito de salud.

Las fotos de cédula, sueldo y examen se leen **en el teléfono y se borran**.
Al banco solo llega un JSON: nombre, cédula, ingreso, monto. Motivo: «salud».
Nunca la imagen ni el hallazgo clínico.

No diagnostica. Las reglas marcan el rango. El modelo (MedPsy) solo redacta el
aviso.

## Cómo funciona (en el teléfono)

1. Entras un caso (en la demo: datos de prueba con el mismo esquema que Apple
   Health / Google Health).
2. La app revisa las mediciones. Si estás bien, no molesta.
3. Si hay una señal, te dice qué se vio, qué hacer y cuánto cuesta el año
   (consulta, controles, medicamento).
4. Te ofrece el crédito. El examen **no** hace falta para pedirlo.
5. Si tienes el papel de laboratorio, lo fotografías. OCR aquí. Un LoRA
   (`lab-v3`) saca los marcadores. Puede salir algo que Health no vio.
6. Fotografías cédula, ingresos y extracto. OCR aquí. Las fotos se borran.
7. La solicitud sale al banco (si hay wifi) o espera / pasa por un nodo P2P
   (si no hay red, o si este teléfono no puede correr el modelo de 2.1 GB).

Tres caminos, mismos papeles:

| Este teléfono | Red | El modelo corre | El crédito sale |
|---|---|---|---|
| Puede | wifi | aquí | al banco |
| Puede | sin wifi | aquí | cola o nodo |
| No puede (2.1 GB) | — | un **nodo P2P** (solo viaja el texto) | cola o nodo |

## Cómo correrlo

Hace falta un **teléfono físico**. QVAC no corre en Expo Go. La demo de este
hackathon se grabó en un **iPhone**. El producto es Android de gama media.

Node ≥ 22. Xcode (iOS) o Android Studio. `npx qvac doctor`.

```bash
git clone https://github.com/0xj4an/Hackathon-ISD-2026.git
cd Hackathon-ISD-2026/mobile
npm install
npx qvac doctor
npx expo run:ios --device --configuration Release     # iPhone
# npx expo run:android --device                       # Android
```

La primera vez descarga **MedPsy (~2.1 GB)** con wifi. Eso no se hace en
cámara.

En la app eliges el camino (wifi / sin red / delegar al nodo). Las tarjetas
de Entrada se quedan como están.

### Si quieres el nodo (camino sin red o teléfono débil)

Misma WiFi que el teléfono:

```bash
cd nodo && npm install && npm run corregimiento
# consola: http://127.0.0.1:8788/consola
```

El banco de la demo ya está en Railway. No hace falta levantarlo para usar la
app en `local-wifi`.

Detalle de URLs y qué está medido: [`docs/ESTADO.md`](docs/ESTADO.md).

## Qué hay en el repo

| Carpeta | Para qué |
|---|---|
| **`mobile/`** | La app. Expo 54, React Native, `@qvac/sdk` 0.18.2 |
| `nodo/` | Laptop en la red: reenvía el crédito y, si hace falta, corre MedPsy |
| `landing/` | Sitio, pitch y admin del banco |
| `data/` | Casos sintéticos (mismo esquema que Health) |
| `eval/` | Pruebas de dominio (`node eval/run.mjs`) |
| `spikes/lora-medpsy/` | Entrenamiento del LoRA del examen |

## Hoy y después

| | Hoy (esta demo) | Después |
|---|---|---|
| Salud | Dataset de prueba, mismo formato que Apple Health y Google Health | Conexión real |
| LoRA | `lab-v3` lee el examen (5 % → 68 %) | Más trainings |
| Banco | El motor responde. No suelta la plata | Desembolso real |
| Nodos | Un peer en la demo | Nodos P2P en más pueblos |

## El nombre

**Ina Igar** = camino de la medicina, en gunagaya (*Gayamar sabga*, Orán /
Wagua). Se cita porque no es nuestra.

## Base preexistente

Plantilla [`ArturVargas/AI_Engineering_Kit`](https://github.com/ArturVargas/AI_Engineering_Kit)
(ago 2026). Septiembre en este repo es nuestro.

Docs del equipo: [`docs/README.md`](docs/README.md). Cómo se vende:
[`docs/VENTA.md`](docs/VENTA.md).

MIT. Ver [LICENSE](LICENSE).
