const visao = require("olhax");

const ouvido = visao.mic({ lang: "pt" });

ouvido.on("modelo", ({ phase, loaded, total }) => {
  if (phase === "download" && total) {
    console.log(`Baixando modelo: ${Math.round((loaded / total) * 100)}%`);
  }
});

ouvido.on("falaInicio", () => {
  console.log("Comecou a falar");
});

ouvido.on("falaFim", ({ wav, durationMs }) => {
  console.log("Parou de falar", { bytes: wav.length, durationMs });
});

ouvido.on("transcricao", ({ text }) => {
  console.log("Texto:", text);
});

ouvido.on("erro", console.error);

process.on("SIGINT", () => {
  ouvido.parar();
  process.exit(0);
});
