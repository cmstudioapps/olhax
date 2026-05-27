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
  const backend = {
    async getPosition() {
      return { x: 0, y: 0 };
    },
    async moveTo(x, y) {
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

test("escrever move, clica e digita no backend customizado", async () => {
  const events = [];
  const backend = {
    async getPosition() {
      return { x: 0, y: 0 };
    },
    async moveTo(x, y) {
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
