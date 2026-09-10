# Datos sintéticos
- `mediciones/`: historial de **dos** usuarios ficticios, uno sano y uno con hallazgo (generado por script).
  El sano no debe disparar ninguna señal: esa mitad de la demo vale tanto como la otra.
  Variables, con los tipos de Health Connect que las originarían: glucosa en ayunas
  (`BloodGlucoseRecord`), presión sistólica y diastólica (`BloodPressureRecord`), pulso en
  reposo (`RestingHeartRateRecord`), saturación de oxígeno (`OxygenSaturationRecord`),
  frecuencia respiratoria (`RespiratoryRateRecord`), temperatura (`BodyTemperatureRecord`),
  peso (`WeightRecord`) y estatura (`HeightRecord`).
  Umbrales y señales: [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md).
- `documentos/`: cédula, comprobante de ingresos y extracto **ficticios** (generados como imagen para probar OCR). Nunca documentos reales.
- `private/` (ignorado por git): fotos propias de prueba, si se usan.
