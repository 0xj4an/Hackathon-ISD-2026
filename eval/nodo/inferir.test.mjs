import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aceptarPedido } from "../../nodo/inferir.mjs";

test("MedPsy: nodo-offline va directo al pueblo; si no, catch cae a /inferir", () => {
  const src = readFileSync(new URL("../../mobile/src/medpsy.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function completarMedPsy"));
  assert.ok(fn.includes("saltarMedPsyLocal"));
  assert.ok(fn.includes("asegurarMedPsy"));
  assert.ok(fn.includes("completarEnNodo"));
  // Modo nodo-offline: salta local antes del catch.
  assert.ok(fn.indexOf("saltarMedPsyLocal") < fn.indexOf("completarEnNodo"));
  // Fallback: tras catch también pide al pueblo.
  const catchIdx = fn.lastIndexOf("catch");
  assert.ok(catchIdx > 0);
  assert.ok(fn.slice(catchIdx).includes("completarEnNodo"));
  assert.equal(fn.includes("image"), false);
});

test("el pueblo acepta system+user y rechaza fotos", () => {
  const p = aceptarPedido({ system: "s", user: "hola", temp: 0.1, predict: 80 });
  assert.equal(p.system, "s");
  assert.equal(p.user, "hola");
  assert.throws(() => aceptarPedido({ system: "s", user: "u", image: "aaaa" }), /foto|imagen/i);
  assert.throws(() => aceptarPedido({ system: "s", user: "u", foto: "x" }), /foto|imagen/i);
  assert.throws(() => aceptarPedido({ user: "solo" }), /system/i);
});
