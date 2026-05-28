const test = require("node:test");
const assert = require("node:assert/strict");
const olhax = require("../src");
const { pathBetween } = require("../src/automation/easing");

test("pathBetween cria pontos intermediarios e termina no destino", () => {
  const points = pathBetween(
    { x: 0, y: 0 },
    { x: 100, y: 50 },
    { duration: 300, minSteps: 10, easing: "linear" }
  );

  assert.ok(points.length >= 10);
  assert.deepEqual(points.at(-1), { x: 100, y: 50 });
  assert.ok(points[0].x > 0);
  assert.ok(points[0].x < 100);
});

test("moverSuave usa backend customizado e nao teleporta", async () => {
  const moves = [];
  let position = { x: 0, y: 0 };
  const backend = {
    async getPosition() {
      return position;
    },
    async moveTo(x, y) {
      position = { x, y };
      moves.push({ x, y });
    },
    async click() {}
  };

  olhax.configurar({ automation: backend });

  await olhax.moverSuave({ x: 30, y: 0, duration: 0, minSteps: 6, easing: "linear" });

  assert.ok(moves.length >= 6);
  assert.deepEqual(moves.at(-1), { x: 30, y: 0 });
  assert.ok(moves[0].x > 0);
  assert.ok(moves[0].x < 30);
});

test("clicar aguarda o mouse chegar ao destino antes de clicar", async () => {
  const events = [];
  let position = { x: 0, y: 0 };
  const backend = {
    async getPosition() {
      return position;
    },
    async moveTo(x, y) {
      events.push({ type: "move", x, y });
      setTimeout(() => {
        position = { x, y };
        events.push({ type: "arrived", x, y });
      }, 20);
    },
    async click(button) {
      events.push({ type: "click", button, x: position.x, y: position.y });
    }
  };

  await olhax.clicar({ x: 30, y: 10 }, {
    automation: backend,
    duration: 0,
    minSteps: 2,
    easing: "linear",
    arrivalTimeout: 300,
    arrivalInterval: 5,
    settleMs: 0
  });

  const click = events.find((event) => event.type === "click");
  const firstFinalArrival = events.findIndex((event) => event.type === "arrived" && event.x === 30 && event.y === 10);
  const clickIndex = events.findIndex((event) => event.type === "click");

  assert.ok(firstFinalArrival >= 0);
  assert.ok(clickIndex > firstFinalArrival);
  assert.deepEqual(click, { type: "click", button: "left", x: 30, y: 10 });
});

test("escrever move, clica e digita no backend customizado", async () => {
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

  const result = await olhax.escrever(
    { x: 30, y: 10 },
    "Ola OLHAX",
    {
      automation: backend,
      duration: 0,
      minSteps: 6,
      easing: "linear",
      afterClickDelay: 0
    }
  );

  assert.equal(result.text, "Ola OLHAX");
  assert.deepEqual(events.at(-2), { type: "click", button: "left" });
  assert.deepEqual(events.at(-1), { type: "type", text: "Ola OLHAX" });
  assert.ok(events.some((event) => event.type === "move" && event.x === 30 && event.y === 10));
});

test("print e aliases capturam imagem pelo backend customizado", async () => {
  const image = Buffer.from("fake-image");
  olhax.configurar({
    automation: {
      async screenshot() {
        return image;
      }
    }
  });

  assert.equal(await olhax.print(), image);
  assert.equal(await olhax.capturar(), image);
  assert.equal(await olhax.capture(), image);
});
