# Documentos de prueba para el OCR

**Todo lo que hay aquí es ficticio.** Las personas, la empresa y el banco no
existen, y cada imagen lo dice en su cara: `MUESTRA SIN VALOR - DATOS FICTICIOS
- PRUEBA DE OCR`. No se reproduce el diseño, el escudo ni los sellos de ningún
documento oficial. Existen para ejercitar la lectura, nada más.

## Qué hay

Tres documentos, cada uno en dos versiones:

| Archivo | Qué es | De dónde salen los campos |
| --- | --- | --- |
| `cedula-*.jpg` | Cédula de identidad personal | `CedulaSchema` |
| `ingresos-*.jpg` | Carta de trabajo con salario | `IngresosSchema` |
| `extracto-*.jpg` | Estado de cuenta de ahorros, 3 meses | `ExtractoSchema` |

`-nitido` es una foto buena: casi derecha, bien iluminada, poca compresión.
`-dificil` es una foto de verdad: torcida hasta 2.6 grados, desenfocada, con la
sombra de la mano encima y comprimida a calidad 38.

Las dos versiones importan. Si la extracción solo funciona sobre la nítida, en
la demo se cae, porque nadie sostiene el teléfono derecho.

## `esperado.json`

La verdad de referencia, campo por campo. Sin esto las imágenes son decoración;
con esto la extracción se puede puntuar como se puntúa el modelo en
`spikes/lora-medpsy`: qué porcentaje de campos salió bien, y en cuál de las dos
versiones se cae.

Los tres objetos validan contra sus esquemas de `mobile/src/core/schemas.ts`,
verificado. Si la cédula no pasara el regex de formato panameño, no habría forma
de enterarse hasta después de correr el OCR.

## Coherencia interna

El saldo promedio del extracto **se calcula** a partir de sus propios
movimientos, no se escribe a mano. Un extracto donde el promedio no cuadra con
sus saldos es lo primero que revisa alguien que sepa leerlo, y además el nodo lo
usa para bajar la tasa de 12.5% a 9.5%: el número tiene que ser cierto.

Los saldos también encadenan: cada uno es el anterior más el monto de la fila.

El salario de la carta (B/. 520 al mes) es el mismo que se usa en las corridas
del nodo, y los abonos del extracto son dos quincenas de B/. 260.

## Regenerar

```bash
python3 data/generar-documentos.py
```

Determinista por semilla: sale igual en cada corrida. Las imágenes están
commiteadas, así que esto solo hace falta si se cambian los datos.
