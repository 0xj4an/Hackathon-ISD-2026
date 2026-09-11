# Probar los caminos: teléfono, pueblo, banco

Para `[A]`. Lo medido se dice medido. Lo que no se probó, lo dice.

Hay **dos destinos de crédito**, el mismo JSON, nunca fotos. El motor corre solo
en el banco remoto.

```
Con wifi (modo local-wifi):
  teléfono --HTTPS--> https://banco-production-3755.up.railway.app

Sin internet (local-offline / nodo-offline):
  teléfono --LAN :8788--> pueblo --HTTP--> el mismo banco
```

No confundir con el **examen de laboratorio** ni con la **inferencia**
(MedPsy local; si falla, POST texto a `/inferir`). Demo de crédito = HTTP.
P2P / Hyperswarm: § más abajo (off salvo `ENABLE_P2P=1`).

URLs de producción: [`ESTADO.md`](ESTADO.md).

---

## Al banco: Railway (directo)

```
POST <banco>/solicitud
-> caso demo típico: aprobada (asalariado, ingreso 520, monto 920, …)
```

URL: [`ESTADO.md`](ESTADO.md). Persistencia: `STATE_DIR` / meta `recibida`+`canal`.
Camino **directo** en iPhone (`local-wifi`): anotar en [`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).
Camino **pueblo**: medido abajo.

---

## Al pueblo: HTTP en la LAN, medido

Probado el 9 de septiembre y **vuelto a probar el 10** (laptop y **iPhone**).
Hoy el pueblo no decide: recibe y reenvía. Arranque:

```bash
cd nodo && npm run corregimiento
# HTTP en :8788, BANCO_URL ya apunta a Railway
ipconfig getifaddr en0        # solo para saber la IP; la app la toma sola de Metro
```

Teléfono y laptop **en el mismo wifi**. Arranca el pueblo (`npm run corregimiento`).
La app **busca sola** en la LAN un `:8788/salud` con `servicio: inaigar-pueblo`
(también prueba la IP de Metro si Expo va en LAN). El nodo además **publica**
Bonjour `_inaigar-pueblo._tcp`; la app **aún no lo consume** (solo HTTP).
Cambiar de WiFi no pide rebuild ni pegar IP: misma red y nodo corriendo.

En Entrada → *Solo para demostración* → **Pueblo** puedes **Buscar WiFi** o
pegar una IP a mano (override).

Desde el navegador del teléfono: `http://<IP>:8788/respuesta/loquesea` debe
responder `{"decision":"pendiente"}`. Si no carga, el problema es la red.

Luego `POST http://<IP>:8788/solicitud` con una `SolicitudSchema` válida. El
pueblo responde `pendiente` si el banco aún no contestó, o la decisión si ya
la trajo. `ROL=banco` en `:8787` es solo para correr el motor en la laptop;
en la demo el banco es Railway.

**Qué anotar:** si respondió, cuánto tardó, y qué decisión devolvió.

---

## Hyperswarm / P2P

**No es la demo.** Off salvo `ENABLE_P2P=1`. El fallo medido (DHT pública,
`firewalled: true`, topic que no casa) se arregla con un bootstrap local:

```bash
cd nodo && npm run p2p:probar
# Medido 10 sep: OK en ~1.2 s. bootstrap 192.168.0.19:49737, firewalled=false.
```

Dos laptops: `npm run p2p:bootstrap -- --host <IP-LAN>` y
`ENABLE_P2P=1 P2P_BOOTSTRAP=<IP>:49737` en cada nodo.

El teléfono no usa topic. En modo **nodo-offline** intenta QVAC `delegate`
si hay llave (`dht.connect`). Si no entra en 90 s, POST `/inferir`.

### Ensayo (laptop + iPhone)

Misma WiFi. Tres terminales:

```bash
# 1. pueblo (sigue siendo el plano B HTTP)
cd nodo && npm run corregimiento

# 2. par QVAC — deja esta terminal abierta; imprime `clave:`
cd spikes && npm run proveedor

# 3. (opcional, sin teléfono) ¿delegate vive?
cd spikes && npm run consumidor -- --proveedor <la-clave>
```

En el iPhone (Metro recargado):

1. Entrada → *Solo para demostración* → modo **Delegar al nodo**.
2. **Buscar WiFi**. Si el proveedor ya anunció, `/salud` trae la llave
   (`par P2P` en “Probar”). Si no, pégala a mano (64 hex).
3. Caso diabetes → Entrar → revisión → alerta.
4. Primera vez: espera **15–45 s** (“Buscando par P2P…”). Luego sub-segundo.
5. Consola del pueblo (`:8788/consola`) o LOG de la app: `→ delegate …`.
   Si dice `delegate falló → HTTP /inferir`, el plano B cubrió.

El proveedor tiene que tener MedPsy en caché (`~/.qvac`). La primera carga
en frío del modelo en la laptop no es instantánea.

No nombrarlo en el video si no corrió en cámara: [`VIDEO.md`](VIDEO.md).

---

## Cómo se cuenta en el video

Misma regla que [`VIDEO.md`](VIDEO.md): decir HTTP (banco o pueblo), no
“Hyperswarm P2P” ni “delegate” si no corrió eso.

---

## Inferencia: teléfono, luego pueblo

El OCR nunca sale. MedPsy sí puede pedir ayuda: `completarMedPsy` carga el
modelo en el iPhone; si falla, POST `{ system, user }` a `http://<pueblo>:8788/inferir`.
La primera carga en la laptop tarda (~90 s). Las fotos no van en ese cuerpo.

```bash
curl -s http://127.0.0.1:8788/salud
# { ok, rol: "corregimiento", inferir: true }
```

## C7: el esquema ya cierra

El 10 de septiembre `SolicitudSchema` dejaba pasar `motivo_de_salud` y
`foto_cedula_b64`. Eso ya no: el schema es `.strict()` y `aceptar()` parsea
antes de escribir. Un POST con esos campos extra responde 400.

---

## Medido 10 sep · iPhone → pueblo → Railway

Misma WiFi. Nodo `corregimiento` en laptop. App descubrió `:8788` (sin IP
fija). Cliente visto en logs: `192.168.0.17`.

| Monto | Decisión | Notas |
| --- | --- | --- |
| 90 | aprobada | POST `/solicitud` vía pueblo |
| 812 | aprobada | idem |
| 920 | aprobada | caso demo asalariado |

Admin del banco muestra `recibida` + canal `pueblo`. Detalle de UI en
[`PRUEBA-TELEFONO.md`](PRUEBA-TELEFONO.md).

---

## Pendiente de verificar

- [ ] Envío **directo** al banco en el iPhone (modo `local-wifi`, sin pueblo).
- [x] Envío al pueblo en el iPhone: LAN, POST `:8788` → Railway (10 sep).
- [ ] Inferencia: MedPsy local; si el teléfono no puede, POST `/inferir` (texto).
- [ ] Cola en SQLite (`colaSqlite.ts`). Cierra `C8` y `C9` en el aparato.
