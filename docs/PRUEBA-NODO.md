# Probar el nodo: teléfono contra laptop

Para `[A]`. Todo lo de aquí está medido, no recordado. Lo que no se probó dice
que no se probó.

El objetivo de la demo es que el teléfono le hable a la laptop **sin internet y
sin nube**. Hay dos transportes escritos. Uno está probado y funciona. El otro
no ha conectado nunca, y aquí está por qué.

---

## Lo que ya sabemos

### HTTP en la LAN: funciona

Probado el 9 de septiembre y **vuelto a probar el 10** con los montos nuevos del
paquete anual. El nodo con rol `banco` recibe una solicitud y devuelve una
decisión correcta.

```
POST http://192.168.0.19:8787/solicitud   (monto 920, ingreso 520, con extracto)
-> aprobada 920, 12 meses, 9.5% anual, cuota 80.67
GET  http://192.168.0.19:8787/respuesta/<id>
-> la misma respuesta, leída del disco
```

La tasa baja de 12.5% a 9.5% porque la solicitud trae extracto bancario. La
política de `nodo/credito.mjs` hace lo que dice.

### Hyperswarm entre dos procesos del mismo Mac: NO conecta

Cero conexiones tras dos minutos, con el código de `nodo/` y también con una
prueba mínima de dos peers y un topic aislado.

**La causa, medida:** `hyperdht` arranca y llega a la red (61 nodos conocidos, o
sea que el UDP sale), pero reporta **`firewalled: true`**. El nodo está detrás de
NAT y no acepta entrantes. Dos peers detrás del mismo NAT necesitan que el router
haga *hairpinning*, y muchos no lo hacen. El firewall de macOS estaba apagado,
así que no era eso.

**Síntoma adicional, visto el 10 de septiembre:** al arrancar el nodo, la línea
`rol=banco topic=... esperando peers` **no aparece en los primeros 2 segundos**.
Esa línea va después de `await swarm.join(...).flushed()`, así que el `flushed()`
se queda esperando. El HTTP ya está escuchando para entonces. Si al arrancar solo
se ve `HTTP en :8787` y nada más, es esto, no es que se colgó.

### Lo que esto NO implica

El caso de la demo son **dos aparatos distintos**, teléfono y laptop. Eso no se
ha probado y no se puede probar sin el teléfono.

Dato en contra antes de gastar tiempo: `hyperswarm` 4.17.1 **no trae
descubrimiento en LAN**, ni mDNS ni multicast. Dos aparatos en el mismo wifi
igual salen por la DHT pública y dependen del mismo *hole punching* que falló
arriba. Puede fallar por la misma razón.

---

## Procedimiento

### 0. Antes de nada

```bash
cd nodo && npm install
ipconfig getifaddr en0        # la IP de la laptop en el wifi. Hoy: 192.168.0.19
```

El teléfono y la laptop **en el mismo wifi**. Si la red es de un café o un hotel
con *client isolation*, ningún transporte va a funcionar y no es culpa del
código: probar con el hotspot del teléfono, que además es el escenario real de
la demo.

### 1. HTTP, que es el que funciona

Laptop:

```bash
cd nodo && ROL=banco node index.mjs
# espera: "HTTP en :8787"
```

Desde el teléfono, primero el navegador, que descarta la red antes de tocar la
app: abrir `http://<IP-de-la-laptop>:8787/respuesta/loquesea`. Debe responder
`{"decision":"pendiente"}`. Si eso no carga, el problema es la red, no la app.

Luego desde la app, `POST` a `http://<IP>:8787/solicitud` con una
`SolicitudSchema` válida.

**Qué anotar:** si respondió, cuánto tardó, y qué decisión devolvió.

### 2. Hyperswarm, que es el que hay que averiguar

Laptop:

```bash
cd nodo && ROL=banco node index.mjs
```

Teléfono, con el rol `corregimiento` desde la app.

Los dos usan el mismo `TOPIC_NAME`, así que se descubren solos si la red deja.

**Esperar 3 minutos, no 30 segundos.** El *hole punching* tarda.

**Qué anotar, en este orden:**

1. ¿Salió `esperando peers` en la laptop? Si no salió, `flushed()` no resolvió y
   el swarm nunca llegó a anunciarse. Eso ya es el resultado.
2. ¿Salió `peer conectado <id>`? Esa línea es la única prueba de que conectó.
3. Si no conectó en 3 minutos, **parar**. No vale la pena insistir: sabemos por
   qué falla y hay un plan que no depende de esto.

### 3. Si Hyperswarm falla

No es un bloqueo. HTTP en la LAN ya está escrito y probado, y cumple lo que pide
el reglamento: el teléfono le pega a la IP local de la laptop, sin internet y sin
nube.

Queda una opción más, sin explorar: `swarmRelays` con relay propio. Los docs de
QVAC lo mencionan pero **no documentan cómo desplegarlo**, así que es una
apuesta, no un plan. Solo si sobra tiempo.

---

## Cómo se cuenta en el video

Esto importa tanto como que funcione.

- Si la demo sale por HTTP en la LAN, se dice **"los aparatos se hablan directo,
  sin internet"**. Es exacto.
- Decirle **"Hyperswarm P2P"** a algo que salió por HTTP no lo sería, y es el
  tipo de cosa que un jurado técnico pregunta.

Lo que se afirme en el video tiene que ser lo que corrió en el video.

---

## C7 tiene un hueco, y es de una palabra

`C7` dice que ningún dato clínico sale del teléfono, y que se comprueba viendo
que el nodo recibe **solo** `SolicitudSchema`. Se probó el 10 de septiembre y el
esquema **no lo garantiza**:

```
la solicitud que mande valida:  si
la respuesta del nodo valida:   si
con campos de mas el esquema:   LOS DEJA PASAR
```

Se le metieron a la solicitud dos campos que jamás deberían viajar,
`motivo_de_salud: "diabetes tipo 2"` y `foto_cedula_b64`, y **`SolicitudSchema`
los aceptó sin queja**. Por defecto `zod` ignora las claves que sobran en vez de
rechazarlas.

Encima, el handler HTTP del nodo hace `JSON.parse` y **no valida nada**: escribe
a disco lo que le llegue, campos de más incluidos.

Son dos arreglos chicos y uno es literal una palabra:

1. `SolicitudSchema` cerrado con `.strict()`, para que rechace lo que sobra en
   vez de dejarlo pasar callado.
2. El handler del nodo pasando el cuerpo por `SolicitudSchema.parse()` antes de
   escribir nada, y devolviendo 400 si no valida.

Sin eso, la afirmación de privacidad del video se sostiene solo en que nadie
haya metido un campo de más por accidente. Con eso, el esquema la sostiene solo.

Lo que sí quedó verificado: `RespuestaBancoSchema` valida la respuesta real del
nodo, con el nodo corriendo, sin retoques.

## Pendiente de verificar

- [ ] El caso sin red: apagar el wifi, comprobar que la solicitud queda en cola y
      que la app lo dice. Hoy **la cola no existe**: `expo-sqlite` está en
      `package.json` pero no se usa en ninguna parte, y `pendiente` es solo un
      estilo de texto en pantalla. Eso cierra `C8` y `C9`, que son dos escenas
      del video.
