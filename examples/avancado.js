const visao = require("olhax");

visao.configurar({
  language: "pt",
  threshold: 0.86,
  movement: {
    duration: 450,
    easing: "easeInOut",
    minSteps: 24
  }
});

async function main() {
  const matches = await visao.encontrarTodos({
    base: "print.png",
    alvo: "botao.png",
    threshold: 0.85,
    scaleTolerance: 0.08,
    normalize: true
  });

  console.log(matches);

  const botao = await visao.aguardar("print.png", "botao.png", {
    timeout: 3000,
    interval: 200
  });

  await visao.duploClicar(botao);
  await visao.escrever({ x: botao.centerX, y: botao.centerY + 48 }, "texto pronto");
}

main().catch(console.error);
