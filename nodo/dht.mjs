/**
 * DHT de LAN. `opts.bootstrap` en hyperdht REEMPLAZA los nodos públicos
 * (OR, no merge). Sin eso, NAT deja firewalled:true y el topic nunca casa.
 *
 * El bootstrapper de hyperdht exige IPv4 real (no 0.0.0.0).
 * Hyperswarm solo reconsulta el topic cada 10 min: hay que refrescar.
 */
import { networkInterfaces } from "node:os";
import DHT from "hyperdht";

export function hostLan() {
  if (process.env.P2P_HOST) return process.env.P2P_HOST;
  const nics = networkInterfaces();
  const v4 = (a) => (a.family === "IPv4" || a.family === 4) && !a.internal;
  for (const name of ["en0", "en1", "eth0", "wlan0"]) {
    const hit = (nics[name] || []).find(v4);
    if (hit) return hit.address;
  }
  for (const list of Object.values(nics)) {
    const hit = (list || []).find(v4);
    if (hit) return hit.address;
  }
  return "127.0.0.1";
}

/** Hyperswarm espera 10 min al siguiente lookup. En LAN eso es eternidad. */
export function refrescarTopic(disc, ms = 2000) {
  const t = setInterval(() => { disc.refresh().catch(() => {}); }, ms);
  t.unref?.();
  return t;
}

export function parseBootstrap(raw = process.env.P2P_BOOTSTRAP) {
  if (!raw?.trim()) return null;
  const nodes = raw.split(",").map((s) => {
    const [host, port] = s.trim().split(":");
    return { host, port: Number(port) };
  }).filter((b) => b.host && Number.isFinite(b.port));
  return nodes.length ? nodes : null;
}

export async function crearDht({ bootstrap, host } = {}) {
  const nodes = bootstrap ?? parseBootstrap();
  const dht = new DHT({
    ...(nodes ? { bootstrap: nodes } : {}),
    host: host ?? (nodes ? hostLan() : "0.0.0.0"),
    port: 0,
    ephemeral: false,
    firewalled: false,
  });
  await dht.ready();
  if (typeof dht.fullyBootstrapped === "function") {
    await dht.fullyBootstrapped().catch(() => {});
  }
  return dht;
}
