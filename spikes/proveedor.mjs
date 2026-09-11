/**
 * Laptop como par QVAC (SDK 0.18.2). El teléfono se conecta por llave,
 * no por topic: dht.connect(publicKey).
 *
 *   node proveedor.mjs
 *   QVAC_HYPERSWARM_SEED=<64 hex> node proveedor.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const { startQVACProvider, stopQVACProvider } = await import("@qvac/sdk");
if (typeof startQVACProvider !== "function") {
  console.error("Este SDK no trae startQVACProvider. Fijar @qvac/sdk 0.18.2.");
  process.exit(1);
}

const dir = dirname(fileURLToPath(import.meta.url));
const rutaSemilla = process.env.SEMILLA_P2P || join(dir, "datos", "p2p-semilla");
if (!process.env.QVAC_HYPERSWARM_SEED) {
  if (!existsSync(rutaSemilla)) {
    mkdirSync(dirname(rutaSemilla), { recursive: true });
    writeFileSync(rutaSemilla, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  process.env.QVAC_HYPERSWARM_SEED = readFileSync(rutaSemilla, "utf8").trim();
}

const t0 = Date.now();
const r = await startQVACProvider({});
if (!r?.publicKey) {
  console.error("el proveedor arrancó sin clave pública");
  process.exit(1);
}
console.log(`proveedor listo (${Date.now() - t0} ms)`);
console.log(`clave: ${r.publicKey}`);
console.log("en el teléfono: EXPO_PUBLIC_P2P_PROVEEDOR=<clave>  (modo nodo-offline)");
console.log("primera conexión DHT: 15–45 s; luego sub-segundo. Ctrl+C para parar.");

const parar = async () => {
  await stopQVACProvider().catch(() => {});
  process.exit(0);
};
process.once("SIGINT", parar);
process.once("SIGTERM", parar);
