# Evaluacion de las reglas de dominio

Generado por `node eval/run.mjs`. Determinista: mismo resultado en cada corrida.

## 1. Deteccion por historial

Cada caso de `data/usuarios/` debe producir exactamente las senales que declara.

| Caso | Esperado | Obtenido | |
| --- | --- | --- | --- |
| Diabetes sin diagnosticar | GLU_ALTA, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA | GLU_ALTA, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA | OK |
| Azucar baja (leve) | GLU_BAJA | GLU_BAJA | OK |
| Hipertension no controlada | IMC_OBESIDAD, PRES_ALTA | IMC_OBESIDAD, PRES_ALTA | OK |
| Hipoglucemia | GLU_MUY_BAJA | GLU_MUY_BAJA | OK |
| Prediabetes | GLU_LIMITE, IMC_SOBREPESO | GLU_LIMITE, IMC_SOBREPESO | OK |
| Respiracion muy rapida | RESP_MUY_ALTA | RESP_MUY_ALTA | OK |
| Cuadro respiratorio agudo | FIEBRE, RESP_ALTA, SAT_BAJA, TAQUI | FIEBRE, RESP_ALTA, SAT_BAJA, TAQUI | OK |
| Sin hallazgos | ninguna | ninguna | OK |
| Oxigeno critico | SAT_CRITICA | SAT_CRITICA | OK |

**C3c, el caso sano no dispara nada:** OK, cero senales

## 2. Clasificacion de laboratorio

Cada marcador debe clasificar alto, bajo y dentro de rango. Se prueban tres
valores por marcador: justo por encima del maximo, justo por debajo del minimo,
y el centro del rango.

| Marcador | Rango | Alto | Bajo | Normal | |
| --- | --- | --- | --- | --- | --- |
| glicemia en ayunas | 70 a 100 mg/dL | OK | OK | OK |  |
| hemoglobina | 13 a 16 g/dL | OK | OK | OK |  |
| plaquetas | 150 a 450 x10^3/µL | OK | OK | OK |  |
| creatinina | 0.6 a 1.2 mg/dL | OK | OK | OK |  |
| colesterol total | 0 a 200 mg/dL | OK | n/a | OK |  |
| hematocrito | 36 a 48 % | OK | OK | OK |  |
| TSH | 0.4 a 4 µUI/mL | OK | OK | OK |  |

**Hemoglobina por sexo (OMS 2024).** Con 12.5 g/dL:

- hombre: anemia OK
- mujer: dentro de rango OK

## 3. Integridad de las rutas

Toda senal tiene que decir que hacer, no solo que algo anda mal.

- senales sin `donde`: 0, OK
- senales sin `especialista`: 0, OK
- senales sin `fuente` del umbral: 0, OK
- costos sin fuente citada: 0, OK

Senales distintas ejercitadas por los casos: **14** (FIEBRE, GLU_ALTA, GLU_BAJA, GLU_LIMITE, GLU_MUY_BAJA, IMC_OBESIDAD, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA, RESP_ALTA, RESP_MUY_ALTA, SAT_BAJA, SAT_CRITICA, TAQUI).

## 4. El paquete de cada caso

El credito se ofrece SIEMPRE que haya algo que atender, sin importar el monto
ni la urgencia. La atencion de urgencia tambien cuesta, y es justo por eso que
la gente no va. Lo unico sin paquete es no tener ningun hallazgo.

| Caso | Paquete | Total | Credito | |
| --- | --- | --- | --- | --- |
| Diabetes sin diagnosticar | Diabetes tipo 2: confirmar y tratar un año | B/. 641 a 920 | si | OK |
| Azucar baja (leve) | Azúcar baja: estudio inicial | B/. 39 a 90 | si | OK |
| Hipertension no controlada | Hipertensión: confirmar y controlar un año | B/. 617 a 812 | si | OK |
| Hipoglucemia | Azúcar peligrosamente baja: urgencia y seguimiento un año | B/. 235 a 530 | si | OK |
| Prediabetes | Prediabetes: seguimiento por un año | B/. 72 a 170 | si | OK |
| Respiracion muy rapida | Respiración muy acelerada: urgencia y estudio | B/. 71 a 205 | si | OK |
| Cuadro respiratorio agudo | Falta de oxígeno: estudio inicial | B/. 48 a 120 | si | OK |
| Sin hallazgos | sin hallazgos | - | no | OK |
| Oxigeno critico | Oxígeno crítico: urgencia y estudio | B/. 113 a 310 | si | OK |

Casos que ofrecen credito: **8 de 9**. El unico que no, es el caso sano: no hay nada que atender.

Toda senal tiene que tener paquete. Si falta uno, hay un caso donde la app
detecta algo y no sabe decir cuanto cuesta atenderlo.

- senales sin paquete: 0, OK (de 14)

## 5. Modelo de credito

El scorecard esta entrenado sobre **cartera sintetica** de 3000 solicitantes con semilla 20260910. No hay ni un dato real de ningun cliente.

Holdout: AUC 0.7233, KS 0.3795, mora de la cartera 13.27%.

### Monotonia de los puntos

| Variable | IV | Puntos por bin | |
| --- | --- | --- | --- |
| tipo | 0.245 | 101, 116, 84, 59 | categorica |
| antiguedad | 0.030 | 85, 85, 95 | OK |
| deuda_ing | 0.241 | 112, 109, 91, 75 | OK |
| monto_ing | 0.074 | 99, 99, 91, 82 | OK |
| meses_extracto | 0.309 | 84, 93, 95, 109 | OK |
| saldo_ing | 0.304 | 84, 101, 105 | OK |

La edad no puntua: OK. Solo define elegibilidad.

### Los montos de la demo

Ingreso de B/. 520, asalariado, una deuda de B/. 40 al mes, sin dependientes.

| Monto | Decision | Grado | Plazo | Tasa | Cuota | |
| --- | --- | --- | --- | --- | --- | --- |
| 920 | aprobada | C | 12 | 17.4% | 84.08 | OK |
| 812 | aprobada | C | 12 | 17.49% | 74.25 | OK |
| 530 | aprobada | C | 6 | 16.63% | 92.67 | OK |
| 170 | aprobada | B | 6 | 19.92% | 30 | OK |
| 120 | aprobada | B | 6 | 22.96% | 21.36 | OK |
| 28 | aprobada | B | 6 | 24% | 5 | OK |

### Invariantes

| Invariante | |
| --- | --- |
| la cuota nunca pasa la capacidad | OK |
| el monto nunca pasa 3 veces el ingreso | OK |
| la tasa esta entre el piso y el techo | OK |
| toda decision trae version de politica | OK |
| el rechazo dice cuanto puede pagar | OK |
| el rechazo trae factores accionables | OK |
| la precalificacion se declara estimada | OK |
| precalificacion y decision coinciden en el monto | OK |

### El precio contra la perdida

Expuesto B/. 2580. Perdida simulada B/. 116.87 (4.53%). Prima de riesgo cobrada B/. 212.99. Provision B/. 155.83.

El precio cubre la perdida: OK.

## Resultado

**Todo pasa.** Los casos producen exactamente sus senales declaradas, los marcadores clasifican en los tres estados, ninguna senal sale sin ruta ni sin fuente, y todo paquete sale con su costo y su fuente.
