import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aceptarPedido } from "../../nodo/inferir.mjs";

test("MedPsy intenta el teléfono y solo en catch pide al pueblo", () => {
  const src = readFileSync(new URL("../../mobile/src/medpsy.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function completarMedPsy"));
  assert.ok(fn.includes("asegurarMedPsy"));
  assert.ok(fn.indexOf("catch") < fn.indexOf("completarEnNodo"));
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
