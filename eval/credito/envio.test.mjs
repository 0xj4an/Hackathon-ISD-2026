import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { urlBanco } from "../../mobile/src/bancoUrl.ts";

test("banco remoto por https", () => {
  const u = urlBanco();
  assert.match(u, /^https:\/\//);
  assert.match(u, /railway\.app/);
  assert.equal(u.endsWith("/"), false);
});

test("local-wifi intenta el banco antes que el pueblo", () => {
  const src = readFileSync(new URL("../../mobile/src/envio.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function enviarSolicitud"));
  const banco = fn.indexOf("intentarBanco");
  const pueblo = fn.indexOf("intentarPueblo");
  assert.ok(banco >= 0 && pueblo > banco);
});

test("sinWifiDemo salta el banco vía modo", () => {
  const src = readFileSync(new URL("../../mobile/src/envio.ts", import.meta.url), "utf8");
  assert.match(src, /sinWifiDemo/);
  assert.match(src, /from \"\.\/modo\"/);
});

test("nodoUrl no hardcodea IP de demo", () => {
  const src = readFileSync(new URL("../../mobile/src/nodoUrl.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /192\.168\.0\.\d+/);
  assert.match(src, /descubrirPuebloLan/);
  assert.match(src, /inaigar-pueblo/);
});
