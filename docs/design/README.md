# Diseño · Ina Igar

Dirección visual: [`ADR-012`](../../.ai/adr/ADR-012-senaletica-y-el-modo-denso.md) + tokens en `mobile/src/ui/`.

- `*.dc.html` — lienzos por pantalla (referencia).
- `marca/` — **canónico** de iconos, splash, wordmark, huellas.
- `ina-igar-diseno-app.html` / `comparar-direcciones.html` / `renders/` — regenerables, **gitignored**. No abrir el canvas 2.5 MB en agentes.

Landing y app copian desde `marca/` cuando hace falta (ver `scripts/sync-marca.sh`).
