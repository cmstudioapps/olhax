const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const olhax = require("../src");

async function pngFromGray(width, height, paint) {
  const data = Buffer.alloc(width * height, 255);
  paint(data, width, height);
  return sharp(data, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

function ocrResult(text, bbox, confidence = 96) {
  if (!text) {
    return {
      data: {
        text: "",
        confidence: 0,
        blocks: []
      }
    };
  }

  return {
    data: {
      text: `${text}\n`,
      confidence,
      blocks: [{
        text: `${text}\n`,
        confidence,
        bbox,
        paragraphs: [{
          text,
          confidence,
          bbox,
          lines: [{
            text,
            confidence,
            bbox,
            words: [{
              text,
              confidence,
              bbox
            }]
          }]
        }]
      }]
    }
  };
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

test("encontrar aceita array de alvos e escolhe a variante mais compativel", async () => {
  const pattern = (x, y) => 20 + ((x * 37 + y * 53) % 180);
  const base = await pngFromGray(34, 24, (data, width) => {
    for (let y = 7; y < 12; y += 1) {
      for (let x = 11; x < 17; x += 1) {
        data[y * width + x] = pattern(x - 11, y - 7);
      }
    }
  });

  const variant = await pngFromGray(6, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = pattern(x, y);
      }
    }
    data[2 * width + 3] = 255;
  });

  const exact = await pngFromGray(6, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = pattern(x, y);
      }
    }
  });

  const match = await olhax.encontrar(base, [variant, exact], { threshold: 0.75 });

  assert.equal(match.x, 11);
  assert.equal(match.y, 7);
  assert.equal(match.width, 6);
  assert.equal(match.height, 5);
  assert.equal(match.score, 1);
});

test("area limita variantes fora da regiao e retorna coordenadas absolutas", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "olhax-region-"));

  try {
    const realPattern = (x, y) => 25 + ((x * 41 + y * 29) % 180);
    const falsePattern = (x, y) => 30 + ((x * 67 + y * 17) % 170);
    const base = await pngFromGray(90, 60, (data, width) => {
      for (let y = 46; y < 52; y += 1) {
        for (let x = 40; x < 48; x += 1) {
          data[y * width + x] = realPattern(x - 40, y - 46);
        }
      }

      data[48 * width + 43] = 245;

      for (let y = 5; y < 9; y += 1) {
        for (let x = 62; x < 66; x += 1) {
          data[y * width + x] = falsePattern(x - 62, y - 5);
        }
      }
    });

    const realTarget = await pngFromGray(8, 6, (data, width) => {
      for (let y = 0; y < 6; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          data[y * width + x] = realPattern(x, y);
        }
      }
    });

    const falseTarget = await pngFromGray(4, 4, (data, width) => {
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          data[y * width + x] = falsePattern(x, y);
        }
      }
    });

    const realPath = path.join(tmp, "google2.png");
    const falsePath = path.join(tmp, "google1.png");
    await fs.writeFile(realPath, realTarget);
    await fs.writeFile(falsePath, falseTarget);

    const unrestricted = await olhax.encontrar({
      base,
      alvo: [realPath, falsePath],
      threshold: 0.75
    });

    assert.equal(unrestricted.x, 62);
    assert.equal(unrestricted.y, 5);
    assert.equal(unrestricted.target, falsePath);

    const restricted = await olhax.encontrar({
      base,
      alvo: [realPath, falsePath],
      area: "inferior",
      threshold: 0.75
    });

    assert.equal(restricted.x, 40);
    assert.equal(restricted.y, 46);
    assert.equal(restricted.centerX, 44);
    assert.equal(restricted.centerY, 49);
    assert.equal(restricted.target, realPath);
    assert.ok(restricted.score >= 0.75);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("sem area divide a imagem e informa a regiao mais compativel", async () => {
  const pattern = (x, y) => 15 + ((x * 43 + y * 31) % 190);
  const base = await pngFromGray(90, 60, (data, width) => {
    for (let y = 46; y < 52; y += 1) {
      for (let x = 40; x < 48; x += 1) {
        data[y * width + x] = pattern(x - 40, y - 46);
      }
    }
  });

  const target = await pngFromGray(8, 6, (data, width) => {
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        data[y * width + x] = pattern(x, y);
      }
    }
  });

  const match = await olhax.encontrar({
    base,
    alvo: target,
    threshold: 0.99
  });

  assert.equal(match.x, 40);
  assert.equal(match.y, 46);
  assert.equal(match.area, "inferior");
  assert.deepEqual(match.region, { x: 30, y: 40, width: 30, height: 20 });
});

test("encontrarTexto divide a imagem e retorna a palavra mais compativel", async () => {
  const base = await pngFromGray(90, 60, () => {});
  const calls = [];
  const ocrEngine = {
    async recognize(image, request) {
      calls.push(request.rectangle);
      return ocrResult("Salvar", { x0: 38, y0: 45, x1: 58, y1: 55 });
    }
  };

  const match = await olhax.encontrarTexto({
    base,
    texto: "salvar",
    ocrEngine,
    threshold: 0.9
  });

  assert.equal(calls.length, 1);
  assert.equal(match.area, "inferior");
  assert.deepEqual(match.region, { x: 30, y: 40, width: 30, height: 20 });
  assert.equal(match.x, 38);
  assert.equal(match.y, 45);
  assert.equal(match.centerX, 48);
  assert.equal(match.centerY, 50);
  assert.equal(match.text, "Salvar");
  assert.equal(match.targetText, "salvar");
  assert.ok(match.score >= 0.9);
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

test("region manual e area percentual limitam encontrarTodos e comparar", async () => {
  const pattern = (x, y) => 10 + ((x * 31 + y * 47) % 200);
  const base = await pngFromGray(50, 40, (data, width) => {
    for (const startY of [5, 28]) {
      for (let y = startY; y < startY + 5; y += 1) {
        for (let x = 18; x < 24; x += 1) {
          data[y * width + x] = pattern(x - 18, y - startY);
        }
      }
    }
  });

  const target = await pngFromGray(6, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = pattern(x, y);
      }
    }
  });

  const matches = await olhax.encontrarTodos({
    base,
    alvo: target,
    region: {
      x: 0,
      y: 20,
      width: 50,
      height: 20
    },
    threshold: 0.99,
    minDistance: 4
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].x, 18);
  assert.equal(matches[0].y, 28);

  const best = await olhax.comparar({
    base,
    alvo: target,
    area: {
      x: 0,
      y: 0.5,
      width: 1,
      height: 0.5
    }
  });

  assert.equal(best.x, 18);
  assert.equal(best.y, 28);
  assert.equal(best.centerX, 21);
  assert.equal(best.centerY, 30.5);
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

test("clicar aceita area no alvo e usa coordenadas absolutas", async () => {
  const events = [];
  let position = { x: 0, y: 0 };
  const pattern = (x, y) => 20 + ((x * 19 + y * 23) % 180);
  const base = await pngFromGray(42, 36, (data, width) => {
    for (let y = 25; y < 30; y += 1) {
      for (let x = 12; x < 18; x += 1) {
        data[y * width + x] = pattern(x - 12, y - 25);
      }
    }
  });

  const target = await pngFromGray(6, 5, (data, width) => {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        data[y * width + x] = pattern(x, y);
      }
    }
  });

  const backend = {
    async screenshot() {
      return base;
    },
    async getPosition() {
      return position;
    },
    async moveTo(x, y) {
      position = { x, y };
      events.push({ type: "move", x, y });
    },
    async click(button) {
      events.push({ type: "click", button, x: position.x, y: position.y });
    }
  };

  const result = await olhax.clicar({
    alvo: target,
    area: "inferior",
    threshold: 0.99,
    automation: backend,
    duration: 0,
    minSteps: 2,
    easing: "linear"
  });

  assert.equal(result.match.x, 12);
  assert.equal(result.match.y, 25);
  assert.deepEqual(events.at(-1), { type: "click", button: "left", x: 15, y: 27.5 });
});

test("clicar aceita texto alvo e usa o centro reconhecido pelo OCR", async () => {
  const events = [];
  let position = { x: 0, y: 0 };
  const base = await pngFromGray(90, 60, () => {});
  const ocrEngine = {
    async recognize() {
      return ocrResult("Entrar", { x0: 40, y0: 25, x1: 52, y1: 35 });
    }
  };

  const backend = {
    async screenshot() {
      return base;
    },
    async getPosition() {
      return position;
    },
    async moveTo(x, y) {
      position = { x, y };
      events.push({ type: "move", x, y });
    },
    async click(button) {
      events.push({ type: "click", button, x: position.x, y: position.y });
    }
  };

  const result = await olhax.clicar({
    texto: "entrar",
    ocrEngine,
    automation: backend,
    duration: 0,
    minSteps: 2,
    easing: "linear",
    threshold: 0.9
  });

  assert.equal(result.match.text, "Entrar");
  assert.deepEqual(events.at(-1), { type: "click", button: "left", x: 46, y: 30 });
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
