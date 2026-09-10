# Ensayo en el iPhone: objetivo 1 (avión)

Qué tocar en el **iPhone 17 Pro Max** con el Release de `main` ahora
(el SHA de `git rev-parse --short HEAD` al instalar; hoy ~`93d0ca3` o posterior).

Esto no es el guion del jurado ([`VIDEO.md`](VIDEO.md)). Es la corrida que
tiene que salir **antes** de grabar. Lo que no se vea aquí no se dice en el
video.

Al terminar, el bloque se pega arriba de Corridas en
[`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

---

## Qué estamos demostrando

Con **modo avión**, sin laptop, la app:

1. Encuentra las señales con reglas (diabetes).
2. MedPsy **redacta** la alerta en el teléfono.
3. Lee cédula, ingresos y extracto (OCR + MedPsy) y borra las copias.
4. Calcula la cuota en el teléfono (`preCalificar()`).

**Fuera de esta corrida:** nodo HTTP, cola al banco, Hyperswarm, `delegate`.
Si al firmar sale “pendiente / sin el nodo del pueblo”, está bien. No es fallo
de este objetivo.

---

## Antes de tocar el teléfono

En el Mac, en `mobile/`:

```bash
git rev-parse --short HEAD
npx expo run:ios --device --configuration Release
```

Anota el SHA. Sin SHA la corrida no cuenta.

**Modelos en caché.** MedPsy Q8_0 y OCR_LATIN tienen que estar ya en el
iPhone (bloque 0). Si al abrir la alerta se queda en “Bajando MedPsy”, el avión
la va a matar: wifi un rato, deja que termine, **después** avión.

**Documentos.** En el Mac, a pantalla completa, los JPG nítidos de
[`data/documentos/`](../data/documentos/):

- `cedula-nitido.jpg`
- `ingresos-nitido.jpg`
- `extracto-nitido.jpg`

Se fotografían de la pantalla o se suben desde Archivos. **No** una cédula real.

Verdad de referencia ([`esperado.json`](../data/documentos/esperado.json)):

| Documento | Qué tiene que salir |
| --- | --- |
| Cédula | Mariela del Carmen Quiros Batista, `8-912-2044`, nació 14 mar 1979, vence 30 nov 2029 |
| Ingresos | Agroservicios del Istmo, B/. **520**, asalariado |
| Extracto | Banco Istmeno, saldo promedio **579.02**, **3** meses |

---

## La corrida (avión desde el paso 2)

### 0. Que abra

La app tiene que mostrar **Entra con tu correo**. Si queda en blanco o
`No arrancó` / `La app se cayó`, **parar**. Anotar el texto. No seguir.

### 1. Entrar (wifi todavía puede estar)

Correo: **`insulina@gmail.com`** (está en la lista). Entrar.

### 2. Avión

Control Center: avión **encendido**. Wifi y datos off. El resto de la corrida
es así.

### 3. Salud (simulado)

Pantalla nueva: de dónde salen las mediciones. Elegir **Apple Health**,
conectar, esperar a que “lea”, continuar. No pide red; el historial es el JSON
del caso.

### 4. Revisión

Deja pasar el historial. Listo / continuar.

### 5. Alerta — aquí entra MedPsy

Primero se ven las **reglas** (glucosa, presión, peso, IMC). Eso es inmediato.

Después el modelo redacta el mensaje. La primera carga en CPU puede tardar
**~1–2 min**. No toques nada.

| Si ves | Qué es |
| --- | --- |
| Un párrafo en español sobre qué hacer, y el pie de disclaimer | **Éxito.** Lee el disclaimer en voz alta (ensayo del video) |
| Las reglas y un fallo (“MedPsy no cargó…”, etc.) | El modelo no redactó. Anotar el texto. Las reglas solas no cierran este paso |
| “Bajando MedPsy” y se queda | Caché vacía + avión. Parar, wifi, bajar, repetir |

Disclaimer en el pie:

> Esto es orientación automática y local, no un diagnóstico…

Tres pasos en la misma pantalla: alerta → ruta → costo. En costo, pedir crédito.

### 6. Monto

Elegir un monto dentro del rango (el paquete de diabetes anda ~641–920).
Continuar.

### 7. Documentos

Para cada uno: foto de la pantalla del Mac (o archivo JPG). **No leer de a una.**
Cuando las tres estén en cola, **Leer las fotos**.

Espera: achica → OCR todas → suelta OCR → MedPsy. Si la segunda foto dice
`galloc` / `invalid input`, copiar el error **tal cual**.

Contra `esperado.json`. Si un campo no sale, `—` y el mensaje.

La UI tiene que decir que las copias se borraron.

### 8. Lo leído → cuota

Revisar nombres y montos. Continuar. La cuota sale de `preCalificar()` **aquí**,
sin nodo.

Firmar: en avión debe decir que **no hay nodo** y queda pendiente. Eso cierra
el “offline” del crédito, no el banco.

### 9. Registros (después, avión o no)

Salir hasta **Entra con tu correo**. Pulsación larga (~1 s) en el pie
(“Toda la inteligencia corre en este teléfono…”).

Tiene que haber líneas en `perf.jsonl` de `alerta`, `ocr` y `extraccion`, con
TTFT. Si está vacío, C10 no se mueve.

---

## Lista corta (imprimir)

- [ ] SHA del build
- [ ] Abre, no blanco
- [ ] `insulina@gmail.com`
- [ ] Avión desde Salud en adelante
- [ ] Alerta: texto de MedPsy + disclaimer
- [ ] Tres documentos leídos vs tabla de arriba
- [ ] Fotos borradas (lo dijo la UI)
- [ ] Cuota en el teléfono
- [ ] Firmar → pendiente / sin nodo (esperado)
- [ ] Long-press: líneas de inferencia
- [ ] Bloque pegado en `PRUEBA-TELEFONO.md`

---

## Si se rompe

| Error | Qué hacer |
| --- | --- |
| Pantalla en blanco / `No arrancó` | Parar. Mandar el texto |
| `invalid input` | Igual que la corrida de las 02:40; no insistir con HEIC |
| `galloc` / sin grafo | OCR y MedPsy se pisaron o la foto es enorme. Anotar cuál documento |
| Alerta sin mensaje del modelo | 1.1 no está visto en el aparato |
| “Bajando…” en avión | Caché; repetir con pesos ya bajados |

Una corrida verde de esta lista = objetivo 1 cerrado. El video se graba **después**,
con el mismo camino y avión a la vista.
