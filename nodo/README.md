# Nodo · pueblo y banco HTTP

Transporte de la demo: **HTTP**. El motor de crédito vive en
`mobile/src/core/credito/`; este paquete solo lo importa.

Estado vivo y URLs: [`docs/ESTADO.md`](../docs/ESTADO.md).
Procedimiento de prueba: [`docs/PRUEBA-NODO.md`](../docs/PRUEBA-NODO.md).

```bash
npm install
npm run corregimiento   # pueblo LAN :8788 → reenvía a Railway
# npm run banco         # motor local :8787 (opcional)
```

P2P (Hyperswarm) está **apagado** salvo `ENABLE_P2P=1`. No es el camino de la demo.
Bonjour anuncia `_inaigar-pueblo._tcp`; la app descubre con sweep HTTP a `/salud`.
