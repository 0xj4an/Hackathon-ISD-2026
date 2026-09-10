# Flujo, modos y alineación del producto

**Fecha:** 2026-09-10  
**Estado:** aprobado en brainstorming; pendiente de plan de implementación  
**Alcance:** alinear código, UI, docs y guion al tronco real del producto y a la capa de ejecución (inferencia × red).

## Problema

El proyecto mezcla tres vocabularios con las mismas letras (vía A/B de salud, escenario A/B/C, camino A/B de crédito). La Entrada trata historial y examen como vías paralelas. El examen no abre crédito aunque haya hallazgos. Docs y comentarios hablan de wifi/P2P/delegate de formas que no coinciden con lo que corre en la app.

## Decisión de vocabulario

| Concepto | Nombre oficial | Valores |
| --- | --- | --- |
| Resultado del historial | **resultado** | `alerta` \| `en_orden` |
| Foto de laboratorio | **examen** | opción desde el resultado (siempre) |
| Capacidad × red | **modo** | `local-wifi` \| `local-offline` \| `nodo-offline` |
| Destino del JSON de crédito | **envío** | `banco` \| `pueblo` \| `pendiente` |

Prohibido en UI y docs de producto: “vía A/B”, “camino A/B”, “escenario A/B/C” como nombres de usuario. En código se renombra `escenario.ts` hacia `modo` (o se dejan aliases internos documentados una sola vez).

## Capa 1 — Tronco de producto

```
Entrada (modo + caso)
  → Salud → Revisión
  → Resultado del historial
       ├─ alerta → ruta → costo → pedir crédito y/o subir examen
       └─ en_orden → sin crédito del historial; igual puede subir examen
  → Examen (si eligió)
       ├─ fuera de rango → ofrecer crédito → docs → cuota → envío
       └─ en rango → listo
```

Reglas:

1. El historial **siempre** se lee. No hay atajo de Entrada que salte a examen como vía paralela.
2. Tras el resultado (con o sin alerta) siempre hay opción de subir examen.
3. El crédito nace si hay algo que atender: paquete del historial **o** paquete derivado del lab.
4. El banco nunca recibe fotos ni el motivo clínico.

### Entrada

- Quitar el selector Historial | Examen.
- Conservar: modo (3 opciones) + caso clínico + correo.

### Pantallas tocadas

- `PantallaEntrada` — sin vías paralelas; copy de modos con nombres nuevos.
- `PantallaAlerta` / `Sano` — ambos mantienen “Tengo un examen…”.
- `PantallaExamen` — si hay hallazgos fuera de rango: costo + “Pedir crédito”; si no, solo leer otro / volver.
- `App.tsx` — `onPedirCredito` también desde Examen; eliminar `pendienteExamen` / `viaSalud` como ruta de entrada.

## Capa 2 — Modos de ejecución

| Modo | Inferencia | Envío del crédito |
| --- | --- | --- |
| `local-wifi` | MedPsy en el teléfono | Intenta **banco**; si no hay respuesta final → **pueblo** → **pendiente** |
| `local-offline` | MedPsy en el teléfono | No intenta banco; **pueblo** o **pendiente** |
| `nodo-offline` | Texto a `POST /inferir` en el pueblo (OCR siempre local) | **pueblo** o **pendiente** |

Reglas duras:

- Las fotos no salen del teléfono.
- “Delegada” significa HTTP LAN al nodo (`/inferir`), **no** QVAC `delegate`.
- Hyperswarm P2P es solo nodo↔nodo; en Railway va `SKIP_P2P=1`; el teléfono no usa Hyperswarm.
- Video y README no prometen Hyperswarm ni `delegate`.
- Los modos siguen siendo interruptor de demo (como el flag actual). NetInfo real queda fuera del alcance de este spec.

### Mapeo desde el código actual

| Hoy | Nuevo |
| --- | --- |
| escenario `A` | `local-wifi` |
| escenario `B` | `local-offline` |
| escenario `C` | `nodo-offline` |
| `sinWifiDemo()` | modos `*-offline` |
| `saltarMedPsyLocal()` | modo `nodo-offline` |
| camino A / B en `envio.ts` | envío `banco` / `pueblo` (API de retorno y logs) |

## Crédito tras examen

Nueva función `armarPaqueteDesdeLab(lecturas: LecturaLab[]): Paquete | null` en `core/paquete.ts`:

- Si no hay lecturas fuera de rango → `null` (sin crédito).
- Glicemia alta → paquete `GLU_ALTA` (o `GLU_LIMITE` según umbral).
- Glicemia baja → `GLU_BAJA` / `GLU_MUY_BAJA`.
- Otros marcadores fuera de rango (HB, COL, TSH, …) → paquete corto de seguimiento (consulta + control), sin diagnosticar enfermedad.
- Varios hallazgos: misma prioridad que `armarPaquete` del historial.

Después: misma tubería Documentos → Leído → Cuota → `enviarSolicitud` (respetando el modo).

## Fuera de alcance

- NetInfo / detección real de red.
- Hacer andar Hyperswarm o QVAC `delegate` en la demo.
- Modo `local-wifi` con NetInfo automático.
- ADR-006 modos Q4_0 / RAM automática (sigue abierto; no bloquea esta alineación).
- Verificar OCR/envío en iPhone (sigue en CHECKLIST; este spec no lo sustituye).

## Docs a actualizar (mismo cambio de verdad)

- `docs/BRIEF.md`, `docs/CHECKLIST.md`, `docs/VIDEO.md`
- `docs/PRUEBA-NODO.md`, `docs/PRUEBA-TELEFONO.md`, `docs/demo-vias.html`
- `README.md` (vocabulario de modos/envío; D11 cerrado: no P2P en demo)
- Comentarios en `App.tsx`, `envio.ts`, `escenario.ts` (o archivo renombrado)

## Criterios de aceptación

1. Entrada no ofrece Historial|Examen; el historial siempre corre hasta Resultado.
2. Desde alerta y desde “en orden” se puede abrir examen.
3. Con lecturas de lab fuera de rango aparece pedir crédito y el monto viene de `armarPaqueteDesdeLab`.
4. Con lab en rango no aparece crédito.
5. Los tres modos cambian inferencia y destino de envío como la tabla.
6. Ningún doc de producto promete Hyperswarm P2P ni QVAC `delegate` como camino de la demo.
7. Cero imágenes en POST de crédito o `/inferir`.

## Riesgos

- Mapeo lab → paquete incompleto para marcadores raros: mitigar con paquete corto genérico.
- Renombrar demasiado el código de una vez: preferir aliases (`ModoId = "local-wifi" | …`) y actualizar UI/docs en el mismo PR; borrar letras A/B/C de la UI primero.
