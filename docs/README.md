# Documentación · Ina Igar

Una afirmación operativa vive **en un solo sitio**. El resto solo enlaza.
Ante duda: **código** + esta tabla. Kit (`standards/`, `templates/`) = boilerplate
heredado; no es ops del hackathon.

## Dónde manda (fuentes de verdad)

| Tema | Archivo |
|---|---|
| Estado vivo, URLs Railway, qué falta | [`ESTADO.md`](ESTADO.md) |
| Ítems abiertos / criterios | [`CHECKLIST.md`](CHECKLIST.md) |
| Narrativa y flujo de producto | [`BRIEF.md`](BRIEF.md) |
| Decisiones irreversibles | [`.ai/adr/`](../.ai/adr/) (`ADR-001` reemplazada por `013`) |
| Evidencia iPhone | [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md) |
| Sentry · releases y prefijos | [`SENTRY.md`](SENTRY.md) |
| Evidencia HTTP LAN / banco | [`PRUEBA-NODO.md`](PRUEBA-NODO.md) |
| Ensayo previo al video (avión) | [`DEMO-OBJETIVO-1.md`](DEMO-OBJETIVO-1.md) |
| Guion del video | [`VIDEO.md`](VIDEO.md) |
| Eval de dominio (generado) | [`../eval/resultados.md`](../eval/resultados.md) |
| LoRA / lab | [`../spikes/lora-medpsy/RESULTADOS.md`](../spikes/lora-medpsy/RESULTADOS.md) |
| Reglas del hackathon | [`.ai/references/hackathon.md`](../.ai/references/hackathon.md) |
| Modos de demo | [`ADR-006`](../.ai/adr/ADR-006-tres-modos-segun-el-telefono.md) |
| Modelo de crédito | [`ADR-011`](../.ai/adr/ADR-011-el-modelo-de-credito.md) |
| Señales de salud | [`ADR-008`](../.ai/adr/ADR-008-que-variables-vigilamos.md) |
| SDK | [`ADR-013`](../.ai/adr/ADR-013-quedarnos-en-sdk-0.18.2.md) |

Entrada pública: [`../README.md`](../README.md). Contexto para agentes: [`.ai/CONTEXT.md`](../.ai/CONTEXT.md).

## Lectura corta

1. [`ESTADO.md`](ESTADO.md) — qué está medido hoy.
2. [`BRIEF.md`](BRIEF.md) — qué es el producto.
3. [`CHECKLIST.md`](CHECKLIST.md) — qué falta cerrar.
4. ADRs si vas a cambiar una decisión.

## Histórico (no ops)

Marcado con banner al inicio. No actualizar como verdad viva:

- [`.ai/runs/mvp-hackathon/`](../.ai/runs/mvp-hackathon/) — idea, stack y spec iniciales.
- [`.ai/references/baseline.md`](../.ai/references/baseline.md) — línea base temprana; ver ESTADO.
- `docs/_archive/` — kit + superpowers agosto (no ops).
- `superpowers/plans/` de septiembre — **stubs** (plan ejecutado; detalle en git / specs).
- [`intro.html`](intro.html) — stub; guion = [`VIDEO.md`](VIDEO.md).
- `design/*.dc.html` — exports; dirección = `ADR-012` + código. Ver [`design/README.md`](design/README.md).
- [`demo-vias.html`](demo-vias.html) — mapa visual único; narrativa = BRIEF.
