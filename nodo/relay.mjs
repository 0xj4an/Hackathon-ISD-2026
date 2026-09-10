/**
 * Relay swarmRelays de QVAC: HyperDHT server + blind-relay.
 * Un nodo DHT solo no alcanza; provider y consumer hacen dht.connect(esta clave).
 *
 *   DHT_PORT=49737 node relay.mjs
 * En Fly: DHT_HOST=fly-global-services (se resuelve a IPv4; udx no acepta nombres)
 */
import { lookup } from "node:dns/promises";
import DHT from "hyperdht";
import blindRelay from "blind-relay";
import b4a from "b4a";

const RelayServer = blindRelay.Server;
const PORT = Number(process.env.DHT_PORT || 49737);
const seed = process.env.RELAY_SEED;

async function ipv4(host) {
  if (!host) return;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const { address } = await lookup(host, { family: 4 });
  return address;
}

const opts = {
  port: PORT,
  ephemeral: false,
  firewalled: false,
  anyPort: false,
};
const host = await ipv4(process.env.DHT_HOST);
if (host) opts.host = host;
if (seed && /^[0-9a-f]{64}$/i.test(seed)) {
  opts.keyPair = DHT.keyPair(b4a.from(seed, "hex"));
}

const node = new DHT(opts);
await node.ready();

const relay = new RelayServer({
  createStream(streamOpts) {
    return node.createRawStream({ ...streamOpts, framed: true });
  },
});

let sessions = 0;
const server = node.createServer((socket) => {
  sessions += 1;
  console.log(
    "session",
    JSON.stringify({
      ts: new Date().toISOString().slice(11, 19),
      from: b4a.toString(socket.remotePublicKey, "hex").slice(0, 16),
      sessions,
    }),
  );
  const session = relay.accept(socket, { id: socket.remotePublicKey });
  session.on("error", (err) => console.error("session-error", err.message));
  socket.on("close", () => {
    sessions -= 1;
  });
});
await server.listen(node.defaultKeyPair);

function estado() {
  return {
    ts: new Date().toISOString().slice(11, 19),
    publicKey: b4a.toString(server.publicKey, "hex"),
    firewalled: node.firewalled,
    ephemeral: node.ephemeral,
    bind: host || "default",
    host: node.host,
    port: node.port,
    sessions,
    pairings: relay.stats.pairings,
  };
}

console.log("relay", JSON.stringify(estado()));
setInterval(() => console.log("relay", JSON.stringify(estado())), 20000);
