const olhax = require("olhax");

olhax.config({
  language: "en",
  threshold: 0.86,
  movement: {
    duration: 450,
    easing: "easeInOut",
    minSteps: 24
  }
});

async function main() {
  const matches = await olhax.findAll({
    base: "screenshot.png",
    target: "button.png",
    threshold: 0.85,
    scaleTolerance: 0.08,
    normalize: true
  });

  console.log(matches);

  const button = await olhax.waitFor("screenshot.png", "button.png", {
    timeout: 3000,
    interval: 200
  });

  await olhax.doubleClick(button);
  await olhax.type({ x: button.centerX, y: button.centerY + 48 }, "ready text");
}

main().catch(console.error);
