import test from "node:test";
import assert from "node:assert/strict";
import { hashTrazo } from "../../mobile/src/firmaHash.ts";

test("hashTrazo es estable para el mismo trazo", () => {
  const t = [[{ x: 10, y: 20 }, { x: 12, y: 22 }, { x: 14, y: 24 }]];
  assert.equal(hashTrazo(t), hashTrazo(t));
  assert.match(hashTrazo(t), /^[0-9a-f]{8}$/);
});

test("hashTrazo cambia si el trazo cambia", () => {
  const a = [[{ x: 1, y: 1 }, { x: 2, y: 2 }]];
  const b = [[{ x: 1, y: 1 }, { x: 9, y: 9 }]];
  assert.notEqual(hashTrazo(a), hashTrazo(b));
});
