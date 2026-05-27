const olhax = require("olhax");

const listener = olhax.mic({ lang: "en" });

listener.on("model", ({ phase, loaded, total }) => {
  if (phase === "download" && total) {
    console.log(`Downloading model: ${Math.round((loaded / total) * 100)}%`);
  }
});

listener.on("speechStart", () => {
  console.log("Speech started");
});

listener.on("speechEnd", ({ wav, durationMs }) => {
  console.log("Speech ended", { bytes: wav.length, durationMs });
});

listener.on("transcription", ({ text }) => {
  console.log("Text:", text);
});

listener.on("error", console.error);

process.on("SIGINT", () => {
  listener.stop();
  process.exit(0);
});
