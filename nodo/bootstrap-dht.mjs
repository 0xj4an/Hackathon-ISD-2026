/**
 * Bootstrap DHT local. Sustituye los nodos públicos de Holepunch.
 *
 *   node bootstrap-dht.mjs --host 192.168.0.10 --port 49737
 *
 * En otra máquina (o este mismo Mac): P2P_BOOTSTRAP=<host>:<port>
 * El host de LAN, no 127.0.0.1, si el otro equipo está en otro aparato.
 */
import DHT from "hyperdht";
import { hostLan } from "./dht.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};

const host = arg("host", process.env.P2P_HOST || hostLan());
const port = Number(arg("port", process.env.P2P_BOOTSTRAP_PORT || "49737"));

if (host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0") {
  console.warn("host debe ser IPv4 de LAN para otro aparato; loopback solo sirve en esta máquina");
}

const node = DHT.bootstrapper(port, host, { host, port, firewalled: false });
await node.ready();
const addr = node.address();
console.log("bootstrap", JSON.stringify(addr));
console.log(`P2P_BOOTSTRAP=${host === "0.0.0.0" ? "<IP-LAN>" : host}:${addr.port}`);

const apagar = async () => {
  await node.destroy();
  process.exit(0);
};
process.once("SIGINT", apagar);
process.once("SIGTERM", apagar);
