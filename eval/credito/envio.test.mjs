import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { urlBanco } from "../../mobile/src/bancoUrl.ts";

test("camino A apunta al banco remoto por https", () => {
  const u = urlBanco();
  assert.match(u, /^https:\/\//);
  assert.match(u, /railway\.app/);
  assert.equal(u.endsWith("/"), false);
});

test("el teléfono intenta el banco (wifi) antes que el pueblo", () => {
  const src = readFileSync(new URL("../../mobile/src/envio.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function enviarSolicitud"));
  const banco = fn.indexOf("urlBanco()");
  const pueblo = fn.indexOf("urlNodo()");
  assert.ok(banco >= 0 && pueblo > banco);
});
