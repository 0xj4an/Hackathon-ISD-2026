# Guion del video

**Estado: borrador.** Se ajusta cuando se ensaye con el teléfono en la mano.

**Límite: 5 minutos.** En español, enlace sin login. Es lo primero que mira el
jurado del reto General, el del podio de 6,000.

**Regla de oro: solo se dice lo que se ve pasar en pantalla.** Si algo no corrió
en la grabación, no se menciona. Un jurado técnico revisa el repo después.

---

## Qué tiene que quedar demostrado

El reglamento pide cosas concretas, y cada una necesita su plano:

| Lo que piden | Cómo se ve |
| --- | --- |
| Un modelo Psy con función central | MedPsy lee el documento y redacta la alerta |
| Flujo de usuario completo, no una llamada al SDK | De abrir la app a la respuesta del banco |
| Toda la inferencia en el dispositivo | Modo avión encendido durante la lectura |
| Comunicar limitaciones (proyectos médicos) | El aviso en pantalla, leído en voz alta |
| Registro de rendimiento estructurado | La pantalla de registros con el TTFT real |
| Hardware honesto | Se nombra el iPhone y se dice que el usuario es rural con Android |

---

## Minuto a minuto

### 0:00 a 0:30 · El problema

**Se ve:** una mano sosteniendo el teléfono. Nada de la app todavía.

**Se dice:**

> En Panamá, 4 de cada 10 adultos viven con presión alta y no todos lo saben.
> En el interior, hacerse un examen es bajar al pueblo, pagar de una vez, y
> volver. Mucha gente no baja. No porque no quiera: porque no sabe si vale la
> pena, y porque no sabe cuánto va a costar.
>
> Ina Igar significa "camino de la medicina" en gunagaya, la lengua del pueblo
> Guna. Es una app que responde esas dos preguntas sin internet, dentro del
> teléfono.

**Por qué así:** el jurado tiene que entender el problema antes que la
tecnología. Treinta segundos, no más.

### 0:30 a 1:15 · Detectar

**Se ve:** entrar con un correo. El caso de diabetes. La pantalla de revisión
pasando por las mediciones. La alerta.

**Se dice:**

> La app lee las mediciones que la persona ya tiene en el teléfono. Aquí hay
> 65, de los últimos meses.
>
> Encuentra cuatro cosas. Y esto es importante: **quién decide no es el modelo,
> son reglas con umbrales de la OMS y la Asociación Americana de Diabetes,
> citados uno por uno en el código.** El modelo solo explica en español lo que
> las reglas encontraron. Un modelo de lenguaje no debería decidir si alguien
> tiene diabetes.

**Plano obligatorio:** el aviso de la pantalla, leído completo:

> "Esto es orientación automática y local, no un diagnóstico. Confirma con un
> profesional de salud."

**Por qué así:** el reto Tether Psy exige "comunicar limitaciones, sin
afirmaciones clínicas no respaldadas". Esto lo cumple y además es lo correcto.

### 1:15 a 2:00 · Cuánto cuesta

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

### 2:00 a 3:00 · Leer los documentos

**Se ve:** **modo avión encendido, en primer plano.** Foto de la cédula. El
texto crudo del OCR. Los campos ya en su sitio.

**Se dice:**

> Para pedir el crédito hacen falta tres documentos. Se fotografían aquí.
>
> Miren el modo avión. **No hay red.** El OCR corre en el teléfono, MedPsy saca
> los campos en el teléfono, y **la foto se borra apenas se leyó**, antes
> incluso de que el modelo la procese.
>
> Al banco viaja un JSON. Ni la imagen, ni el motivo de salud. El banco sabe
> que el crédito es para salud, y nada más.

**Plano obligatorio:** el modo avión visible mientras el modelo trabaja. Es la
prueba de que corre local, y no se puede fingir.

**Por qué así:** es el corazón del reto General, "IA donde la nube no llega".

### 3:00 a 3:40 · El crédito

**Se ve:** elegir el monto. La solicitud sale. La respuesta del banco.

**Se dice:**

> El monto no lo inventamos: es lo que cuesta el paquete. La persona elige
> pagar el máximo o lo justo.
>
> La solicitud intenta el banco por wifi. Si no hay internet, queda en el nodo
> del pueblo, esta laptop, y él se la lleva. El banco responde: aprobado,
> 12 meses, 17.4% anual, cuota de 84 balboas al mes.
>
> Esa cuota cabe en el 30% del ingreso, y el motor lo verifica antes de aprobar.
> No es un modelo de juguete: tiene elegibilidad, capacidad de pago, scorecard,
> el precio descompuesto en sus costos, y clasificación de cartera por días de
> mora según el Acuerdo 4-2013.

**Si la cola sin señal llegó a funcionar**, aquí van 20 segundos más: apagar la
red, ver que queda pendiente, encenderla, ver que sale sola.

### 3:40 a 4:20 · Que no es humo

**Se ve:** la pantalla de registros. El `perf.jsonl` con sus líneas. Y en el
Mac, `node eval/run.mjs` saliendo en verde.

**Se dice:**

> Todo esto está medido. MedPsy carga en este iPhone y suelta el primer token
> en 2.9 segundos, con Q8_0 en CPU. Cada inferencia queda registrada.
>
> Y las reglas de salud tienen su propia evaluación: 14 señales, nueve casos
> de prueba, y **el caso sano no dispara ninguna alerta**, que vale tanto como
> acertar las otras.

**Si el LoRA salió bien**, aquí van 20 segundos con la tabla antes contra
después. Si no salió, no se menciona.

**Por qué así:** el reto pide "calidad de dominio medible" y "evidencia
reproducible". Esto es exactamente eso.

### 4:20 a 4:50 · Cierre

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

Verificadas contra el repo el 10 de septiembre. Si alguna cambia, se vuelve a
verificar antes de grabar: en el video no entra un número que no se pueda
reproducir.

| Cifra | Verificación |
| --- | --- |
| 42% de hipertensión en Panamá | MINSA, en [`salud.md`](../.ai/references/salud.md) |
| ~315 mediciones en un año | `data/usuarios/diabetes.json` |
| 4 hallazgos | `GLU_ALTA`, `PRES_ALTA`, `PESO_BAJA`, `IMC_SOBREPESO` |
| B/. 641 a 920 el año | `armarPaquete()` sobre ese caso |
| 730 tabletas, B/. 380, 41% | Decreto Ejecutivo 36: B/. 0.52 por tableta |
| TTFT 2915 ms | `perf/`, iPhone 17 Pro Max, Q8_0 en CPU |
| 12 meses, 17.4%, cuota 84.08 | `decidir()` / `eval/run.mjs`, monto 920 |
| 14 señales | `mobile/src/core/reglas.ts` |
| 58 tests de crédito en verde | `node --test eval/credito/*.test.mjs` |

## Antes de grabar

- [ ] Ensayar el flujo completo **tres veces seguidas** con el teléfono en la
      mano. Lo que falla, falla aquí y no grabando.
- [ ] Modelo ya descargado. Los 2.1 GB no se bajan en cámara.
- [ ] Modo avión listo para el minuto 2, y comprobado que la app funciona así.
- [ ] `perf.jsonl` con líneas de verdad.
- [ ] Batería del teléfono arriba del 50%, no vaya a salir el aviso en pantalla.
- [ ] Nadie dice "CD4" ni nombra una enfermedad como diagnóstico.

## Lo que NO se dice

- **"Hyperswarm P2P"** si la demo salió por HTTP. Camino A se dice "el teléfono
  habla con el banco, con wifi". Camino B se dice "sin internet, el pueblo se
  lo lleva al banco". Inferencia: "el teléfono intenta el modelo; si no puede,
  le pide el texto al nodo". Ver [`PRUEBA-NODO.md`](PRUEBA-NODO.md).
- **"Diagnostica"**, "detecta enfermedades", "sabe qué tienes". Detecta valores
  fuera de rango y sugiere una ruta.
- Cualquier cifra que no se vea en pantalla en ese momento.
- El LoRA en el video, si no se carga en la app. El spike sí se midió
  (`spikes/lora-medpsy/RESULTADOS.md`); eso no implica mencionarlo en cámara.

## Lo que falta decidir

- Quién narra, y si es voz en vivo o grabada aparte.
- Si se graba la pantalla del teléfono o se filma el teléfono en la mano. Filmar
  la mano se ve más real y el modo avión se aprecia mejor; grabar la pantalla se
  lee mejor. Probablemente mezcla: pantalla para el detalle, mano para el modo
  avión.
- Dónde se sube. Tiene que abrir sin login.
