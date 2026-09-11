# Brief del proyecto · Decentralized AI Hackathon · ISD Summit 2026

Nombre: **Ina Igar** ("Camino de la medicina" en gunagaya). Equipo: 0xj4an y Artur.

Cómo venderlo: [`VENTA.md`](VENTA.md). Estado vivo: [`ESTADO.md`](ESTADO.md).

## El producto

Se conecta a **Apple Health** o **Google Health** y monitorea. Si hay una
anomalía, avisa y recomienda. El crédito se ofrece **desde esa alerta**. Si
tienes un laboratorio, lo puedes subir. Cotiza el año. Si no hay plata, pide
un crédito de salud. El banco no ve tu salud. Las fotos se leen en el teléfono
y se borran.

No diagnostica. Las reglas marcan el rango (`ADR-008`). MedPsy redacta
(`ADR-009`). LoRA `lab-v3` solo lee el examen. El examen **no** abre el crédito
(`ADR-010`: hay crédito si hay algo que atender; el caso sano no ofrece).

**Persona:** Mira tu salud. Te avisa. Te presta. El banco no ve tu salud.

**Jurado:** Cualquier hallazgo. Una ruta. Un crédito. La foto no sale. Si este
teléfono no corre el modelo, un nodo P2P lo corre.

## Retos a los que aplica

- **General:** señal intermitente, datos sensibles, trabajo en campo. Tres
  caminos: [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md).
- **Tether · QVAC Psy:** MedPsy redacta; `OCR_LATIN` lee documentos; LoRA
  `lab-v3` parsea el examen (JSON válido 5 % → 68 %). Delegate P2P cuando el
  aparato no carga el modelo. MIT, log de rendimiento, nombres honestos.
- **Caja de Ahorros** (track): inclusión con señal intermitente; documentos en
  el dispositivo; el asesor nunca ve la cédula ni el extracto. El monto es la
  ruta, no un mínimo de consumo. En el producto se dice **banco**.

## Flujo (el de la app)

Entrada → **Salud** → **Revisión** → Alerta (si hay señal) → crédito. El
examen es un desvío, si lo tienes (`Ya me hice el examen` / `Tengo un examen
de laboratorio`). Luego documentos → cuota → banco → firma → desembolso.

1. **Historial y alerta.** En la demo: dataset con el mismo esquema que Apple
   Health y Google Health. Reglas `ADR-008`; MedPsy **solo redacta**. Disclaimer
   en pantalla. Sin diagnóstico.
2. **Ruta y costo.** Paquete a un año. Crédito por ese monto. El banco **nunca**
   recibe el hallazgo clínico.
3. **Documentos.** Foto cédula / ingresos / extracto. OCR aquí. **Fotos se
   borran**. Al banco: JSON.
4. **Examen (opcional).** OCR aquí → MedPsy + LoRA `lab-v3`. Puede salir algo
   que Health no vio. Rangos: `clasificar()`, no el modelo.
5. **Cola.** SQLite si no hay salida.
6. **Envío.** Mismo JSON, nunca fotos. WiFi: banco. Sin red: nodo / cola.
7. **Banco.** Scorecard `preCalificar()` / `decidir()`. Admin en Railway.
8. **Firma y cierre.** Trazo en pantalla → desembolso de muestra. Origination
   real es el siguiente tramo.

Las tarjetas de Entrada no se reescriben (`ADR-006`).

## Arquitectura

```
mobile/   Expo + @qvac/sdk 0.18.2 · UI, cámara, OCR, MedPsy, LoRA lab-v3,
          QVAC delegate, cola, HTTP · core/
nodo/     LAN :8788 + /inferir + /consola; banco remoto (Railway)
landing/  sitio + pitch + admin
data/ eval/ perf/ docs/ spikes/
```

Producto: Android de gama media. Demo de hoy: **iPhone 17 Pro Max**.

## El plan

| | Hoy | Después |
|---|---|---|
| Salud | Dataset, mismo esquema que Apple Health y Google Health | Conexión real |
| LoRA | lab-v3 lee el examen | Más trainings |
| Banco | El motor responde. No suelta la plata | Desembolso real |
| Nodos | Un peer en la demo | Nodos P2P en más pueblos |

## Reparto

- 0xj4an: mobile (Expo + QVAC), cola, transporte, perf log, video.
- Artur: prompts y validaciones (core), datos sintéticos, banco, eval, README y
  guion.

Ensayo: [`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md). Guion: [`VIDEO.md`](VIDEO.md)
(publicado: https://youtu.be/oiW3VXyl36Q).

## Dojo

La ficha ya está pegada. Pegar y editar: [`VENTA.md`](VENTA.md). No reabrir
**Submit & participate** salvo pedido explícito.

- Demo video: https://youtu.be/oiW3VXyl36Q
- Live demo: https://isd-hackathon-landing-production.up.railway.app/
- Pitch: https://isd-hackathon-landing-production.up.railway.app/pitch
- Repo: https://github.com/0xj4an/Hackathon-ISD-2026
