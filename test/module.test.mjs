import test from "node:test";
import assert from "node:assert/strict";
import olhax, { encontrar, find, moverSuave } from "olhax";

test("pacote funciona em projetos type module com default e named exports", () => {
  assert.equal(typeof olhax.encontrar, "function");
  assert.equal(encontrar, olhax.encontrar);
  assert.equal(find, olhax.find);
  assert.equal(moverSuave, olhax.moverSuave);
});
