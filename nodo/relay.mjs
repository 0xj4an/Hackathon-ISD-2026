/**
 * Peer HyperDHT con UDP público. Su publicKey va en swarmRelays de QVAC
 * (provider y consumer). Sin esto, delegate aborta el holepunch.
 *
 *   DHT_PORT=49737 DHT_HOST=0.0.0.0 node relay.mjs
 * En Fly: DHT_HOST=fly-global-services
 */
import DHT from "hyperdht";
import b4a from "b4a";

const PORT = Number(process.env.DHT_PORT || 49737);
const HOST = process.env.DHT_HOST || undefined;
const seed = process.env.RELAY_SEED;

const opts = {
  port: PORT,
  ephemeral: false,
  firewalled: false,
  anyPort: false,
};
if (HOST) opts.host = HOST;
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
    host: node.host,
    port: node.port,
  };
}

console.log("relay", JSON.stringify(estado()));
setInterval(() => console.log("relay", JSON.stringify(estado())), 20000);
