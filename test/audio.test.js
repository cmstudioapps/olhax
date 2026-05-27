const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter, once } = require("node:events");
const olhax = require("../src");

function pcmChunk(samples, amplitude = 0) {
  const buffer = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    buffer.writeInt16LE(amplitude, index * 2);
  }
  return buffer;
}

test("mic detecta fala, silencio e transcreve com reconhecedor interno", async () => {
  const stream = new EventEmitter();
  const events = [];
  const recorder = {
    stream,
    start() {
      events.push("start");
    },
    stop() {
      events.push("stop");
    }
  };

  const ouvido = olhax.mic({
    recorder,
    recognizer: {
      modelPath: "fake-model",
      accept() {
        return { partial: { partial: "texto" }, final: null };
      },
      finish() {
        return { text: "texto capturado" };
      }
    },
    autoStart: false,
    sampleRate: 16000,
    threshold: 0.01,
    silenceMs: 50,
    preSpeechMs: 0,
    minSpeechMs: 0
  });

  const started = once(ouvido, "inicio");
  const speechStart = once(ouvido, "falaInicio");
  const speechEnd = once(ouvido, "falaFim");
  const partial = once(ouvido, "transcricaoParcial");
  const transcription = once(ouvido, "transcricao");

  ouvido.start();
  await started;

  stream.emit("data", pcmChunk(800, 0));
  stream.emit("data", pcmChunk(800, 5000));
  stream.emit("data", pcmChunk(800, 5000));
  stream.emit("data", pcmChunk(1600, 0));

  const [start] = await speechStart;
  const [end] = await speechEnd;
  const [partialText] = await partial;
  const [text] = await transcription;

  ouvido.stop();

  assert.ok(start.rms > 0.01);
  assert.ok(end.wav.length > 44);
  assert.equal(end.reason, "silence");
  assert.equal(partialText.text, "texto");
  assert.equal(text.text, "texto capturado");
  assert.deepEqual(events, ["start", "stop"]);
});
