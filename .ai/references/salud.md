# Parámetros de salud: qué medimos y con qué umbrales

Fuentes: OMS (hipertensión, anemia, dengue), ADA (diabetes), MINSA y prensa
panameña (epidemiología local), documentación de Health Connect (qué expone
Android). Cada umbral de este documento tiene fuente citable.

**Por qué existe este archivo.** El reto Tether Psy exige, para proyectos
médicos, *"comunicar limitaciones, sin afirmaciones clínicas no respaldadas"*.
Y `ADR-005` decide que las reglas deciden y el modelo solo redacta. Las dos
cosas juntas obligan a que **cada número que dispara una alerta salga de una
guía publicada**, no del criterio de nadie del equipo. Ninguno somos médicos.

---

## 1. El contexto: qué enferma a Panamá

Esto no es adorno, decide qué parámetros valen la pena.

- **Hipertensión: 42% de la población.**
- **Diabetes tipo 2: ~15% de los mayores de 15 años.**
- Hipertensión es la **tercera causa de diagnóstico** en las estadísticas de
  MINSA, con 3.8% (55,110) de los diagnósticos, 94% en adultos.
- **Dengue activo**: 2,256 casos acumulados a nivel nacional, 266 con signos de
  alarma y 14 de dengue grave.
- MINSA alerta que **hipertensión, diabetes y obesidad aumentan el riesgo de
  morir por dengue**, influenza y Covid-19.

Fuentes: [MINSA, análisis de situación de salud](https://www.minsa.gob.pa/sites/default/files/general/analisis_de_situacion_de_salud_2023_documento_mortalidad.pdf),
[La Prensa sobre la alerta de MINSA](https://www.prensa.com/sociedad/minsa-alerta-hipertension-diabetes-y-obesidad-aumentan-el-riesgo-de-morir-por-dengue-influenza-y-covid-19/),
[Infobae, prevalencia](https://www.infobae.com/panama/2026/05/15/hipertension-arterial-y-diabetes-tipo-2-acechan-la-salud-de-los-panamenos/).

**Consecuencia para el proyecto:** glucosa y presión arterial, que ya son las dos
señales principales de `mobile/src/core/reglas.ts`, son exactamente las dos enfermedades
crónicas más prevalentes del país. Eso no fue suerte, pero conviene decirlo en el
README y en el video: **el proyecto ataca el problema número uno de Panamá**, y
hay cifras oficiales para sostenerlo.

---

## 2. Lo que Android nos deja leer (vía A)

`Health Connect` define los tipos de registro. Esto acota qué puede entrar por la
vía del historial, y confirma que lo que ya usamos está soportado.

| Lo que necesitamos | Tipo en Health Connect | Nota |
| --- | --- | --- |
| Glucosa | `BloodGlucoseRecord` | Trae `relationToMeal`, o sea que **se puede saber si es en ayunas**. Clave: los umbrales de la ADA son para glucosa en ayunas |
| Presión arterial | `BloodPressureRecord` | Sistólica y diastólica por separado |
| Pulso en reposo | `RestingHeartRateRecord` | Distinto de `HeartRateRecord`, que es una serie |
| Peso | `WeightRecord` | |
| Saturación de oxígeno | `OxygenSaturationRecord` | **Hoy no lo usamos** |
| Temperatura | `BodyTemperatureRecord` | **Hoy no lo usamos** |
| Frecuencia respiratoria | `RespiratoryRateRecord` | |
| Variabilidad cardiaca | `HeartRateVariabilityRmssdRecord` | Interesante pero sin umbral clínico simple |
| Pasos, sueño | `StepsRecord`, `SleepSessionRecord` | Contexto, no señal |

Fuente: [Health Connect data types](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types).

---

## 3. Vía A: umbrales del historial

| Parámetro | Umbral | Qué significa | Fuente |
| --- | --- | --- | --- |
| Glucosa en ayunas | **100 a 125 mg/dL** | Glucosa alterada en ayunas (prediabetes) | ADA, Standards of Care |
| Glucosa en ayunas | **>= 126 mg/dL** | Criterio diagnóstico de diabetes | ADA, Standards of Care |
| Presión sistólica | **>= 140 mmHg** | Hipertensión | OMS |
| Presión diastólica | **>= 90 mmHg** | Hipertensión | OMS |
| Pulso en reposo | **> 100 lpm** | Taquicardia (normal 60 a 100) | Consenso clínico general |
| Saturación de oxígeno | **< 95%** | Anormal | Consenso clínico general |
| Saturación de oxígeno | **< 90%** | Requiere atención inmediata | Consenso clínico general |
| Temperatura | **>= 38 °C** | Fiebre | Consenso clínico general |

Fuentes: [OMS hipertensión](https://www.who.int/news-room/fact-sheets/detail/hypertension),
[ADA, Diagnosis and Classification of Diabetes](https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes).

### Un detalle de la OMS que hay que respetar

La OMS no dice "una toma alta es hipertensión". Dice, textual, que se diagnostica
*"when it is measured on two different days, the systolic blood pressure readings
on both days is >= 140 mmHg and/or the diastolic blood pressure readings on both
days is >= 90 mmHg"*.

**Nuestra regla actual pide 3 tomas seguidas, así que es más estricta que la OMS.
Está bien y es defendible.** Pero conviene decir en pantalla que son tomas de
días distintos, no tres seguidas en la misma tarde.

### Lo que falta: la diastólica

`mobile/src/core/reglas.ts` solo mira `presion_sist`. La OMS define hipertensión por
sistólica **o** diastólica. Alguien con 130/95 es hipertenso y hoy la app no lo
detecta. `BloodPressureRecord` trae las dos.

---

## 4. Vía B: laboratorio

Los 8 marcadores de `mobile/src/core/marcadores.ts`, revisados contra fuente.

| Marcador | Rango en el código | Veredicto |
| --- | --- | --- |
| Glicemia en ayunas | 70 a 100 mg/dL | Correcto, coincide con ADA |
| **Hemoglobina** | **12 a 16 g/dL** | **Defecto, ver abajo** |
| Plaquetas | 150 a 450 x10^3/µL | Rango estándar correcto |
| Creatinina | 0.6 a 1.2 mg/dL | Rango estándar correcto |
| Linfocitos CD4 | 500 a 1500 cél/µL | **Fuera del demo por el brief (VIH)** |
| Colesterol total | 0 a 200 mg/dL | Estándar |
| Hematocrito | 36 a 48% | Estándar |
| TSH | 0.4 a 4.0 µUI/mL | Estándar |

---

## 5. Dos defectos encontrados en el código

### Defecto 1: la hemoglobina no distingue sexo

`mobile/src/core/marcadores.ts` usa **12 a 16 g/dL para todo el mundo**.

La OMS, en su guía actualizada de 2024, define anemia con umbrales **distintos
por sexo**: menos de **120 g/L (12 g/dL) en mujeres no embarazadas** y menos de
**130 g/L (13 g/dL) en hombres**.

**Consecuencia concreta:** un hombre con hemoglobina de 12.5 g/dL tiene anemia
según la OMS, y la app de hoy le dice **"dentro de rango"**. Es un falso negativo
en el marcador más común de todos.

Arreglo: el perfil necesita el sexo, y `reglasRango()` tiene que elegir el umbral
según ese dato. Si no se quiere pedir el sexo, la alternativa honesta es usar
**13 g/dL para todos** (el umbral más sensible) y decir en pantalla que es un
criterio conservador.

Ojo también: la OMS recomienda **ajustar la hemoglobina por altitud y por
tabaquismo**. Panamá es mayormente bajo, pero las tierras altas de Chiriquí
pasan de los 1,000 m. Fuera de alcance para el hackathon, pero se declara.

Fuente: [OMS, guideline on haemoglobin cutoffs to define anaemia](https://iris.who.int/server/api/core/bitstreams/f9f74397-1440-478d-a63c-26f29a01552f/content).

### Defecto 2: un solo valor no sugiere dengue

`mobile/src/core/marcadores.ts` dice hoy:

- plaquetas bajas -> *"descartar dengue, repetir en 24 h"*
- hematocrito alto -> *"descartar dengue con signos de alarma"*

Las guías de la OMS de 2009 sí incluyen un signo de alarma de laboratorio, pero
es **uno solo y es una combinación**: *"increase in hematocrit concurrent with
rapid decrease in platelet count"*. Es decir, hematocrito **subiendo** al mismo
tiempo que plaquetas **cayendo rápido**, en alguien **con sospecha de dengue**, y
**sin umbrales numéricos definidos**.

La ficha pública de la OMS sobre dengue lista solo signos **clínicos** (dolor
abdominal intenso, vómito persistente, sangrado de encías o nariz, piel pálida y
fría, entre otros) y **no menciona plaquetas ni hematocrito**.

**Consecuencia concreta:** alguien sin fiebre, con las plaquetas un poco bajas por
cualquier otra causa, recibe hoy un mensaje que le nombra el dengue. Eso es
exactamente una *"afirmación clínica no respaldada"*, que es lo que el reto
Tether Psy penaliza por escrito.

Arreglo, en orden de preferencia:

1. **Quitar la mención al dengue de los marcadores sueltos.** Plaquetas bajas
   dicen "trombocitopenia, repetir hemograma" y punto.
2. Si se quiere conservar el ángulo dengue, que es muy relevante para Panamá,
   hacerlo bien: una regla aparte que exija **fiebre + hematocrito subiendo +
   plaquetas cayendo en tomas sucesivas**. Requiere serie temporal, no un valor.

Fuentes: [OMS, dengue y dengue grave](https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue),
[OPS, guías de dengue 2009](https://www.paho.org/sites/default/files/2022-08/2009-cde-dengue-guidelines-diagnosis-treatment-prevention-control.pdf).

---

## 6. Qué se cambió

Los seis, aplicados. `mobile/src/core/marcadores.ts` y `mobile/src/core/reglas.ts` compilan en estricto
y las reglas están probadas caso por caso.

| # | Cambio | Estado |
| --- | --- | --- |
| 1 | Hemoglobina por sexo, 13 g/dL cuando no se conoce | **Hecho.** `porSexo` en el marcador, `clasificar(m, valor, sexo?)` |
| 2 | Quitar la mención al dengue de marcadores sueltos | **Hecho.** Plaquetas y hematocrito dicen lo que la lectura muestra |
| 3 | Presión **diastólica** en las reglas | **Hecho.** `PRES_ALTA` dispara por sistólica **o** diastólica |
| 4 | Saturación de oxígeno y temperatura | **Hecho.** `SAT_CRITICA`, `SAT_BAJA` y `FIEBRE` |
| 5 | Quitar CD4 | **Hecho.** Fuera de la tabla, con filtro de respaldo en el generador |
| 6 | Tomas de presión en **días distintos** | **Hecho.** Está en el texto del examen sugerido |

### Casos probados

| Caso | Resultado |
| --- | --- |
| 130/95 | `PRES_ALTA` por diastólica. **Antes no se detectaba** |
| 145/85 | `PRES_ALTA` por sistólica |
| 120/78 | Sin señales |
| Saturación 88% | `SAT_CRITICA`, urgencia Inmediata |
| Saturación 93, 92, 94 | `SAT_BAJA`, urgencia Prioritaria |
| Saturación 97, 98, 97 | Sin señales |
| Temperatura 38.6 | `FIEBRE` |
| Temperatura 36.9 | Sin señales |
| Glucosa 130 de promedio | `GLU_ALTA` con costo 6 a 15 USD citado |
| **Usuario sano completo** | **Sin señales** (criterio C3c) |

## 6b. Los costos, con fuente

Los valores de antes (25, 8, 40 y 15 USD) estaban inventados y salían en
pantalla. Ahora son **rangos publicados**, y el tipo `CostoEstimado` obliga a
llevar la fuente pegada al número.

| Examen | Rango | Fuente |
| --- | --- | --- |
| Glucosa en ayunas | 6 a 15 USD | Rangos de laboratorios en Panamá, [chequeandome.com.pa](https://chequeandome.com.pa/blog/laboratoriopreciosdeexamenespanama/) |
| Electrocardiograma | 20 a 45 USD | Clínicas en Panamá: trazo desde ~28, informado por cardiología ~45 |

Donde no hay precio publicado que citar, **el campo `costo` va ausente y la
pantalla no muestra número**. El prompt se lo dice al modelo explícito: *"El
costo viene dado en los datos de entrada. Cópialo tal cual. Si no viene, usa
null en ambos: no inventes precios."*

Los rangos son aproximados y varían por laboratorio, sede y promoción. Eso se
dice en pantalla, no solo aquí.

---

## 6c. Segunda ronda: lo que faltaba vigilar

Revisión posterior. Encontró un hueco de seguridad y tres variables que se
estaban leyendo o descartando sin razón.

### El hueco: solo detectábamos glucosa **alta**

`GLU_ALTA` y `GLU_LIMITE` miran hacia arriba. **La hipoglucemia no la veía
nadie**, y a diferencia de la glucosa alta es **aguda**: no es un riesgo a diez
años, es alguien que se puede desmayar hoy.

La ADA la clasifica en niveles:

| Nivel | Glucosa | Qué significa |
| --- | --- | --- |
| 1 | 54 a 70 mg/dL | Valor de alerta. Requiere carbohidrato de acción rápida |
| 2 | Menos de 54 mg/dL | Clínicamente significativa. **Requiere acción inmediata** |
| 3 | Cualquier valor | Evento grave con alteración del estado, requiere ayuda de otra persona |

Implementado como `GLU_BAJA` (Prioritaria) y `GLU_MUY_BAJA` (Inmediata). **Una
sola lectura basta**: esperar tres tomas para avisar de una hipoglucemia sería
absurdo. El mensaje dice qué hacer, tomar azúcar de absorción rápida, no solo
que hay un problema.

Fuente: [ADA, Glycemic Goals and Hypoglycemia](https://diabetesjournals.org/care/article/48/Supplement_1/S128/157561/6-Glycemic-Goals-and-Hypoglycemia-Standards-of).

### Corrección: la frecuencia respiratoria sí es señal

Una versión anterior de este documento la puso junto a pasos y sueño como
"contexto, no señal". **Estaba mal.** Tiene umbral clínico claro y es de los
signos vitales que más rápido indican deterioro.

| Frecuencia respiratoria | Lectura |
| --- | --- |
| 12 a 20 por minuto | Normal en adultos |
| Más de 20 | Taquipnea |
| Más de 25 | Señal de alarma |
| Menos de 12 | Bradipnea |

Implementado como `RESP_ALTA` (3 mediciones sobre 20, Prioritaria) y
`RESP_MUY_ALTA` (una sobre 25, Inmediata). Health Connect la expone como
`RespiratoryRateRecord`.

### El peso, que se leía y se tiraba

Estaba declarado y sin ninguna regla. Ahora sostiene dos señales:

**Índice de masa corporal.** La OMS define en adultos sobrepeso a partir de
**25** y obesidad a partir de **30**, con la fórmula peso en kg dividido por la
estatura en metros al cuadrado. Requiere `HeightRecord`, que Health Connect
también expone. La propia OMS advierte que el IMC es *"a surrogate marker of
fatness"*, un indicador aproximado, y eso se dice en pantalla.

Importa para Panamá: la obesidad es el tercer factor que MINSA nombra junto a
hipertensión y diabetes al hablar de riesgo de muerte por dengue e influenza.

**Pérdida de peso involuntaria.** Perder más del **5% del peso corporal en 6 a
12 meses** sin proponérselo amerita evaluación médica, y por encima del 10% se
considera desnutrición proteico-energética. Es una señal de tendencia pura: no
la ve ningún valor suelto, solo la serie. La regla pide al menos 60 días de
historial para no confundirse con fluctuación normal.

Fuentes: [OMS, obesidad y sobrepeso](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight),
[Merck Manual, involuntary weight loss](https://www.merckmanuals.com/professional/special-subjects/nonspecific-symptoms/involuntary-weight-loss).

### Lo que se decidió NO vigilar, y por qué

Esto también es una decisión, y conviene tenerla escrita.

| Dato | Health Connect lo expone | Por qué no |
| --- | --- | --- |
| **Bradicardia** (pulso bajo 60) | Sí, `RestingHeartRateRecord` | Es normal en personas entrenadas y **solo importa acompañada de síntomas** (mareo, desmayo, confusión) que la app no puede observar. Alertar por el número solo generaría falsos positivos en cualquiera que haga deporte |
| **Variabilidad cardiaca** | Sí, `HeartRateVariabilityRmssdRecord` | No tiene umbral clínico simple y universal. Es útil comparada contra la propia línea base de la persona, no contra una tabla |
| **Pasos** | Sí, `StepsRecord` | Es contexto de estilo de vida. La OMS recomienda actividad física, pero "caminó poco" no es un hallazgo que mande a nadie al laboratorio |
| **Sueño** | Sí, `SleepSessionRecord` | Igual: factor de riesgo a largo plazo, no señal accionable hoy |

La regla que separa una columna de la otra: **¿un valor fuera de rango cambia lo
que la persona debería hacer esta semana?** Si no, es contexto.

## 7. Lo que hay que decir en pantalla, y en el video

Esto no es letra chica, es parte del criterio de evaluación.

- **No es un diagnóstico.** Es orientación para decidir si vale la pena hacerse
  un examen.
- Los umbrales son **poblacionales**. Sirven para orientar, no para clasificar a
  una persona concreta.
- La app **no considera** embarazo, altitud, tabaquismo, edad pediátrica ni
  medicación en curso, y todos ellos mueven estos números.
- Los costos de examen que muestra la app son **estimados**, no precios de un
  laboratorio real, mientras no se cite una fuente panameña.

---

## 8. Lo que no cubrimos, y se declara

- Nadie del equipo es profesional de salud. Todo umbral sale de una guía citada
  arriba; ninguno es criterio nuestro.
- No hay validación clínica del conjunto, solo de cada umbral por separado.
- Los datos son **100% sintéticos**. Ningún valor de este repo corresponde a una
  persona real.
