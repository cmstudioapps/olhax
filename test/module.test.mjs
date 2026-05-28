import test from "node:test";
import assert from "node:assert/strict";
import olhax, { encontrar, find, encontrarTexto, findText, moverSuave, escrever, mic, lembrar, print } from "olhax";

test("pacote funciona em projetos type module com default e named exports", () => {
  assert.equal(typeof olhax.encontrar, "function");
  assert.equal(encontrar, olhax.encontrar);
  assert.equal(find, olhax.find);
  assert.equal(encontrarTexto, olhax.encontrarTexto);
  assert.equal(findText, olhax.findText);
  assert.equal(moverSuave, olhax.moverSuave);
  assert.equal(escrever, olhax.escrever);
  assert.equal(mic, olhax.mic);
  assert.equal(lembrar, olhax.lembrar);
  assert.equal(print, olhax.print);
});
