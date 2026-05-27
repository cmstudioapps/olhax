const { EventEmitter } = require("node:events");
const { obterConfig } = require("../config");
const { createError } = require("../i18n");
const { toWav } = require("./wav");
const { rms16le, chunkDurationMs, trimChunks } = require("./vad");
const { createMicRecorder } = require("./recorder");
const { createVoskEngine } = require("./vosk-engine");

function emitMany(emitter, names, payload) {
  for (const name of names) emitter.emit(name, payload);
}

function emitError(emitter, error) {
  emitter.emit("erro", error);
  if (emitter.listenerCount("error") > 0) emitter.emit("error", error);
}

function normalizeResult(result) {
  if (typeof result === "string") return { text: result, raw: result };
  return {
    text: result && result.text ? result.text : "",
    raw: result || null
  };
}

function mic(options = {}) {
  const config = obterConfig({ mic: options });
  const micOptions = { ...config.mic, ...options, language: config.language };
  const emitter = new EventEmitter();
  const recorder = micOptions.recorder || createMicRecorder(micOptions);

  let listening = false;
  let speaking = false;
  let silentMs = 0;
  let segmentMs = 0;
  let segmentChunks = [];
  let preChunks = [];
  let preBytes = 0;
  let recognizer = null;
  let starting = null;

  const bytesPerMs = micOptions.sampleRate * micOptions.channels * (micOptions.bitDepth / 8) / 1000;
  const maxPreBytes = Math.max(0, Math.round(micOptions.preSpeechMs * bytesPerMs));

  function resetSegment() {
    speaking = false;
    silentMs = 0;
    segmentMs = 0;
    segmentChunks = [];
  }

  function emitPartial(partial, segment) {
    if (!partial || !partial.partial) return;
    emitMany(emitter, ["transcricaoParcial", "partialTranscription"], {
      ...segment,
      text: partial.partial,
      raw: partial
    });
  }

  function feedRecognizer(chunk, segment) {
    if (!recognizer || typeof recognizer.accept !== "function") return;
    const result = recognizer.accept(chunk);
    if (result && result.partial) emitPartial(result.partial, segment);
  }

  function finishSegment(reason = "silence") {
    const pcm = Buffer.concat(segmentChunks);
    const durationMs = segmentMs;
    const wav = toWav(pcm, micOptions);
    const segment = {
      audio: pcm,
      pcm,
      wav,
      durationMs,
      reason,
      sampleRate: micOptions.sampleRate,
      channels: micOptions.channels,
      bitDepth: micOptions.bitDepth
    };

    let transcription = null;
    if (recognizer && typeof recognizer.finish === "function") {
      transcription = normalizeResult(recognizer.finish());
    }

    resetSegment();

    if (durationMs < micOptions.minSpeechMs) return;

    emitMany(emitter, ["falaFim", "speechEnd"], segment);

    if (transcription) {
      emitMany(emitter, ["transcricao", "transcription"], {
        ...segment,
        text: transcription.text,
        raw: transcription.raw
      });
    }
  }

  function handleChunk(chunk) {
    if (!listening || !chunk || !chunk.length) return;

    const durationMs = chunkDurationMs(chunk, micOptions);
    const rms = rms16le(chunk);
    const speech = rms >= micOptions.threshold;

    emitMany(emitter, ["audio"], { audio: chunk, rms, speech, durationMs });

    if (!speaking) {
      preChunks.push(chunk);
      preBytes += chunk.length;
      preBytes = trimChunks(preChunks, maxPreBytes);

      if (!speech) return;

      speaking = true;
      silentMs = 0;
      segmentMs = 0;
      segmentChunks = [...preChunks];
      for (const buffered of segmentChunks) {
        feedRecognizer(buffered, { durationMs: segmentMs });
      }
      preChunks = [];
      preBytes = 0;

      emitMany(emitter, ["falaInicio", "speechStart"], { rms });
    } else {
      segmentChunks.push(chunk);
      feedRecognizer(chunk, { durationMs: segmentMs });
    }

    segmentMs += durationMs;

    if (speech) {
      silentMs = 0;
    } else {
      silentMs += durationMs;
    }

    if (segmentMs >= micOptions.maxSegmentMs) {
      finishSegment("maxSegmentMs");
      return;
    }

    if (speaking && silentMs >= micOptions.silenceMs) {
      finishSegment("silence");
    }
  }

  async function prepare() {
    if (!recorder || !recorder.stream || typeof recorder.start !== "function") {
      throw createError("audioUnavailable", micOptions.language);
    }

    recognizer = micOptions.recognizer || await createVoskEngine(micOptions, (progress) => {
      emitMany(emitter, ["modelo", "model"], progress);
    });
  }

  function start() {
    if (listening) return emitter;
    listening = true;

    starting = prepare()
      .then(() => {
        if (!listening) return;
        recorder.stream.on("data", handleChunk);
        recorder.stream.on("error", (error) => emitError(emitter, error));
        recorder.start();
        emitMany(emitter, ["inicio", "start"], {
          sampleRate: micOptions.sampleRate,
          modelPath: recognizer && recognizer.modelPath
        });
      })
      .catch((error) => {
        listening = false;
        emitError(emitter, error);
      });

    return emitter;
  }

  function stop() {
    if (!listening) return emitter;
    listening = false;

    if (starting && typeof starting.finally === "function") {
      starting.finally(() => {});
    }

    if (speaking && segmentChunks.length) finishSegment("stop");
    if (recorder.stream && typeof recorder.stream.off === "function") {
      recorder.stream.off("data", handleChunk);
    }
    if (typeof recorder.stop === "function") recorder.stop();
    emitMany(emitter, ["fim", "stop"], {});

    return emitter;
  }

  emitter.start = start;
  emitter.iniciar = start;
  emitter.stop = stop;
  emitter.parar = stop;
  emitter.isListening = () => listening;
  emitter.ouvindo = () => listening;

  if (micOptions.autoStart !== false) {
    queueMicrotask(() => {
      try {
        start();
      } catch (error) {
        emitError(emitter, error);
      }
    });
  }

  return emitter;
}

module.exports = {
  mic
};
