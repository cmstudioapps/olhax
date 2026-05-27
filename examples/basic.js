const olhax = require("olhax");

async function main() {
  const target = await olhax.find("screenshot.png", "icon.png");
  console.log(target);

  await olhax.click("screenshot.png", "icon.png");
  await olhax.moveSmooth("screenshot.png", "icon.png", { duration: 400 });
  await olhax.scroll(-500);
  await olhax.drag({ x: 120, y: 220 }, { x: 420, y: 220 });
}

main().catch(console.error);
