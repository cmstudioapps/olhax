const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const olhax = require("../src");
const { createNutBackend } = require("../src/automation/backend");

async function samplePng() {
  return sharp(Buffer.from([255, 0, 0, 0, 255, 0]), {
    raw: {
      width: 2,
      height: 1,
      channels: 3
    }
  }).png().toBuffer();
}

test("print le arquivo quando backend customizado devolve caminho", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "olhax-print-path-"));

  try {
    const png = await samplePng();
    const file = path.join(tempDir, "screen.png");
    await fs.writeFile(file, png);

    const result = await olhax.print({
      automation: {
        async screenshot() {
          return file;
        }
      }
    });

    assert.ok(Buffer.isBuffer(result));
    assert.deepEqual(result, png);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("backend nut passa fileName para screen.capture e le caminho retornado", async () => {
  const png = await samplePng();
  const calls = [];
  const backend = createNutBackend("pt", {
    FileType: { PNG: ".png" },
    Button: { LEFT: 0 },
    Point: class Point {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    },
    mouse: {
      async getPosition() {
        return { x: 0, y: 0 };
      },
      async setPosition() {},
      async click() {}
    },
    screen: {
      async capture(fileName, fileFormat, filePath) {
        calls.push({ fileName, fileFormat, filePath });
        const outputPath = path.join(filePath, `${fileName}${fileFormat}`);
        await fs.writeFile(outputPath, png);
        return outputPath;
      }
    },
    keyboard: {}
  });

  const result = await backend.screenshot();

  assert.ok(Buffer.isBuffer(result));
  assert.deepEqual(result, png);
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].fileName, "string");
  assert.notEqual(calls[0].fileName.length, 0);
  assert.equal(calls[0].fileFormat, ".png");
});
