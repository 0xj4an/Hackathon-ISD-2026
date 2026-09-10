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

No confundir con el **examen de laboratorio** (opción tras el resultado del
historial) ni con la **inferencia**: MedPsy en el teléfono; si no carga, POST de
texto a `:8788/inferir`. Eso no es el envío del crédito. QVAC `delegate`
no es el plan: no atraviesa NAT.

El objetivo de la escena sin señal es el envío al pueblo: el teléfono le habla a la
laptop **sin internet y sin nube**. HTTP en la LAN está medido. Hyperswarm entre
dos procesos del mismo Mac **no ha conectado nunca**.

---

## Al banco: el teléfono habla con Railway

Con wifi o datos, `enviarSolicitud` hace POST a `urlBanco()` (Railway). El pueblo
no entra. Comprobarlo sin el teléfono:

```
POST https://banco-production-3755.up.railway.app/solicitud
-> aprobada, 12 meses, 17.4% anual, cuota 84.08
   (caso demo: asalariado, ingreso 520, deudas 40, monto 920, sin extracto)
```

Si hay extracto, el grado baja la tasa (alrededor de 10.6%).

En el iPhone esto **aún no está verificado**. El código ya intenta A (8 s) y si
no hay respuesta final, cae a B.

---

## Al pueblo: HTTP en la LAN, medido

Probado el 9 de septiembre y **vuelto a probar el 10**. Hoy el pueblo no decide:
recibe y reenvía. Arranque:

```bash
cd nodo && npm run corregimiento
# HTTP en :8788, BANCO_URL ya apunta a Railway
ipconfig getifaddr en0        # solo para saber la IP; la app la toma sola de Metro
```

Teléfono y laptop **en el mismo wifi**. Arranca el pueblo (`npm run corregimiento`).
La app **busca sola** en la LAN un `:8788/salud` con `servicio: inaigar-pueblo`
(también prueba la IP de Metro si Expo va en LAN). Cambiar de WiFi no pide rebuild
ni pegar IP: solo que ambos estén en la misma red y el nodo corriendo.

En Entrada → *Solo para demostración* → **Pueblo** puedes **Buscar WiFi** o
pegar una IP a mano (override). El nodo además se anuncia por Bonjour
`_inaigar-pueblo._tcp`.

Desde el navegador del teléfono: `http://<IP>:8788/respuesta/loquesea` debe
responder `{"decision":"pendiente"}`. Si no carga, el problema es la red.

Luego `POST http://<IP>:8788/solicitud` con una `SolicitudSchema` válida. El
pueblo responde `pendiente` si el banco aún no contestó, o la decisión si ya
la trajo. `ROL=banco` en `:8787` es solo para correr el motor en la laptop;
en la demo el banco es Railway.

**Qué anotar:** si respondió, cuánto tardó, y qué decisión devolvió.

---

## Hyperswarm entre dos procesos del mismo Mac: NO conecta

(Documentado abajo.) Railway pone `SKIP_P2P=1` y ni lo intenta. En laptop,
`npm run corregimiento` **sí** intenta Hyperswarm salvo que pongas
`SKIP_P2P=1` — el teléfono no usa ese camino; la demo es HTTP.

Cero conexiones tras dos minutos, con el código de `nodo/` y también con una
prueba mínima de dos peers y un topic aislado.

**La causa, medida:** `hyperdht` arranca y llega a la red (61 nodos conocidos),
pero reporta **`firewalled: true`**. El nodo está detrás de NAT y no acepta
entrantes. Dos peers detrás del mismo NAT necesitan *hairpinning*, y muchos
routers no lo hacen. El firewall de macOS estaba apagado.

**Síntoma adicional, visto el 10 de septiembre:** al arrancar, la línea
`esperando peers` **no aparece en los primeros 2 segundos**. Esa línea iba
después de `await swarm.join(...).flushed()`, así que el `flushed()` se queda
esperando. El HTTP ya está escuchando. En Railway el banco arranca con
`SKIP_P2P=1` y ni lo intenta.

Esto **no es el camino de la demo**. HTTP (A a Railway, B por LAN) es el que vale.

### Si alguien insiste en probar Hyperswarm

Laptop: `cd nodo && npm run banco` (local, sin SKIP_P2P). Esperar 3 minutos.
¿Salió `peer conectado`? Si no, parar. `hyperswarm` 4.17.1 no trae descubrimiento
en LAN: dos aparatos en el mismo wifi igual salen por la DHT pública.

Queda `swarmRelays` con relay propio. Los docs de QVAC lo mencionan y **no
documentan cómo desplegarlo**. No es un plan.

---

## Cómo se cuenta en el video

- Banco: **"con wifi, el teléfono habla directo con el banco"**.
- Pueblo: **"sin internet, los aparatos se hablan en la red local y el pueblo
  se lo lleva al banco"**.
- Decirle **"Hyperswarm P2P"** a un POST HTTP no lo sería.
- Tampoco **"delegate"** si el respaldo fue `POST /inferir`.

Lo que se afirme en el video tiene que ser lo que corrió en el video.

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

## Pendiente de verificar

- [ ] Envío al banco en el iPhone: wifi encendido, POST a Railway, decisión en pantalla.
- [ ] Envío al pueblo en el iPhone: wifi apagado / solo LAN, POST al pueblo `:8788`.
- [ ] Inferencia: MedPsy local; si el teléfono no puede, POST `/inferir` (texto).
- [ ] Cola en SQLite (`colaSqlite.ts`). Cierra `C8` y `C9` en el aparato.
