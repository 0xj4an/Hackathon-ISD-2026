# Guion del video

**Estado: listo para ensayar.** Ajustar solo lo que falle en el iPhone
([`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md)). No inventar planos que no corrieron.

**Límite: 5 minutos.** En español, enlace sin login. Es lo primero que mira el
jurado del reto General, el del podio de 6,000.

**Regla de oro: solo se dice lo que se ve pasar en pantalla.** Si algo no corrió
en la grabación, no se menciona. Un jurado técnico revisa el repo después.

**Camino de la grabación (prioridad):** Caso diabetes → alerta MedPsy → crédito
con **modo avión** → documentos → cuota. **Plano corto de examen** (foto de
examen + franja `MedPsy + LoRA`) si el rebuild con el `.gguf` ya está en el
iPhone; si no, se omite y el LoRA se deja en el repo / `RESULTADOS.md`.

---

## Qué tiene que quedar demostrado

El reglamento pide cosas concretas, y cada una necesita su plano:

| Lo que piden | Cómo se ve |
| --- | --- |
| Un modelo Psy con función central | MedPsy redacta la alerta; MedPsy (+ LoRA en examen) lee documentos / lab |
| Flujo de usuario completo, no una llamada al SDK | De abrir la app a la respuesta del banco (o pendiente sin nodo) |
| Toda la inferencia en el dispositivo | Modo avión encendido durante alerta y lectura |
| Comunicar limitaciones (proyectos médicos) | El aviso en pantalla, leído en voz alta |
| Registro de rendimiento estructurado | Pantalla de registros / `perf.jsonl` con TTFT real |
| Hardware honesto | Se nombra el iPhone y se dice que el usuario es rural con Android |
| Calidad de dominio medible | `eval/run.mjs` en verde; LoRA lab 5%→68% si se muestra la tabla o el examen |

---

## Minuto a minuto

### 0:00 a 0:30 · El problema

**Se ve:** intro cinemática de 22 s ([`intro.html`](intro.html)), muda.
Luego corte al teléfono en la mano. Nada de la app todavía en ese plano.

**Se dice:**

> En Panamá, 4 de cada 10 adultos viven con presión alta y no todos lo saben.
> En el interior, hacerse un examen es bajar al pueblo, pagar de una vez, y
> volver. Mucha gente no baja. No porque no quiera: porque no sabe si vale la
> pena, y porque no sabe cuánto va a costar.
>
> Ina Igar significa "Camino de la medicina" en gunagaya, la lengua del pueblo
> Guna. Es una app que responde esas dos preguntas sin internet, dentro del
> teléfono.

**Por qué así:** el jurado tiene que entender el problema antes que la
tecnología. Treinta segundos, no más.

### 0:30 a 1:10 · Detectar

**Se ve:** entrar con `insulina@gmail.com` (o chip Caso diabetes). Pantalla de
salud simulada. Revisión pasando el historial. La alerta: primero las reglas,
luego el texto de MedPsy.

**Se dice:**

> La app lee las mediciones que la persona ya tiene en el teléfono. Aquí hay
> más de trescientas, de un año.
>
> Encuentra cuatro cosas. Y esto es importante: **quién decide no es el modelo,
> son reglas con umbrales de la OMS y la Asociación Americana de Diabetes,
> citados uno por uno en el código.** El modelo solo redacta el mensaje (en
> inglés, ADR-009); la pantalla y el disclaimer están en español. Un modelo de
> lenguaje no debería decidir si alguien tiene diabetes.

**Plano obligatorio:** el aviso de la pantalla, leído completo:

> "Esto es orientación automática y local, no un diagnóstico. Confirma con un
> profesional de salud."

**Por qué así:** el reto Tether Psy exige "comunicar limitaciones, sin
afirmaciones clínicas no respaldadas". Esto lo cumple y además es lo correcto.

### 1:10 a 1:50 · Cuánto cuesta

**Se ve:** el desglose del paquete, línea por línea, hasta el total.

**Se dice:**

> Aquí está la mitad que nadie resuelve. No basta con decirle a alguien que
> tiene diabetes: hay que decirle cuánto cuesta atenderla.
>
> El año completo sale entre 641 y 920 balboas. Y lo que pesa no son los
> exámenes: **son 730 tabletas de metformina, 380 balboas, el 41% del total.**
> Ese número solo aparece cuando cotizas el año, no la consulta.
>
> Los medicamentos salen del precio tope oficial del Decreto Ejecutivo 36. Lo
> que no tiene precio publicado va marcado como estimado, y la app lo dice.

**Plano obligatorio:** la palabra "estimado" al lado de una línea.

**Por qué así:** es lo que nos separa de una app de salud genérica, y le habla
directo al jurado de Caja de Ahorros.

### 1:50 a 2:50 · Leer los documentos (crédito)

**Se ve:** **modo avión encendido, en primer plano.** Foto de la cédula, de
ingresos y del extracto. Lectura en curso. Campos en su sitio. La UI dice que
las copias se borraron.

**Se dice:**

> Para pedir el crédito hacen falta tres documentos. Se fotografían aquí.
>
> Miren el modo avión. **No hay red.** El OCR corre en el teléfono, MedPsy saca
> los campos en el teléfono, y **la foto se borra apenas se leyó**.
>
> Al banco viaja un JSON. Ni la imagen, ni el motivo de salud. El banco sabe
> que el crédito es para salud, y nada más.

**Plano obligatorio:** el modo avión visible mientras el modelo trabaja. Es la
prueba de que corre local, y no se puede fingir.

**Por qué así:** es el corazón del reto General, "IA donde la nube no llega".

### 2:50 a 3:40 · El crédito

**Se ve:** elegir el monto → documentos → cuota (envío) → respuesta del banco →
**trazo con el dedo** → desembolso simulado. Pendiente sin nodo **o** banco si
hubo wifi.

**Se dice:**

> El monto no lo inventamos: es lo que cuesta el paquete. La persona elige
> pagar el máximo o lo justo.
>
> La solicitud intenta el banco por wifi. Si no hay internet, queda en el nodo
> del pueblo, o pendiente en el teléfono. El motor ya calculó la cuota aquí.
>
> Si el banco aprueba, firma con el dedo. **No es firma electrónica legal**;
> la app lo dice. El desembolso de la demo es simulado.

**Si la cola sin señal llegó a funcionar en cámara**, 15 segundos: pendiente →
red → sale sola.

### 3:25 a 3:55 · Vía B: el papel del laboratorio (si el build trae LoRA)

**Se ve:** desde la alerta o el menú, **Tu examen** → foto → franja
**`MedPsy + LoRA · lab-v3`** → marcadores clasificados.

**Se dice:**

> Si la persona ya se hizo el examen, trae el papel. OCR lee el texto; un
> adaptador LoRA entrenado solo para laboratorio saca los marcadores. **Quién
> dice si está alto o bajo no es el modelo: es el catálogo con fuentes.**
>
> Medimos el hueco antes: el MedPsy base devolvía JSON válido de lab 1 de cada
> 22 veces. Con este LoRA, 15 de 22. Por eso va en la app, y solo en esta vía:
> cédula e ingresos siguen en el modelo base.

**Si el rebuild con el `.gguf` no está en el iPhone ese día:** se corta este
bloque y no se improvisa. La evidencia queda en
`spikes/lora-medpsy/RESULTADOS.md` y en el repo (`lora-lab-v3.gguf`).

### 3:55 a 4:30 · Que no es humo

**Se ve:** la pantalla de registros (long-press en el pie de entrada). El
`perf.jsonl` con líneas. En el Mac, `node eval/run.mjs` en verde. Opcional: tabla
de `RESULTADOS.md` corrida 3.

**Se dice:**

> Todo esto está medido. MedPsy carga en este iPhone y suelta el primer token
> en 2.9 segundos, con Q8_0 en CPU. Cada inferencia queda registrada, incluida
> si llevó LoRA o no.
>
> Las reglas de salud tienen su propia evaluación: 14 señales, nueve casos, y
> **el caso sano no dispara ninguna alerta**.

**Por qué así:** el reto pide "calidad de dominio medible" y "evidencia
reproducible".

### 4:30 a 5:00 · Cierre

**Se ve:** la app en la mano, cerrada.

**Se dice:**

> Ina Igar corre entero en el teléfono. Los datos de salud no salen. Las fotos
> se borran. Y al banco solo le llega lo que necesita para decidir.
>
> Está hecha para alguien que vive lejos, con señal intermitente y un teléfono
> Android de gama media. **Lo grabamos en un iPhone porque es donde el SDK
> arrancó**; el Xiaomi que teníamos aborta al cargar el runtime, y eso está
> documentado en el repo.
>
> Camino de la medicina. Eso es lo que la app devuelve: no un diagnóstico, una
> ruta.

**Por qué decir lo del iPhone:** porque es verdad y porque el jurado lo va a
ver en el repo. Decirlo nosotros primero es honestidad; que lo descubran ellos
es un problema.

---

## Las cifras, y de dónde salen

Verificadas contra el repo el **10 de septiembre de 2026**. Si alguna cambia, se
vuelve a verificar antes de grabar.

| Cifra | Verificación |
| --- | --- |
| 42% de hipertensión en Panamá | MINSA, en [`salud.md`](../.ai/references/salud.md) |
| 315 mediciones en un año | `data/usuarios/diabetes.json` / `mobile/src/datos/` |
| 4 hallazgos | `GLU_ALTA`, `PRES_ALTA`, `PESO_BAJA`, `IMC_SOBREPESO` |
| B/. 641 a 920 el año | `armarPaquete()` / `eval/resultados.md` |
| 730 tabletas, B/. 380, 41% | Decreto Ejecutivo 36: B/. 0.52 por tableta |
| TTFT 2915 ms | `perf/`, iPhone 17 Pro Max, Q8_0 en CPU |
| 12 meses, 17.4%, cuota 84.08 | `decidir()` / `eval/run.mjs`, monto 920 |
| Lab JSON válido 5% → 68% | `spikes/lora-medpsy/RESULTADOS.md`, corrida 3 |
| 14 señales | `mobile/src/core/reglas.ts` |
| Tests de crédito en verde | `node --test eval/credito/*.test.mjs` |

## Antes de grabar

- [ ] Ensayar el flujo completo **tres veces seguidas** con el teléfono
      ([`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md)).
- [ ] Modelo ya descargado. Los 2.1 GB no se bajan en cámara.
- [ ] Rebuild nativo con `lora-lab-v3.gguf` si se va a filmar el examen.
- [ ] Modo avión listo, y comprobado que la app funciona así.
- [ ] `perf.jsonl` con líneas de verdad (alerta, ocr, extracción).
- [ ] Batería arriba del 50%.
- [ ] Nadie dice "CD4" ni nombra una enfermedad como diagnóstico.

## Lo que NO se dice

- **"Hyperswarm P2P"** si la demo salió por HTTP. Con wifi: "el teléfono habla
  con el banco". Sin internet: "el pueblo se lo lleva". Tampoco digas
  **delegate** si el respaldo fue HTTP `/inferir`.
- **"A" o "B" frente al jurado** para salud o transporte: di "historial", "examen",
  "banco", "pueblo".
  Inferencia: "el teléfono intenta el modelo; si no puede, le pide el texto al
  nodo". Ver [`PRUEBA-NODO.md`](PRUEBA-NODO.md).
- **"Diagnostica"**, "detecta enfermedades", "sabe qué tienes". Detecta valores
  fuera de rango y sugiere una ruta.
- Cualquier cifra que no se vea en pantalla (o en la tabla del Mac) en ese momento.
- El LoRA **si no salió en cámara** la franja `MedPsy + LoRA` ni la tabla del
  spike. El adaptador está en el producto; eso no autoriza a inventar el plano.

## Lo que falta decidir

- Quién narra, y si es voz en vivo o grabada aparte.
- Mezcla: pantalla para el detalle, mano para el modo avión.
- Dónde se sube. Tiene que abrir sin login.
- Si en la toma de 5 min cabe el examen completo, o solo el banner + un marcador.
