const state = {
  language: "pt",
  threshold: 0.82,
  maxMatches: 50,
  minDistance: 8,
  searchStep: 1,
  timeout: 5000,
  interval: 250,
  movement: {
    duration: 350,
    easing: "easeInOut",
    minSteps: 18,
    speed: 1
  },
  click: {
    delay: 80,
    button: "left"
  },
  write: {
    afterClickDelay: 80
  },
  mic: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    threshold: 0.015,
    silenceMs: 800,
    preSpeechMs: 250,
    minSpeechMs: 250,
    maxSegmentMs: 30000,
    lang: "pt",
    modelPath: undefined,
    modelsDir: undefined,
    downloadModel: true,
    words: true,
    partialWords: false
  },
  memory: {
    file: "olhax/lembrados",
    ttlMs: null,
    prefer: false
  },
  scroll: {
    amount: 600,
    stepDelay: 120,
    maxScrolls: 12
  },
  engine: null,
  automation: null
};

function merge(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === "object" && !Buffer.isBuffer(value) && !Array.isArray(value)) {
      target[key] = merge({ ...(target[key] || {}) }, value);
    } else if (value !== undefined) {
      target[key] = value;
    }
  }

  return target;
}

function clone(value) {
  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value)) return value.map(clone);

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = clone(item);
  }

  return out;
}

function configurar(options = {}) {
  merge(state, options);
  return obterConfig();
}

function obterConfig(overrides = {}) {
  return merge(clone(state), overrides);
}

module.exports = {
  configurar,
  config: configurar,
  obterConfig,
  defaults: state
};
