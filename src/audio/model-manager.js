const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const AdmZip = require("adm-zip");
const { createError } = require("../i18n");

const MODELS = {
  pt: {
    name: "vosk-model-small-pt-0.3",
    url: "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip"
  },
  en: {
    name: "vosk-model-small-en-us-0.15",
    url: "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
  }
};

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function modelCacheDir(options = {}) {
  return options.modelsDir
    || process.env.OLHAX_MODELS_DIR
    || path.join(os.homedir(), ".olhax", "models");
}

function modelInfo(options = {}) {
  const lang = String(options.lang || options.idioma || "pt").toLowerCase();
  const info = MODELS[lang];

  if (!info) {
    const error = createError("modelUnavailable", options.language, { lang });
    error.available = Object.keys(MODELS);
    throw error;
  }

  return info;
}

async function download(url, onProgress) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Model download failed: ${response.status} ${response.statusText}`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const chunks = [];
  let loaded = 0;

  if (!response.body || typeof response.body.getReader !== "function") {
    const buffer = Buffer.from(await response.arrayBuffer());
    onProgress && onProgress({ loaded: buffer.length, total });
    return buffer;
  }

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    chunks.push(chunk);
    loaded += chunk.length;
    onProgress && onProgress({ loaded, total });
  }

  return Buffer.concat(chunks);
}

async function ensureModel(options = {}, onProgress) {
  if (options.modelPath) return options.modelPath;

  const info = modelInfo(options);
  const dir = modelCacheDir(options);
  const target = path.join(dir, info.name);

  if (await exists(target)) return target;

  if (options.downloadModel === false || options.baixarModelo === false) {
    throw createError("modelMissing", options.language, { model: info.name, target });
  }

  await fs.mkdir(dir, { recursive: true });
  onProgress && onProgress({ phase: "download", model: info.name, loaded: 0, total: 0 });
  const zipBuffer = await download(info.url, (progress) => {
    onProgress && onProgress({ phase: "download", model: info.name, ...progress });
  });

  onProgress && onProgress({ phase: "extract", model: info.name, loaded: zipBuffer.length, total: zipBuffer.length });
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(dir, true);

  if (!(await exists(target))) {
    throw createError("modelMissing", options.language, { model: info.name, target });
  }

  onProgress && onProgress({ phase: "ready", model: info.name, path: target });
  return target;
}

module.exports = {
  MODELS,
  ensureModel,
  modelCacheDir
};
