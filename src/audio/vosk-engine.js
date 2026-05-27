const { ensureModel } = require("./model-manager");
const { createError } = require("../i18n");

let loadedVosk;
const loadedModels = new Map();

function getVosk(options = {}) {
  if (loadedVosk) return loadedVosk;

  try {
    loadedVosk = require("vosk");
    loadedVosk.setLogLevel(options.voskLogLevel ?? -1);
    return loadedVosk;
  } catch (error) {
    throw createError("transcriptionUnavailable", options.language, { cause: error });
  }
}

async function getModel(options = {}, onProgress) {
  const modelPath = await ensureModel(options, onProgress);
  if (loadedModels.has(modelPath)) {
    return { model: loadedModels.get(modelPath), modelPath };
  }

  const vosk = getVosk(options);
  const model = new vosk.Model(modelPath);
  loadedModels.set(modelPath, model);

  return { model, modelPath };
}

async function createVoskEngine(options = {}, onProgress) {
  const vosk = getVosk(options);
  const { model, modelPath } = await getModel(options, onProgress);
  let recognizer = createRecognizer();
  let lastPartial = "";

  function createRecognizer() {
    const params = {
      model,
      sampleRate: options.sampleRate || 16000
    };

    if (Array.isArray(options.grammar)) params.grammar = options.grammar;

    const next = new vosk.Recognizer(params);

    if (options.words !== false && typeof next.setWords === "function") next.setWords(true);
    if (options.partialWords && typeof next.setPartialWords === "function") next.setPartialWords(true);

    return next;
  }

  function accept(chunk) {
    const final = recognizer.acceptWaveform(chunk);
    if (final) {
      const result = recognizer.result();
      lastPartial = "";
      return { final: result, partial: null };
    }

    const partial = recognizer.partialResult();
    if (partial.partial && partial.partial !== lastPartial) {
      lastPartial = partial.partial;
      return { final: null, partial };
    }

    return { final: null, partial: null };
  }

  function finish() {
    const result = recognizer.finalResult();
    if (typeof recognizer.free === "function") recognizer.free();
    recognizer = createRecognizer();
    lastPartial = "";
    return result;
  }

  return {
    modelPath,
    accept,
    finish
  };
}

module.exports = {
  createVoskEngine
};
