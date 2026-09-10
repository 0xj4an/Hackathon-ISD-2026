// Ensayo Mac↔Mac: ¿se ven dos peers por Hyperswarm?
// Uso: NAME=mac-a node probe-p2p.mjs
//  Otro Mac, mismo wifi, mismo repo: NAME=mac-b node probe-p2p.mjs
import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";

const TOPIC_NAME = process.env.TOPIC || "isd-hackathon-p2p-probe-v1";
const NAME = process.env.NAME || "mac-a";
const topic = crypto.hash(b4a.from(TOPIC_NAME));
const t0 = Date.now();
const log = (...a) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  [${NAME}]`, ...a);

const swarm = new Hyperswarm();
const { dht } = swarm;
const nodes = () => dht.nodes?.toArray?.()?.length ?? dht.table?.toArray?.()?.length ?? "?";
const status = () =>
  log(
    `firewalled=${dht.firewalled} nodes=${nodes()} connecting=${swarm.connecting} conns=${swarm.connections.size} key=${b4a.toString(swarm.keyPair.publicKey, "hex").slice(0, 16)}`,
  );

dht.on("persistent", () => log("DHT persistent — ya no firewalled"));
swarm.on("connection", (sock, info) => {
  const id = b4a.toString(info.publicKey, "hex").slice(0, 8);
  log(`PEER CONECTADO ${id}  (eso es éxito)`);
  sock.write(`hola-desde-${NAME}\n`);
  sock.on("data", (d) => log(`msg: ${b4a.toString(d).trim()}`));
  sock.on("close", () => log(`peer cerrado ${id}`));
  sock.on("error", (e) => log("error peer", e.message));
});

log(`arrancando topic=${TOPIC_NAME}`);
status();

const disc = swarm.join(topic, { server: true, client: true });
const flushed = disc.flushed().then(() => {
  log("flushed OK — anunciado en la DHT");
  return "ok";
});
if ((await Promise.race([flushed, new Promise((r) => setTimeout(() => r("timeout"), 15_000))])) === "timeout") {
  log("flushed NO resolvió en 15s — seguimos buscando igual");
}
status();
setInterval(status, 10_000);

process.on("SIGINT", async () => {
  await swarm.destroy();
  process.exit(0);
});
