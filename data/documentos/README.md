# Documentos de prueba para el OCR

**Todo lo que hay aquí es ficticio.** Las personas, la empresa, el banco y el
laboratorio no existen, y cada imagen lo dice en su cara: `MUESTRA SIN VALOR -
DATOS FICTICIOS - PRUEBA DE OCR`. No se reproduce el diseño, el escudo ni los
sellos de ningún documento oficial. Existen para ejercitar la lectura, nada más.

## Qué hay

Cuatro documentos, cada uno en dos versiones:

| Archivo | Qué es | De dónde salen los campos |
| --- | --- | --- |
| `cedula-*.jpg` | Cédula de identidad personal | `CedulaSchema` |
| `ingresos-*.jpg` | Carta de trabajo con salario | `IngresosSchema` |
| `extracto-*.jpg` | Estado de cuenta de ahorros, 3 meses | `ExtractoSchema` |
| `examen-*.jpg` | Informe de laboratorio (vía B + LoRA) | `MARCADORES` / `esperado.examen` |

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

Cédula, ingresos y extracto validan contra `mobile/src/core/schemas.ts`. El
examen lista `lecturas` con código/nombre/valor/unidad como pide el LoRA
(`system-laboratorio.txt`); los rangos **no** van en el papel: los aplica
`clasificar()` en la app.

## Coherencia interna

El saldo promedio del extracto **se calcula** a partir de sus propios
movimientos, no se escribe a mano. Un extracto donde el promedio no cuadra con
sus saldos es lo primero que revisa alguien que sepa leerlo, y además el nodo lo
usa para bajar la tasa: el número tiene que ser cierto.

Los saldos también encadenan: cada uno es el anterior más el monto de la fila.

El salario de la carta (B/. 520 al mes) es el mismo que se usa en las corridas
del nodo, y los abonos del extracto son dos quincenas de B/. 260.

El examen es de la misma persona (Mariela Quiros, `8-912-2044`). Glicemia 168
y colesterol 218 salen fuera de rango a propósito, para que la vía B muestre
hallazgo y pueda ofrecer crédito.

## Cómo probar en el iPhone

Misma receta que la cédula: abrir `examen-nitido.jpg` a pantalla completa en el
Mac y fotografiarlo desde `PantallaExamen`, o imprimirlo. Anotar en
[`docs/PRUEBA-TELEFONO.md`](../../docs/PRUEBA-TELEFONO.md).

## Regenerar

```bash
python3 data/generar-documentos.py
```

Determinista por semilla: sale igual en cada corrida. Las imágenes están
commiteadas, así que esto solo hace falta si se cambian los datos.
