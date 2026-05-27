const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const olhax = require("../src");

async function pngFromGray(width, height, paint) {
  const data = Buffer.alloc(width * height, 255);
  paint(data, width, height);
  return sharp(data, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

test("encontra uma imagem dentro de outra e retorna centro e score", async () => {
  const base = await pngFromGray(32, 24, (data, width) => {
    for (let y = 8; y < 14; y += 1) {
      for (let x = 10; x < 17; x += 1) {
        data[y * width + x] = (x + y) % 2 === 0 ? 30 : 90;
      }
    }
  });

  const target = await pngFromGray(7, 6, (data, width) => {
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        data[y * width + x] = (x + y) % 2 === 0 ? 30 : 90;
      }
    }
  });

  const match = await olhax.encontrar(base, target, { threshold: 0.99 });

  assert.equal(match.x, 10);
  assert.equal(match.y, 8);
  assert.equal(match.width, 7);
  assert.equal(match.height, 6);
  assert.equal(match.centerX, 13.5);
  assert.equal(match.centerY, 11);
  assert.equal(match.score, 1);
});

test("retorna todos os matches acima do threshold", async () => {
  const base = await pngFromGray(40, 20, (data, width) => {
    for (const startX of [4, 24]) {
      for (let y = 5; y < 10; y += 1) {
        for (let x = startX; x < startX + 5; x += 1) {
          data[y * width + x] = x % 2 ? 80 : 10;
        }
      }
    }
  });

  const target = await pngFromGray(5, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        data[y * width + x] = x % 2 ? 80 : 10;
      }
    }
  });

  const matches = await olhax.findAll(base, target, {
    threshold: 0.99,
    minDistance: 6
  });

  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((match) => match.x).sort((a, b) => a - b), [4, 24]);
});

test("compare retorna o melhor candidato mesmo abaixo do threshold padrao", async () => {
  const base = await pngFromGray(16, 16, (data, width) => {
    data[6 * width + 6] = 0;
    data[6 * width + 7] = 30;
    data[7 * width + 6] = 80;
    data[7 * width + 7] = 120;
  });

  const target = await pngFromGray(2, 2, (data) => {
    data[0] = 0;
    data[1] = 30;
    data[2] = 80;
    data[3] = 120;
  });

  const match = await olhax.compare({ base, target });

  assert.equal(match.x, 6);
  assert.equal(match.y, 6);
  assert.equal(match.score, 1);
});

test("aceita imagem em base64 puro e data URI", async () => {
  const base = await pngFromGray(28, 18, (data, width) => {
    for (let y = 6; y < 11; y += 1) {
      for (let x = 9; x < 15; x += 1) {
        data[y * width + x] = (x * 3 + y * 5) % 120;
      }
    }
  });

  const target = await pngFromGray(6, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = ((x + 9) * 3 + (y + 6) * 5) % 120;
      }
    }
  });

  const match = await olhax.find({
    base: base.toString("base64"),
    target: `data:image/png;base64,${target.toString("base64")}`,
    threshold: 0.99
  });

  assert.equal(match.x, 9);
  assert.equal(match.y, 6);
  assert.equal(match.score, 1);
});
