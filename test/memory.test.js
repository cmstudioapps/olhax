const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const olhax = require("../src");

async function pngFromGray(width, height, paint) {
  const data = Buffer.alloc(width * height, 255);
  paint(data, width, height);
  return sharp(data, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

test("lembrar salva match em JSON e encontrar recupera sem imagens", async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "olhax-memory-"));
  const base = await pngFromGray(24, 18, (data, width) => {
    for (let y = 7; y < 11; y += 1) {
      for (let x = 8; x < 14; x += 1) {
        data[y * width + x] = (x + y) % 2 ? 40 : 120;
      }
    }
  });

  const target = await pngFromGray(6, 4, (data, width) => {
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = (x + y + 15) % 2 ? 40 : 120;
      }
    }
  });

  const found = await olhax.encontrar(base, target, {
    threshold: 0.99,
    lembrar: "google",
    memoryDir
  });

  assert.equal(found.x, 8);
  assert.equal(found.y, 7);

  const recalled = await olhax.encontrar({
    lembrar: "google",
    memoryDir
  });

  assert.equal(recalled.remembered, true);
  assert.equal(recalled.x, 8);
  assert.equal(recalled.centerX, 11);

  const all = await olhax.listarLembrados({ memoryDir });
  assert.ok(all.google);

  await olhax.esquecer("google", { memoryDir });
  assert.equal(await olhax.lembrado("google", { memoryDir }), null);
});
