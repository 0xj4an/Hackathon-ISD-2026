# Validación de idea · MVP hackathon

Clasificación: `architectural` (sistema nuevo).

## Hipótesis

Un proyecto que encadene 2 o 3 capacidades de QVAC (voz + LLM + RAG, o visión + LLM) y demuestre delegación P2P real teléfono → laptop, aplicado a un problema donde la IA local es la única opción razonable (datos sensibles o sin conectividad), gana más puntos en Technical + Innovation (60%) que un chatbot offline pulido.

## Candidatos

| # | Idea | Retos a los que aplica | Capacidades QVAC | Riesgo principal |
| --- | --- | --- | --- | --- |
| A | Captura de base instalada hospitalaria por voz/foto (ingeniero de campo dicta lo que vio, la app extrae JSON estructurado, dedupe, vista por cliente) | Philips + Tether Psy (VisionPsy para placas) + General | Whisper → LLM tool calling → RAG/SQLite; VisionPsy/OCR; P2P móvil → laptop | Vision en móvil; dataset sintético de equipos |
| B | Pre-diagnóstico médico local (Artur): resultados de laboratorio + datos de wearable → estimación de riesgo, con MedPsy como modelo central y posible LoRA | Tether Psy + General | MedPsy, RAG, LoRA edge, opcional Whisper | Claims clínicos; requiere disclaimers y validación de dominio; scope amplio |
| C | Asistente bancario offline: extracción de documentos (cédula, recibos) + guía de trámites, con TranslatePsy para idioma | Caja de Ahorros + Tether Psy + General | VisionPsy/OCR, LLM, TranslatePsy, RAG | Reto abierto, menos definido; jurado bancario |

## Usuario y problema

Persona en zona rural de Panamá con teléfono Android de gama media y señal intermitente, sin medicina prepagada. Problema doble: no sabe cuándo conviene hacerse un examen ni cómo pagarlo; y para pedir crédito debe entregar cédula y extractos físicos a asesores (riesgo de fraude y fuga de datos).

## Experimento mínimo

Elegir candidato con Artur. Criterio: el que permita una demo funcional end-to-end dejando margen para video, README y log de rendimiento.

## Métrica y umbral de decisión

- Demo funcional completa (Completion) es condición de entrada.
- Al menos 2 capacidades QVAC encadenadas + 1 modelo Psy con rol central (para optar a Tether Psy).
- Delegación P2P demostrable en video, aunque sea en la misma LAN.

## Evidencia

Ver `references/baseline.md` (lo que ya funciona en la máquina) y `references/retos.md`.

## Decisión

Se construye una variante de B + C: **alerta de salud local → solicitud de crédito de salud con documentos leídos en el dispositivo → cola offline → envío por P2P/red al banco → respuesta y firma**, para usuarios rurales con conectividad intermitente. Retos: General + Tether Psy + Caja de Ahorros. Se descartan A (Philips) y la versión "urbana" de B (Tether ya la cubre con su app QVAC Health). Detalle en `docs/BRIEF.md`.
