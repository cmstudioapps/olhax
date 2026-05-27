const visao = require("olhax");

async function main() {
  const alvo = await visao.encontrar("print.png", "icone.png");
  console.log(alvo);

  await visao.clicar("print.png", "icone.png");
  await visao.escrever({ x: 120, y: 260 }, "Ola OLHAX");
  await visao.moverSuave("print.png", "icone.png", { duration: 400 });
  await visao.scrollar(-500);
  await visao.arrastar({ x: 120, y: 220 }, { x: 420, y: 220 });
}

main().catch(console.error);
