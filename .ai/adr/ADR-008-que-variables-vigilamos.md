# ADR-008: Qué variables vigilamos y con qué umbrales

- Estado: **aceptada**
- Contexto: el reto Tether Psy exige, para proyectos médicos, *"comunicar
  limitaciones, sin afirmaciones clínicas no respaldadas"*. `ADR-005` decide que
  las reglas deciden y el modelo solo redacta. Las dos cosas juntas obligan a
  que **cada número que dispara una alerta salga de una guía publicada**.
  Nadie del equipo es profesional de salud.

  La investigación completa, con enlaces a cada fuente, está en
  [`../references/salud.md`](../references/salud.md). Este ADR fija el resultado.

## Decisión

**14 señales sobre 9 variables**, repartidas en dos vías que desembocan en el
mismo tipo `Senal` (`ADR-003` y la sección "Las dos vías" de la especificación).

### Vía A: el historial del teléfono (`mobile/src/core/reglas.ts`)

| Señal | Variable | Dispara cuando | Urgencia | Fuente del umbral |
| --- | --- | --- | --- | --- |
| `GLU_MUY_BAJA` | Glucosa | Una lectura **< 54 mg/dL** | **Inmediata** | ADA, hipoglucemia nivel 2 |
| `GLU_BAJA` | Glucosa | Una lectura **54 a 70** | Prioritaria | ADA, hipoglucemia nivel 1 |
| `GLU_ALTA` | Glucosa | Promedio de 3 tomas **>= 126** | Prioritaria | ADA, criterio de diabetes |
| `GLU_LIMITE` | Glucosa | Promedio de 3 tomas **100 a 125** | Rutinaria | ADA, glucosa alterada en ayunas |
| `PRES_ALTA` | Presión | **Sist >= 140 o diast >= 90**, 3 tomas | Prioritaria | OMS, hipertensión |
| `TAQUI` | Pulso reposo | **> 100 lpm** durante 5 días | Prioritaria | Rango normal 60 a 100 |
| `SAT_CRITICA` | Saturación O2 | Una lectura **< 90%** | **Inmediata** | Requiere atención inmediata |
| `SAT_BAJA` | Saturación O2 | 3 lecturas **< 95%** | Prioritaria | Normal 95 a 100% |
| `RESP_MUY_ALTA` | Frec. respiratoria | Una lectura **> 25/min** | **Inmediata** | Señal de alarma en adultos |
| `RESP_ALTA` | Frec. respiratoria | 3 lecturas **> 20/min** | Prioritaria | Taquipnea. Normal 12 a 20 |
| `FIEBRE` | Temperatura | **>= 38 °C** | Prioritaria | Definición de fiebre |
| `IMC_OBESIDAD` | Peso + estatura | **IMC >= 30** | Rutinaria | OMS, obesidad |
| `IMC_SOBREPESO` | Peso + estatura | **IMC >= 25** | Rutinaria | OMS, sobrepeso |
| `PESO_BAJA` | Peso (serie) | **Caída > 5%** en 60 a 400 días | Prioritaria | Pérdida involuntaria amerita estudio |

### Vía B: exámenes de laboratorio (`mobile/src/core/marcadores.ts`)

7 marcadores clasificados contra su rango. La urgencia sale del desvío: más de
1.8 veces el límite superior o menos de la mitad del inferior es Inmediata.

| Código | Marcador | Rango | Unidad |
| --- | --- | --- | --- |
| `GLU` | Glicemia en ayunas | 70 a 100 | mg/dL |
| `HB` | Hemoglobina | **13 a 16** hombres, **12 a 16** mujeres | g/dL |
| `PLQ` | Plaquetas | 150 a 450 | x10^3/µL |
| `CREA` | Creatinina | 0.6 a 1.2 | mg/dL |
| `COL` | Colesterol total | 0 a 200 | mg/dL |
| `HTO` | Hematocrito | 36 a 48 | % |
| `TSH` | TSH | 0.4 a 4.0 | µUI/mL |

### Reglas de forma que se aplican a todo lo anterior

1. **Lo agudo no espera tendencia.** Hipoglucemia, saturación bajo 90 y
   frecuencia respiratoria sobre 25 disparan con **una sola lectura**. Esperar
   tres tomas para avisar de una hipoglucemia sería absurdo.
2. **Lo crónico sí.** Glucosa alta, presión, pulso y saturación entre 90 y 95
   piden 3 o 5 lecturas, porque un valor suelto de un sensor de consumo es ruido.
3. **Cada señal lleva su `fuente`** pegada en el código, no en un comentario.
4. **Los costos llevan rango y fuente**, o no llevan número. El tipo
   `CostoEstimado` lo obliga.
5. **Ninguna señal nombra una enfermedad** que su umbral no sostenga.

## Alternativas consideradas

- **Umbrales elegidos por nosotros, "razonables".** Es lo que había: los costos
  eran inventados y la hemoglobina usaba un rango único. Produjo dos defectos
  reales, uno de ellos un falso negativo en el marcador más común.
- **Que el modelo decida qué es anormal.** Descartado en `ADR-005`, y el spike
  mostró por qué: el modelo base inventó rangos de referencia.
- **Vigilar todo lo que Health Connect expone.** Suena completo y es peor: pasos,
  sueño y variabilidad cardiaca generarían alertas que no cambian ninguna
  decisión. Ver la tabla de exclusiones abajo.

## Consecuencias

- **Cobertura alineada con Panamá.** Hipertensión (42% de la población),
  diabetes (~15% de los adultos) y obesidad son los tres factores que MINSA
  nombra junto al riesgo de morir por dengue. Las tres están vigiladas.
- El perfil necesita **sexo** para la hemoglobina y **estatura** para el IMC. Sin
  sexo se usa 13 g/dL, el umbral más sensible: se equivoca hacia mandar a
  chequearse, no hacia el silencio.
- La pantalla tiene que decir que los umbrales son **poblacionales**, que el IMC
  es un indicador aproximado, y que los precios son rangos que varían.
- No se considera embarazo, altitud, tabaquismo, edad pediátrica ni medicación
  en curso, y **todos ellos mueven estos números**. Va declarado.

### Lo que se decidió NO vigilar

| Dato | Por qué no |
| --- | --- |
| Bradicardia (pulso < 60) | Normal en personas entrenadas. Solo importa con síntomas que la app no puede observar |
| Variabilidad cardiaca | Sin umbral simple universal. Se lee contra la línea base de cada persona |
| Pasos, sueño | Factor de riesgo a largo plazo, no hallazgo accionable esta semana |

La regla que separa señal de contexto: **¿un valor fuera de rango cambia lo que
la persona debería hacer esta semana?** Si no, es contexto.

## Reabrir si

Aparece una guía más reciente que mueva un umbral, o el equipo consigue precios
de laboratorio de una fuente panameña citable mejor que los rangos actuales.
Ampliar la cobertura clínica más allá de esto requiere que alguien con criterio
médico revise las reglas, no que nosotros leamos otra página.
