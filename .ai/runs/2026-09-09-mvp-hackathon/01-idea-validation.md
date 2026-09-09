# Validación de idea · MVP hackathon

Clasificación: `architectural` (sistema nuevo). Ventana: 9 sep 08:00 → 11 sep 08:00 (Panamá).

## Hipótesis

Un proyecto que encadene 2–3 capacidades de QVAC (voz + LLM + RAG, o visión + LLM) y demuestre delegación P2P real teléfono → laptop, aplicado a un problema donde la IA local es la única opción razonable (datos sensibles o sin conectividad), gana más puntos en Technical + Innovation (60%) que un chatbot offline pulido.

## Candidatos

| # | Idea | Retos a los que aplica | Capacidades QVAC | Riesgo principal |
| --- | --- | --- | --- | --- |
| A | Captura de base instalada hospitalaria por voz/foto (ingeniero de campo dicta lo que vio, la app extrae JSON estructurado, dedupe, vista por cliente) | Philips + Tether Psy (VisionPsy para placas) + General | Whisper → LLM tool calling → RAG/SQLite; VisionPsy/OCR; P2P móvil → laptop | Vision en móvil; dataset sintético de equipos |
| B | Pre-diagnóstico médico local (Artur): resultados de laboratorio + datos de wearable → estimación de riesgo, con MedPsy como modelo central y posible LoRA | Tether Psy + General | MedPsy, RAG, LoRA edge, opcional Whisper | Claims clínicos; requiere disclaimers y validación de dominio; scope amplio |
| C | Asistente bancario offline: extracción de documentos (cédula, recibos) + guía de trámites, con TranslatePsy para idioma | Caja de Ahorros + Tether Psy + General | VisionPsy/OCR, LLM, TranslatePsy, RAG | Reto abierto, menos definido; jurado bancario |

## Usuario y problema

Por definir según el candidato elegido.

## Experimento mínimo

Antes de las 12:00 del 9 sep: elegir candidato con Artur. Criterio: el que permita una demo funcional end-to-end en < 36 h dejando 12 h para video, README y log de rendimiento.

## Métrica y umbral de decisión

- Demo funcional completa (Completion) es condición de entrada.
- Al menos 2 capacidades QVAC encadenadas + 1 modelo Psy con rol central (para optar a Tether Psy).
- Delegación P2P demostrable en video, aunque sea en la misma LAN.

## Evidencia

Ver `references/baseline.md` (lo que ya funciona en la máquina) y `references/retos.md`.

## Decisión

Pendiente.
