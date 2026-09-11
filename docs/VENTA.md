# Cómo se vende Ina Igar

Una afirmación de venta vive **aquí**. Landing, pitch, README, BRIEF, Dojo y
el video **solo citan**. Si cambia la frase, se cambia este archivo primero.

Dojo: slug `tbd-panama`. Sigue **draft** hasta que alguien pulse
**Submit & participate** a mano.

## El producto

No es una app de diabetes. No es “pagar la ruta”. No es “lo que ya midió el
teléfono o un papel”.

1. Se conecta a **Apple Health** y **Google Health** y **monitorea**.
2. Si hay una **anomalía**, avisa y recomienda qué hacer.
3. El **crédito se ofrece desde la anomalía** (alerta → ruta → costo → pedir
   crédito). El examen **no** abre el crédito.
4. Si la persona **tiene un laboratorio**, puede subirlo. La app lo lee. Puede
   salir algo que Health no vio.
5. Cotiza el **año** de exámenes, medicina y tratamiento, si hay que atenderse.
6. Si no puede pagar, ofrece un **crédito de salud**.
7. El **banco no ve la salud**. Solo sabe que presta para salud. Las fotos no
   salen. El JSON es nombre, cédula, ingreso, monto.

No diagnostica. Las reglas marcan el rango (`ADR-008`). MedPsy **redacta**
(`ADR-009`). LoRA `lab-v3` solo lee el examen.

## Dos frases (no mezclar)

**Persona / landing / pitch**

> Mira tu salud. Te avisa. Te presta. El banco no ve tu salud.

**Jurado / Dojo / video / README**

> Cualquier hallazgo. Una ruta. Un crédito. La foto no sale. Si este teléfono
> no corre el modelo, un nodo P2P lo corre.

El jurado entra por Dojo y el video. La persona entra por el sitio. Las dos
frases dicen el mismo loop; no las fusiones en un párrafo.

## El plan (hoy / después)

| | Hoy (demo) | Después |
|---|---|---|
| Salud | Dataset con el mismo esquema que Apple Health y Google Health | Conexión real a Apple Health y Google Health |
| LoRA | `lab-v3` lee el examen (JSON 5 % → 68 %, 33 MB) | Más trainings: cédula, sueldo, más paneles |
| Banco | El motor en Railway responde. No suelta la plata | Desembolso real |
| Nodos | Un peer en la demo | Nodos P2P en más pueblos, para el teléfono que no corre el modelo |

Nunca “no lo tuvimos”. Eso es esta tabla.

Producto: Android de gama media. Esta demo: iPhone 17 Pro Max.

## Tres caminos (`ADR-006`)

OCR siempre en el teléfono. Inferencia ≠ crédito.

| Camino | Inferencia | Crédito |
|---|---|---|
| El teléfono puede, hay wifi | MedPsy + LoRA aquí | HTTPS al banco |
| El teléfono puede, no hay wifi | MedPsy + LoRA aquí | cola / nodo |
| El teléfono no puede | OCR aquí; un **nodo P2P** corre MedPsy | cola / nodo |

**Pueblo** es el lugar. **Nodo P2P** es la computadora. No se intercambian.
**Banco** es el motor de crédito. **Caja** solo como nombre del track.

Las tarjetas de Entrada en la app no se reescriben.

## Lo exclusivo (si el jurado pregunta “¿y eso qué?”)

1. El crédito **es** el costo del año, no un mínimo de consumo (`ADR-010`).
2. OCR en el teléfono. **Las fotos se borran.** El banco ve un JSON. Eso evita
   que el asesor se quede copias (WhatsApp, fotocopia en un cajón).
3. Tres caminos reales, medidos.
4. LoRA `lab-v3` solo en el examen: JSON válido **5 % → 68 %**. Cédula e
   ingresos siguen en MedPsy base. El examen no abre el crédito.

## Rúbrica → qué empujar

| Criterio | Cómo se gana | Qué no pelear |
|---|---|---|
| Innovation + Impact | El loop cierra plata. Foto no sale. Nodo P2P presta cómputo. | No “único P2P”. |
| Technical | Tres caminos + LoRA medido + `perf.jsonl` + eval 9/9 + 72× delegate | No APK ni 4 tracks. No Hyperswarm topic como si corriera. |
| Psy | MedPsy **redacta**; las reglas marcan el rango. Disclaimer en pantalla. | No “el modelo es el producto”. |
| Completion | YouTube en **Demo video**. Landing en Live demo. Pitch en `/pitch`. | Si el video apunta a Railway, el jurado ve “no hay video”. |
| Caja (track) | Inclusión con señal intermitente. El asesor no se queda la cédula. Monto = ruta. | No “fintech genérica”. |

Tracks: **solo** General + Tether Psy + Caja. No Philips. No Ovnicom.

## URLs (las mismas en todos lados)

| Superficie | URL |
|---|---|
| Sitio | https://isd-hackathon-landing-production.up.railway.app/ |
| Pitch | https://isd-hackathon-landing-production.up.railway.app/pitch |
| Demo (Dojo / YouTube) | https://youtu.be/oiW3VXyl36Q |
| Repo | https://github.com/0xj4an/Hackathon-ISD-2026 |

## Qué está en Dojo (pegado 11 sep; no volver a pegar el BRIEF)

Description es **máximo 500**. Status: **draft**.

**Description (341, ya en la ficha):**

```
Cualquier hallazgo. Una ruta. Un crédito. Lee Apple Salud, Health Connect o un papel de lab. Las reglas marcan el rango; MedPsy redacta la ruta y el costo del año. OCR de cédula: las fotos se borran. El banco ve un JSON, nunca la imagen. Tres caminos: modelo local, sin red, o QVAC delegate al pueblo. LoRA lab-v3: 5%→68%. No es diagnóstico.
```

Eso ya está. Pitch, landing y README dicen **Apple Health / Google Health** y
**nodo P2P**. Si se reabre la ficha, se alinea a esas palabras y se queda ≤500.
Editar: hackathon → **Your team** → **Edit**. No **Submit & participate** salvo
pedido explícito.

## Qué cambiar dónde

| Superficie | Qué tiene que decir |
|---|---|
| Landing `h1` | Frase persona |
| Landing CTAs | Pitch + **Ver demo** → YouTube |
| Pitch 01–03 | Frase persona. Monitorea → avisa → examen opcional → cotiza → presta |
| Pitch 04 | Expo, QVAC, nodo P2P, banco Railway, sitio Railway, Sentry, SQLite |
| Pitch 05 | LoRA para leer el examen. No un 5 %→68 % gigante. El examen no abre el crédito |
| Pitch 08 | Hoy / después. Nunca “no lo tuvimos” |
| README / BRIEF | Frase jurado + el producto de arriba |
| Video | Ya publicado. No inventar un plano que no salió |

## YouTube · descripción (si se repega)

```
Ina Igar — camino de la medicina. ISD Summit 2026.

Cualquier hallazgo. Una ruta. Un crédito.
Se conecta a Apple Health o Google Health. Si hay una anomalía, avisa y cotiza el año.
OCR de cédula en el teléfono: las fotos se borran. El banco ve un JSON.

Tres caminos: modelo local, sin red, o QVAC delegate a un nodo P2P.
LoRA lab-v3: JSON válido de laboratorio 5% → 68%. No es diagnóstico.

Sitio: https://isd-hackathon-landing-production.up.railway.app/
Pitch: https://isd-hackathon-landing-production.up.railway.app/pitch
Repo: https://github.com/0xj4an/Hackathon-ISD-2026

Equipo: 0xj4an + Artur · General · Tether Psy · Caja de Ahorros
```

## Qué no se dice (en ningún lado)

- Xiaomi, ni hardware que no esté en cámara.
- “No nos dio el tiempo”, “no lo terminamos”, “no lo tuvimos”.
- Hyperswarm **topic** como si la malla nodo↔nodo corriera. Crédito = HTTP.
  Delegate = inferencia P2P medida (72×).
- “Único P2P”, “diagnostica”, “sabe qué tienes”.
- “Pagar la ruta.” El crédito se ofrece **desde la alerta**.
- Philips / Ovnicom. VIH / CD4 en demo pública.
- Inventar un plano (LoRA, avión, delegate) que no salió en el video.
- Reescribir las tarjetas de Entrada de la app.

## Palabras que sí

alerta · ruta · costo del año · crédito de salud · la foto no sale · JSON ·
Apple Health · Google Health · QVAC delegate · nodo P2P · LoRA lab-v3 ·
no es diagnóstico · banco
