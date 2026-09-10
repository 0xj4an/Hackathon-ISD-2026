# ADR-010: El paquete completo a un ano, y el credito siempre

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
2. **El monto que se ofrecia no tenia relacion con el costo real.**
   `PantallaCredito` proponia 50, 100 o 200 fijos, numeros inventados que no
   salian de ningun lado.

## Decision

Se cotiza un **paquete por condicion a un ano** (`mobile/src/core/paquete.ts`), no un
examen suelto. Un ano es el ciclo de control completo: diagnostico, equipo,
examenes de seguimiento, consultas de control y el medicamento de todos los
dias.

Cotizar el ano es lo que revela el costo real, y cambia la conclusion. Lo que
pesa no son los examenes: es el medicamento diario, que es justo lo invisible
cuando uno cotiza "una consulta y un examen".

| Caso | 3 meses (antes) | 1 ano | Peso del medicamento |
| --- | --- | --- | --- |
| Diabetes tipo 2 | B/. 164 a 254 | **B/. 641 a 920** | 380 de 920, un 41% |
| Hipertension | B/. 218 a 349 | **B/. 617 a 812** | 482 de 812, un 59% |

Metformina 850 mg dos veces al dia son **730 tabletas** en un ano. Enalapril
20 mg una vez al dia son **365**.

**El credito se ofrece siempre que haya algo que atender, sin importar el
monto.** Quien puede pagar de una y quien no lo decide la persona, no un umbral
puesto desde aqui. La app pone el numero al frente y ya.

Hubo una version intermedia con una puerta (minimo B/. 100 y tratamiento
sostenido) que dejaba fuera prediabetes y el cuadro agudo. Se descarto: era una
inferencia nuestra sobre lo que le conviene a la persona, no una regla del
producto. Alguien con B/. 72 de gasto y sin efectivo esta igual de bloqueado que
alguien con 900.

Tampoco hay excepcion por urgencia. Hubo una version que no daba paquete cuando
`urgencia === "Inmediata"`, con el argumento de que quien esta en emergencia no
llena formularios. Se descarto, y por una razon que es el corazon del producto:
**la atencion de urgencia tambien cuesta, y es justo por eso que la gente no
va**. Callar el numero no protege a nadie; ponerlo al frente, con el credito al
lado, es lo unico que cambia la decision de ir o no ir.

En esos casos el paquete no compite con la instruccion urgente: la tarjeta de la
senal va primero ("come azucar ya"), el paquete debajo, y su nota abre con
"Primero la atencion: ve ya, no esperes a resolver la plata".

**Las 14 senales tienen paquete.** Si faltara uno, habria un caso donde la app
detecta algo y no sabe decir cuanto cuesta atenderlo. `eval/run.mjs` lo verifica.

Resultado sobre los 6 casos: **5 de 6 ofrecen credito**. El unico que no es el
caso sano, que no tiene nada que atender.

| Caso | Total | Credito | Plazo y cuota con ingreso de B/. 520 |
| --- | --- | --- | --- |
| Diabetes sin diagnosticar | B/. 641 a 920 | si | 12 meses, B/. 57 a 82 |
| Hipertension no controlada | B/. 617 a 812 | si | 12 meses, B/. 55 a 72 |
| Hipoglucemia | B/. 235 a 530 | si | 6 a 12 meses, B/. 41 a 47 |
| Prediabetes | B/. 72 a 170 | si | 6 meses, B/. 12 a 29 |
| Cuadro respiratorio agudo | B/. 48 a 120 | si | 6 meses, B/. 8 a 21 |
| Sin hallazgos | sin paquete | no | nada que atender |

El nodo aprueba estos montos sin recortarlos: con ingreso de B/. 520 al mes,
diabetes por 920 sale aprobada a 12 meses con cuota de B/. 81.96, muy debajo
del techo del 30% del ingreso. Recien con ingreso de B/. 250 empieza a
ajustar (aprueba 828 de los 920).

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
- `PantallaCredito` ya no tiene montos fijos: ofrece `total_min` ("lo justo")
  y `total_max` ("todo"), que llegan por `onPedirCredito`.
- El plazo del nodo escalona por monto (`<=300` 6 meses, `<=1000` 12, arriba
  24), asi que el paquete anual cae naturalmente en 12 meses: la persona paga
  el ano de tratamiento a lo largo de ese mismo ano.
- **El piso del credito bajo de B/. 50 a B/. 25**, en `SolicitudSchema` y en
  `nodo/credito.mjs`. Ofrecer credito por cualquier monto destapo que el paquete
  mas barato (sobrepeso, B/. 28) y el "lo justo" del cuadro agudo (B/. 48)
  quedaban por debajo del piso viejo: el nodo los rechazaba con el motivo
  equivocado ("capacidad de pago insuficiente" cuando la capacidad sobraba).
  Verificado: los seis montos que la app puede pedir hoy salen aprobados.
- `eval/run.mjs` seccion 4 verifica la puerta en cada corrida: nunca credito en
  urgencia, nunca sin tratamiento sostenido, nunca por debajo del minimo, y
  ninguna linea sin fuente.

## Se reabre si

Aparece una tarifa oficial del MINSA o de la CSS para consulta y examenes. Hoy
no existe una citable, y por eso todo el paquete se cotiza sobre precio privado.
