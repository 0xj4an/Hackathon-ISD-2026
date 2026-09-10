# Evaluacion de las reglas de dominio

Generado por `node eval/run.mjs`. Determinista: mismo resultado en cada corrida.

## 1. Deteccion por historial (via A)

Cada caso de `data/usuarios/` debe producir exactamente las senales que declara.

| Caso | Esperado | Obtenido | |
| --- | --- | --- | --- |
| Sin hallazgos | ninguna | ninguna | OK |
| Diabetes sin diagnosticar | GLU_ALTA, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA | GLU_ALTA, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA | OK |
| Hipertension no controlada | IMC_OBESIDAD, PRES_ALTA | IMC_OBESIDAD, PRES_ALTA | OK |
| Cuadro respiratorio agudo | FIEBRE, RESP_ALTA, SAT_BAJA, TAQUI | FIEBRE, RESP_ALTA, SAT_BAJA, TAQUI | OK |
| Hipoglucemia | GLU_MUY_BAJA | GLU_MUY_BAJA | OK |
| Prediabetes | GLU_LIMITE, IMC_SOBREPESO | GLU_LIMITE, IMC_SOBREPESO | OK |

**C3c, el caso sano no dispara nada:** OK, cero senales

## 2. Clasificacion de laboratorio (via B)

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

Senales distintas ejercitadas por los casos: **11** (FIEBRE, GLU_ALTA, GLU_LIMITE, GLU_MUY_BAJA, IMC_OBESIDAD, IMC_SOBREPESO, PESO_BAJA, PRES_ALTA, RESP_ALTA, SAT_BAJA, TAQUI).

## Resultado

**Todo pasa.** Los casos producen exactamente sus senales declaradas, los marcadores clasifican en los tres estados, y ninguna senal sale sin ruta ni sin fuente.
