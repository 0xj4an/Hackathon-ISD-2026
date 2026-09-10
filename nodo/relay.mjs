/**
 * Peer HyperDHT con UDP público. Su publicKey va en swarmRelays de QVAC
 * (provider y consumer). Sin esto, delegate aborta el holepunch.
 *
 *   DHT_PORT=49737 node relay.mjs
 * En Fly: DHT_HOST=fly-global-services (se resuelve a IPv4; udx no acepta nombres)
 */
import { lookup } from "node:dns/promises";
import DHT from "hyperdht";
import b4a from "b4a";

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

function estado() {
  return {
    ts: new Date().toISOString().slice(11, 19),
    publicKey: b4a.toString(node.defaultKeyPair.publicKey, "hex"),
    firewalled: node.firewalled,
    ephemeral: node.ephemeral,
    bind: host || "default",
    host: node.host,
    port: node.port,
  };
}

console.log("relay", JSON.stringify(estado()));
setInterval(() => console.log("relay", JSON.stringify(estado())), 20000);
