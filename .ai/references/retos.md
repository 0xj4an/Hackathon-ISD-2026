# Decentralized AI Hackathon · Retos corporativos (Dojo)

Fuente: pestaña "Tracks" en https://www.trydojo.io/hackathons/decentralized-ai-hackathon
Revisado: 8 de septiembre de 2026. Los 5 tracks ya están publicados (4 corporativos + el general), completados la noche del 8 sep.

## Track 01 · Philips · "Inteligencia de Base Instalada de Clientes" · 1,500 USDT

En una frase: convertir lo que un colaborador de campo observa en un hospital (cuántos resonadores, tomógrafos o ecógrafos tiene un cliente, de qué marca y qué tan antiguos parecen) en datos estructurados y confiables, con captura tan simple como una conversación y con la inferencia corriendo en el dispositivo.

### El problema
Ingenieros de servicio, vendedores y especialistas visitan hospitales y clínicas todos los días y ven el parque de equipos instalados. Hoy ese conocimiento queda en notas personales, conversaciones o memoria: capturarlo a mano toma tiempo, las descripciones son inconsistentes, varias personas reportan el mismo equipo y las observaciones suelen ser parciales. Resultado: la organización tiene poca visibilidad del panorama tecnológico real de sus clientes.

### Por qué en el dispositivo
El colaborador está dentro de un hospital, con frecuencia sin conectividad estable, y lo que ve es información sensible del cliente. Captura y extracción deben funcionar sin internet y sin enviar el contenido a un servicio externo.

### La misión
Después de una visita, el colaborador abre la app y dice o escribe algo como:

> "Estoy en Hospital DemoCare Pacific, en Panamá. Tienen tres resonadores y un tomógrafo. Uno de los resonadores parece de unos ocho años."

El prototipo debe interpretar el mensaje, extraer cliente, ciudad, país, modalidad, cantidad, marca, modelo y antigüedad cuando se conozcan, preguntar por lo que falta, y guardar la observación en un repositorio estructurado. Con el tiempo esas observaciones forman una vista viva de la base instalada por cliente y por geografía.

### Prototipo mínimo (lo que hay que tener sí o sí)
1. Captura en lenguaje natural de una observación.
2. Extracción con IA de la información estructurada del equipo, tolerando datos incompletos.
3. Almacenamiento en un dataset estructurado, con estado por observación: Confirmado, Reportado, Estimado o Desconocido.
4. Vista de base instalada a nivel de cliente.
5. Agregación o visualización básica entre varios clientes.

### Metas adicionales (diferenciadores)
- Dictado por voz al terminar la visita.
- Detección de duplicados entre observaciones.
- Puntaje de confianza según completitud, antigüedad y confirmaciones independientes.
- Alertas de información no verificada recientemente.
- Preguntas de seguimiento automáticas por el dato faltante más valioso.
- Consultas en lenguaje natural sobre el dataset ("clientes en Brasil con resonadores de más de siete años").
- Identificación de oportunidades de renovación.
- Captura asistida por foto de etiquetas o placas, sujeta a las capacidades del modelo de visión disponible.

### Requisito técnico obligatorio
QVAC con inferencia en el dispositivo o delegada P2P. Enviar la inferencia a una API en la nube no califica ni para el reto ni para el ranking general. ISD verifica esto antes de pasar las entregas a Philips. La interfaz (app móvil, escritorio, chatbot, asistente de voz) es libre.

### Mapeo a capacidades QVAC
- Captura por voz → `@qvac/transcription-whispercpp` o `@qvac/transcription-parakeet`.
- Extracción estructurada → LLM (`@qvac/llm-llamacpp`) con tool calling / salida JSON estructurada; loop de preguntas de seguimiento orquestado por el worker.
- Consultas en lenguaje natural y dedupe → `@qvac/embed-llamacpp` + RAG (`ragIngest` / `ragSearch`) sobre SQLite o LanceDB.
- Foto de placas → OCR / visión multimodal.
- Ángulo extra para Technical: teléfono en el hospital delega inferencia P2P a la laptop del ingeniero (thin client) cuando el modelo no cabe en el móvil.

### Nota
El texto del track en Dojo tiene fragmentos cortados y al final aparecen notas internas de edición del organizador (sobre cómo renderiza el componente). Conviene releerlo cuando publiquen los otros tres tracks por si lo corrigen.

## Track 02 · Tether · "QVAC Psy" · 1,500 USDT (publicado 8 sep, noche)

Objetivo: apps útiles y fiables basadas en los modelos especializados Psy de QVAC (MedPsy, VisionPsy, TranslatePsy), demostrando inteligencia de dominio de alta calidad, privada, en hardware edge. No excluyente con el ranking general.

Criterios de participación:
- Al menos un modelo Psy con función central en el flujo principal (no una sustitución estética del modelo). Enfocarse en hardware que se beneficie de modelos pequeños (teléfonos).
- Proyectos médicos: comunicar limitaciones, sin afirmaciones clínicas no respaldadas, con medidas de seguridad.
- `@qvac/sdk` para toda la inferencia y RAG. Experiencia principal local en hardware de consumo declarado; servicios remotos solo para funciones no-IA (sync opcional) y la app debe seguir siendo útil sin ellos.
- Divulgar todas las APIs remotas y componentes de terceros.
- **Código abierto bajo licencia permisiva aprobada** (esto es más estricto que el reglamento general, que no exige licencia abierta).
- Instrucciones de setup y especificaciones de hardware reproducibles. Nombres honestos de modelo, cuantización y hardware de ejecución.
- Entregar: video ≤ 5 min, **registro de rendimiento estructurado** (carga del modelo, prompts, conteo de tokens, TTFT, throughput), repo, y un flujo de usuario completo (no solo una llamada al SDK ni un benchmark).

Éxito: problema concreto de dominio que se beneficie de modelos muy pequeños; calidad de dominio medible; justificar por qué el Psy elegido es adecuado; fluidez en hardware edge realista; manejo responsable de riesgos, fallos e incertidumbre; evidencia reproducible.

## Track 03 · Desafío General · "Sovereign Intelligence at the Edge" · 6,000 USDT (podio 3,000 / 2,000 / 1,000)

Tema libre. IA que funcione donde la nube no llega, no debería llegar o cuesta demasiado. Espacios orientativos (ninguno obligatorio ni con premio propio): conectividad intermitente, datos sensibles que no pueden salir del dispositivo, trabajo en campo, accesibilidad, agentes locales que ejecutan acciones. SDK de QVAC, preferiblemente con modelos de QVAC. **Se valora adicionalmente el uso de Pears para comunicación o delegación de inferencia entre pares** (no obligatorio; una solución 100% on-device compite en igualdad). Video es lo primero que revisa el jurado. Rúbrica y desempate como el reglamento.

## Track 04 · Ovnicom · "Sentinel-DNS: inteligencia local sobre telemetría DNS" · 1,500 USDT

Contexto: Ovnicom opera red y datacenter para banca, gobierno y salud en Panamá, Colombia, Guatemala y El Salvador. Pipeline de telemetría DNS: BIND9 + dnstap → Vector + Kafka → ClickHouse → Grafana, con Wazuh como SIEM. Hoy sin IA y centralizado. El tráfico DNS revela hábitos; para clientes regulados nada puede salir del datacenter, ni a un proveedor de IA en la nube.

Qué construir: un agente sobre QVAC que se conecte como consumidor adicional del stream DNS y produzca dos salidas:
1. Seguridad: clasificación en tiempo real de dominios sospechosos (DGA, typosquatting, tunneling DNS, beaconing a C2) y alerta a Wazuh por webhook o API local.
2. Experiencia de cliente: score de calidad de experiencia por zona o punto de presencia (latencia de resolución, tasa NXDOMAIN, saturación), escrito en ClickHouse y visualizado en Grafana por sitio y zona.

Condiciones: inferencia íntegramente local (dispositivo o servidor local con QVAC); el agente lee del bus sin modificar el pipeline de producción; se admite combinar reglas con un modelo ligero; no se exige entrenar desde cero; datos sintéticos (DGA de listas públicas, tráfico normal simulado, latencias por zonas ficticias). Ovnicom entrega datos sintéticos en un SharePoint (enlace en Dojo).

Qué mira el jurado de Ovnicom: clasificación sobre el stream (no sobre archivo estático); alertas en formato que Wazuh procese; score interpretable por un operador de red; diseño que demuestre de forma verificable que ningún dato sale de la infraestructura.

## Track 05 · Caja de Ahorros · "Inteligencia local para la banca" · 1,500 USDT

Desafío abierto: cualquier solución de IA aplicable a banca sobre QVAC, con inferencia on-device o P2P, donde los datos del cliente no salgan del dispositivo ni de la infraestructura del banco. Direcciones orientativas (ninguna obligatoria): atención al cliente en celular o sucursal con conectividad limitada; inclusión financiera (educación, orientación, acceso a productos para poblaciones con conectividad intermitente, barreras de idioma o accesibilidad); documentos y trámites (lectura, clasificación y extracción en el dispositivo); operación interna (agentes locales para personal del banco: tareas repetitivas, procedimientos, información sensible); prevención de fraude sobre datos que no pueden salir del banco.

Requisitos: SDK de QVAC, preferiblemente sus modelos; nube solo para lo no-IA (UI, autenticación). Se valora Pears / delegación P2P (no obligatorio). Sin dataset: datos sintéticos o públicos, nunca datos reales de clientes de ninguna entidad financiera. Entregables generales. El jurado de Caja de Ahorros decide con criterios propios sobre entregas que pasen la verificación técnica de ISD; pondera aplicabilidad real en la operación del banco, aprovechamiento de la ejecución local como ventaja (no como restricción) y calidad de la demo.

## Lectura estratégica (8 sep, noche)

- Premios en juego: podio 6,000 (general) + 4 × 1,500 corporativos. Un mismo proyecto puede optar al general y a varios corporativos.
- Combos naturales:
  - **Philips + Tether Psy + General**: captura de base instalada por voz y foto de placas, con VisionPsy-Nano como modelo central para la lectura de placas (cumple "Psy con función central") y delegación P2P teléfono → laptop (suma en General y Technical). Exige licencia permisiva y log de rendimiento estructurado.
  - **Caja de Ahorros + Tether Psy + General**: extracción de documentos bancarios (cédula, recibos, formularios) con VisionPsy/OCR + asistente de trámites offline con TranslatePsy para idiomas indígenas o inglés. Reto abierto, jurado bancario, menos competencia directa que Philips.
  - **Ovnicom** va solo: dominio muy específico (Kafka, ClickHouse, Wazuh, Grafana), pesado de montar en 48 h, pero probablemente con muy pocos equipos compitiendo. Buen candidato si el equipo tiene perfil de redes/infra.
- Todos los retos valoran Pears / delegación P2P: la prueba `qvac-course/prep/p2p-test.mjs` (funciona en 0.18.2) es un activo transversal.
