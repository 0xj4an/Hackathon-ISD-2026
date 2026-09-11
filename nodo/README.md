# Nodo · pueblo y banco HTTP

**Crédito** viaja por HTTP. **Inferencia** `nodo-offline`: QVAC `delegate`,
plano B `POST /inferir`. El motor de crédito vive en `mobile/src/core/credito/`;
este paquete solo lo importa.

Estado vivo y URLs: [`docs/ESTADO.md`](../docs/ESTADO.md).
Procedimiento de prueba: [`docs/PRUEBA-NODO.md`](../docs/PRUEBA-NODO.md).

```bash
npm install
npm run corregimiento   # pueblo LAN :8788 → reenvía a Railway
# npm run banco         # motor local :8787 (opcional)
```

Consola para grabar (laptop): con el pueblo arriba, abre
[http://127.0.0.1:8788/consola](http://127.0.0.1:8788/consola).
El celular espeja sus líneas LOG ahí (misma WiFi).

P2P (Hyperswarm) está **apagado** salvo `ENABLE_P2P=1`. No es el camino de la demo.
Con `ENABLE_P2P=1` el swarm usa DHT `firewalled: false` y un bootstrap de LAN
(IPv4 real; hyperdht rechaza `0.0.0.0`). Hyperswarm solo reconsulta el topic
cada 10 min: el nodo refresca cada 2 s.

```bash
cd nodo && npm run p2p:probar   # dos procesos en este Mac; debe decir OK
# dos laptops:
cd nodo && npm run p2p:bootstrap              # imprime P2P_BOOTSTRAP=192.168.x.x:49737
ENABLE_P2P=1 P2P_BOOTSTRAP=192.168.x.x:49737 npm run corregimiento
```

La vía del teléfono no es topic: es QVAC `delegate` (`dht.connect(llave)`).
Eso sí conecta al instante una vez conocida la clave. Laptop:

```bash
cd spikes && npm run proveedor   # imprime la clave pública
```

En Metro: `EXPO_PUBLIC_P2P_PROVEEDOR=<clave>`. Solo aplica en modo **nodo-offline**;
si el DHT no responde en 90 s, sigue el HTTP `/inferir`.

Bonjour anuncia `_inaigar-pueblo._tcp`; la app descubre con sweep HTTP a `/salud`.
