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

test("escrever usa posicao lembrada sem reenviar imagens", async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "olhax-write-memory-"));
  const events = [];
  let position = { x: 0, y: 0 };
  const backend = {
    async getPosition() {
      return position;
    },
    async moveTo(x, y) {
      position = { x, y };
      events.push({ type: "move", x, y });
    },
    async click(button) {
      events.push({ type: "click", button });
    },
    async typeText(text) {
      events.push({ type: "type", text });
    }
  };

  await olhax.lembrar("campo-email", {
    x: 80,
    y: 120,
    width: 100,
    height: 20,
    score: 1
  }, { memoryDir });

  const result = await olhax.escrever({
    lembrar: "campo-email",
    texto: "dev@olhax.dev",
    memoryDir,
    automation: backend,
    duration: 0,
    minSteps: 4,
    easing: "linear",
    afterClickDelay: 0
  });

  assert.equal(result.match.remembered, true);
  assert.equal(result.text, "dev@olhax.dev");
  assert.ok(events.some((event) => event.type === "move" && event.x === 130 && event.y === 130));
  assert.deepEqual(events.at(-2), { type: "click", button: "left" });
  assert.deepEqual(events.at(-1), { type: "type", text: "dev@olhax.dev" });
});
