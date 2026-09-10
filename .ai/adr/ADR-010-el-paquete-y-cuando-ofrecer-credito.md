# ADR-010: El paquete completo, y cuando NO ofrecer credito

**Estado:** decidido
**Fecha:** 2026-09-10

## Contexto

Hasta aqui la app mostraba el precio de cada examen por separado. Sumados dan
cifras pequenas: para el caso de diabetes, unos B/. 14. Y `PantallaCredito`
ofrece montos desde B/. 50.

Eso deja dos huecos que se tapan solos:

1. **No se puede ofrecer credito sin saber cuanto cuesta todo.** El monto que
   la persona debe pedir no es el del examen, es el de atender la condicion:
   consulta, examenes, equipo, tratamiento y el control.
2. **Un credito de B/. 50 no vale la pena.** Ni para quien lo pide, que carga
   con un tramite por un monto que consigue de otra forma, ni para quien lo
   presta, donde el costo de originarlo se come el margen.

## Decision

Se cotiza un **paquete por condicion** (`core/paquete.ts`), no un examen suelto.

El credito se ofrece solo si se cumplen **las dos** condiciones:

1. **El paquete pesa**: total por encima de B/. 100.
2. **Hay tratamiento sostenido**: la condicion es cronica y el costo se estira
   en meses. Un cuadro agudo se atiende hoy y se acaba; financiarlo solo pone
   un tramite en el camino de alguien que tiene que ir ya.

Y nunca hay paquete en una urgencia (`urgencia === "Inmediata"`): quien esta en
emergencia va a urgencias, no llena un formulario.

Resultado sobre los 6 casos: **2 de 6 ofrecen credito** (diabetes B/. 164 a 254,
hipertension B/. 218 a 349). Los otros cuatro no lo necesitan o no pueden
esperarlo, y la app se los dice.

## Los precios

Se cotiza el **limite superior** de cada rango: si el monto cubre el peor caso,
la persona no queda a mitad de camino. Y se cotiza lo privado, con el aviso de
que en un centro del MINSA puede costar menos o nada.

Los medicamentos salen del **Decreto Ejecutivo N.o 36 del 30 de septiembre de
2025** (MICI), que fija precios tope para 51 medicamentos cronicos en Panama:

| Medicamento | Tope oficial |
| --- | --- |
| Metformina 850 mg | B/. 0.52 por tableta |
| Enalapril 20 mg | B/. 1.32 |
| Amlodipina 5 mg | B/. 1.33 |
| Insulina NPH vial | B/. 21.36 |
| Insulina Glargina | B/. 23.50 |

Donde no hay precio publicado que citar (HbA1c, tensiometro, radiografia,
oximetro, consulta de nutricion), la linea lleva `estimado: true`, sale marcada
en pantalla y su `fuente` dice "Sin precio publicado que citar". Se estima
alto, por la misma razon que se cotiza el limite superior.

**Esto no receta nada.** El paquete estima lo que suele costar el tratamiento
habitual de una condicion. Que tomar lo decide un medico, y la pantalla lo dice.

## Consecuencias

- El monto del credito sale de `Paquete.total_*`, no de la suma de
  `Senal.costo`. Esa suma queda sin uso.
- `PantallaCredito` ofrece montos desde B/. 50, por debajo del minimo
  financiable de este ADR. Hay que subir esa escala a los totales reales.
- `eval/run.mjs` seccion 4 verifica la puerta en cada corrida: nunca credito en
  urgencia, nunca sin tratamiento sostenido, nunca por debajo del minimo, y
  ninguna linea sin fuente.

## Se reabre si

Aparece una tarifa oficial del MINSA o de la CSS para consulta y examenes. Hoy
no existe una citable, y por eso todo el paquete se cotiza sobre precio privado.
