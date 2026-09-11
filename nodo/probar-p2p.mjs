/**
 * Prueba automática Mac↔Mac en esta máquina: bootstrap local + dos probes.
 * Sale 0 si hay PEER CONECTADO. No toca el camino HTTP de la demo.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DHT from "hyperdht";
import { hostLan } from "./dht.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const host = process.env.P2P_HOST || hostLan();
const port = Number(process.env.P2P_BOOTSTRAP_PORT || "49737");
const waitMs = Number(process.env.P2P_WAIT_MS || "20000");

const node = DHT.bootstrapper(port, host, { host, port, firewalled: false });
await node.ready();
const addr = `${host}:${node.address().port}`;
console.log("bootstrap", addr);

let out = "";
let seen = false;
let done;
const okP = new Promise((resolve) => { done = resolve; });
const t = setTimeout(() => done(false), waitMs);

function onData(buf) {
  const s = buf.toString();
  out += s;
  process.stdout.write(s);
  if (!seen && /PEER CONECTADO/.test(out)) {
    seen = true;
    clearTimeout(t);
    done(true);
  }
}

function child(name) {
  const p = spawn(process.execPath, [join(dir, "probe-p2p.mjs")], {
    cwd: dir,
    env: {
      ...process.env,
      NAME: name,
      P2P_BOOTSTRAP: addr,
      P2P_HOST: host,
      TOPIC: "isd-p2p-lan-test-v1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", onData);
  p.stderr.on("data", onData);
  return p;
}

const a = child("mac-a");
await new Promise((r) => setTimeout(r, 1200));
const b = child("mac-b");
const ok = await okP;

for (const p of [a, b]) {
  try { p.kill("SIGINT"); } catch { /* already gone */ }
}
await new Promise((r) => setTimeout(r, 400));
for (const p of [a, b]) {
  if (!p.killed) try { p.kill("SIGKILL"); } catch { /* ignore */ }
}
await node.destroy().catch(() => {});

if (!ok) {
  console.error("FAIL: ningún peer en", waitMs, "ms");
  process.exit(1);
}
console.log("OK: peers conectados con bootstrap local");
process.exit(0);
