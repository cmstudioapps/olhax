const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const { normalizeImageInput } = require("./input");
const { resolveSearchRegions, centerOf } = require("./template-engine");
const { createError } = require("../i18n");

const DEFAULT_OCR_CACHE = path.join(os.tmpdir(), "olhax-tesseract-cache");
const DIACRITICS = /[\u0300-\u036f]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const KIND_RANK = {
  region: 0,
  block: 1,
  paragraph: 2,
  line: 3,
  words: 4,
  word: 5
};

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

function numberOption(options, keys, fallback) {
  const value = pick(options, keys);
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nestedOption(options, keys, fallback) {
  const direct = pick(options, keys);
  if (direct !== undefined) return direct;
  return pick(options.ocr, keys) ?? fallback;
}

function hasExplicitRegion(options = {}) {
  return pick(options, ["region", "regiao", "area", "bounds", "where"]) !== undefined;
}

function targetTexts(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap(targetTexts)
      .filter((item) => item.length > 0);
  }

  if (value === undefined || value === null) return [];
  const text = String(value).trim();
  return text ? [text] : [];
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function wordsOf(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

function levenshteinSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const left = [...a];
  const right = [...b];
  let previous = new Array(right.length + 1);
  let current = new Array(right.length + 1);

  for (let index = 0; index <= right.length; index += 1) previous[index] = index;

  for (let y = 1; y <= left.length; y += 1) {
    current[0] = y;
    for (let x = 1; x <= right.length; x += 1) {
      const cost = left[y - 1] === right[x - 1] ? 0 : 1;
      current[x] = Math.min(
        current[x - 1] + 1,
        previous[x] + 1,
        previous[x - 1] + cost
      );
    }
    [previous, current] = [current, previous];
  }

  const distance = previous[right.length];
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}

function textSimilarity(query, candidate) {
  const expected = normalizeText(query);
  const actual = normalizeText(candidate);

  if (!expected || !actual) return 0;
  if (actual === expected || actual.includes(expected)) return 1;

  const expectedWords = wordsOf(expected);
  const actualWords = wordsOf(actual);
  if (expectedWords.length > 1 && expectedWords.every((word) => actualWords.includes(word))) {
    return 0.98;
  }

  return levenshteinSimilarity(expected, actual);
}

function confidenceRatio(confidence) {
  const value = Number(confidence);
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value / 100));
}

function combinedScore(textScore, confidence) {
  return textScore * (0.9 + confidenceRatio(confidence) * 0.1);
}

function bboxToRect(bbox, scale) {
  if (!bbox || typeof bbox !== "object") return null;

  const x0 = Number(bbox.x0 ?? bbox.left ?? bbox.x);
  const y0 = Number(bbox.y0 ?? bbox.top ?? bbox.y);
  const x1 = Number(bbox.x1 ?? (Number.isFinite(x0) ? x0 + Number(bbox.width ?? bbox.w) : NaN));
  const y1 = Number(bbox.y1 ?? (Number.isFinite(y0) ? y0 + Number(bbox.height ?? bbox.h) : NaN));

  if (
    !Number.isFinite(x0)
    || !Number.isFinite(y0)
    || !Number.isFinite(x1)
    || !Number.isFinite(y1)
    || x1 <= x0
    || y1 <= y0
  ) {
    return null;
  }

  return {
    x: x0 / scale,
    y: y0 / scale,
    width: (x1 - x0) / scale,
    height: (y1 - y0) / scale
  };
}

function rectToBbox(rect, scale) {
  return {
    x0: rect.x * scale,
    y0: rect.y * scale,
    x1: (rect.x + rect.width) * scale,
    y1: (rect.y + rect.height) * scale
  };
}

function unionBbox(items) {
  const boxes = items
    .map((item) => item && item.bbox)
    .filter(Boolean);

  if (!boxes.length) return null;

  return boxes.reduce((acc, box) => ({
    x0: Math.min(acc.x0, box.x0),
    y0: Math.min(acc.y0, box.y0),
    x1: Math.max(acc.x1, box.x1),
    y1: Math.max(acc.y1, box.y1)
  }));
}

function averageConfidence(items, fallback) {
  const values = items
    .map((item) => Number(item && item.confidence))
    .filter(Number.isFinite);

  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function candidate(text, confidence, bbox, kind) {
  const clean = String(text || "").trim();
  if (!clean) return null;
  return {
    text: clean,
    confidence,
    bbox,
    kind
  };
}

function collectWords(page) {
  const words = [];

  if (Array.isArray(page.words)) {
    for (const word of page.words) {
      const item = candidate(word.text, word.confidence, word.bbox, "word");
      if (item) words.push(item);
    }
  }

  for (const block of page.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          const item = candidate(word.text, word.confidence, word.bbox, "word");
          if (item) words.push(item);
        }
      }
    }
  }

  return words;
}

function bboxCenterInRegion(bbox, region, scale) {
  const rect = bboxToRect(bbox, scale);
  if (!rect) return false;

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return centerX >= region.x
    && centerX < region.x + region.width
    && centerY >= region.y
    && centerY < region.y + region.height;
}

function collectCandidates(page, region, scale, targets, options = {}) {
  const candidates = [];
  const fallbackBbox = options.regionTextBbox || rectToBbox(region, scale);

  if (options.includeRegionText !== false) {
    const full = candidate(page.text, page.confidence, fallbackBbox, "region");
    if (full) candidates.push(full);
  }

  for (const block of page.blocks || []) {
    const blockCandidate = candidate(block.text, block.confidence, block.bbox || fallbackBbox, "block");
    if (blockCandidate) candidates.push(blockCandidate);

    for (const paragraph of block.paragraphs || []) {
      const paragraphCandidate = candidate(paragraph.text, paragraph.confidence, paragraph.bbox || block.bbox || fallbackBbox, "paragraph");
      if (paragraphCandidate) candidates.push(paragraphCandidate);

      for (const line of paragraph.lines || []) {
        const lineCandidate = candidate(line.text, line.confidence, line.bbox || paragraph.bbox || block.bbox || fallbackBbox, "line");
        if (lineCandidate) candidates.push(lineCandidate);
      }
    }
  }

  const words = collectWords(page);
  candidates.push(...words);

  const maxTargetWords = Math.max(1, ...targets.map((target) => wordsOf(target).length));
  const maxWindow = Math.min(words.length, maxTargetWords + 2);

  for (let size = 2; size <= maxWindow; size += 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const slice = words.slice(start, start + size);
      const text = slice.map((word) => word.text).join(" ");
      const item = candidate(text, averageConfidence(slice, page.confidence), unionBbox(slice), "words");
      if (item) candidates.push(item);
    }
  }

  if (!options.filterCenter) return candidates;
  return candidates.filter((item) => bboxCenterInRegion(item.bbox, region, scale));
}

function pageFromResult(result) {
  if (!result) return {};
  return result.data || result;
}

function makeMatch(candidateMatch, region, target, score, textScore, scale) {
  const rect = bboxToRect(candidateMatch.bbox, scale) || {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height
  };

  const match = centerOf({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    score: Number(score.toFixed(6)),
    textScore: Number(textScore.toFixed(6)),
    confidence: Number.isFinite(Number(candidateMatch.confidence))
      ? Number(Number(candidateMatch.confidence).toFixed(3))
      : undefined,
    text: candidateMatch.text,
    texto: candidateMatch.text,
    target,
    targetText: target,
    kind: candidateMatch.kind,
    region: {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height
    }
  });

  if (region.name) match.area = region.name;
  return match;
}

function bestMatchFromPage(page, region, targets, scale, options) {
  const candidates = collectCandidates(page, region, scale, targets, options);
  let best = null;

  for (const item of candidates) {
    for (const target of targets) {
      const textScore = textSimilarity(target, item.text);
      const score = combinedScore(textScore, item.confidence ?? page.confidence);
      const rank = KIND_RANK[item.kind] ?? 0;
      const bestRank = best ? (KIND_RANK[best.kind] ?? 0) : -1;
      if (!best || score > best.score || (Math.abs(score - best.score) < 1e-9 && rank > bestRank)) {
        best = makeMatch(item, region, target, score, textScore, scale);
      }
    }
  }

  if (best) {
    best.recognizedText = String(page.text || "");
    best.ocr = true;
  }

  return best;
}

function scaleRegion(region, scale) {
  return {
    left: Math.max(0, Math.round(region.x * scale)),
    top: Math.max(0, Math.round(region.y * scale)),
    width: Math.max(1, Math.round(region.width * scale)),
    height: Math.max(1, Math.round(region.height * scale))
  };
}

function fullRectangle(base, scale) {
  return {
    left: 0,
    top: 0,
    width: Math.max(1, Math.round(base.width * scale)),
    height: Math.max(1, Math.round(base.height * scale))
  };
}

async function prepareImage(input, options) {
  const imageInput = await normalizeImageInput(input);
  const scale = Math.max(0.1, numberOption(options, ["ocrScale", "escalaOcr", "textScale"], Number(options.ocr && options.ocr.scale) || 1));
  const metadata = await sharp(imageInput, { failOn: "none" }).rotate().metadata();

  if (!Number.isFinite(metadata.width) || !Number.isFinite(metadata.height)) {
    throw createError("invalidArgs", options.language);
  }

  let pipeline = sharp(imageInput, { failOn: "none" }).rotate();
  if (scale !== 1) {
    pipeline = pipeline.resize(
      Math.max(1, Math.round(metadata.width * scale)),
      Math.max(1, Math.round(metadata.height * scale))
    );
  }

  const normalize = nestedOption(options, ["ocrNormalize", "normalize"], false);
  const sharpen = nestedOption(options, ["ocrSharpen", "sharpen"], false);
  const grayscale = nestedOption(options, ["ocrGrayscale", "grayscale"], true);

  if (normalize) pipeline = pipeline.normalize();
  if (sharpen) pipeline = pipeline.sharpen();
  if (grayscale !== false) pipeline = pipeline.greyscale();

  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });

  return {
    image: data,
    base: {
      width: scale === 1 ? info.width : metadata.width,
      height: scale === 1 ? info.height : metadata.height
    },
    scale
  };
}

function createCustomRecognizer(engine) {
  return {
    async recognize(image, request) {
      if (typeof engine.recognize === "function") {
        return engine.recognize(image, request);
      }

      if (typeof engine.ocr === "function") {
        return engine.ocr(image, request);
      }

      throw createError("ocrUnavailable", request.options.language);
    }
  };
}

async function createTesseractRecognizer(options) {
  let tesseract;

  try {
    tesseract = require("tesseract.js");
  } catch (error) {
    throw createError("ocrUnavailable", options.language, { cause: error });
  }

  const ocr = options.ocr || {};
  const lang = pick(options, ["ocrLang", "idiomaOcr", "idiomaOCR"]) ?? ocr.lang ?? ocr.idioma ?? "eng";
  const oemValue = pick(options, ["ocrOem", "oem"]) ?? ocr.oem;
  const oem = oemValue === undefined ? undefined : Number(oemValue);
  const cachePath = pick(options, ["ocrCachePath", "cachePath"]) ?? ocr.cachePath ?? DEFAULT_OCR_CACHE;
  const workerOptions = {
    ...(ocr.workerOptions || {}),
    cachePath,
    cacheMethod: pick(options, ["ocrCacheMethod", "cacheMethod"]) ?? ocr.cacheMethod ?? "write"
  };

  for (const [target, keys] of Object.entries({
    langPath: ["ocrLangPath", "langPath"],
    corePath: ["ocrCorePath", "corePath"],
    workerPath: ["ocrWorkerPath", "workerPath"],
    dataPath: ["ocrDataPath", "dataPath"],
    gzip: ["ocrGzip", "gzip"]
  })) {
    const value = pick(options, keys) ?? ocr[target];
    if (value !== undefined) workerOptions[target] = value;
  }

  if (workerOptions.cachePath) {
    await fs.mkdir(workerOptions.cachePath, { recursive: true }).catch(() => {});
  }

  const worker = await tesseract.createWorker(lang, Number.isFinite(oem) ? oem : undefined, workerOptions, ocr.config);
  const params = {
    ...(ocr.params || {}),
    ...(options.ocrParams || {})
  };
  const psm = pick(options, ["ocrPsm", "psm"]) ?? ocr.psm;
  if (psm !== undefined) params.tessedit_pageseg_mode = String(psm);
  if (Object.keys(params).length) await worker.setParameters(params);

  return {
    async recognize(image, request) {
      const recognizeOptions = {
        ...(ocr.recognizeOptions || {}),
        rectangle: request.rectangle
      };
      return worker.recognize(image, recognizeOptions, { text: true, blocks: true });
    },

    async terminate() {
      return worker.terminate();
    }
  };
}

async function createRecognizer(options) {
  const engine = options.ocrEngine || (options.ocr && options.ocr.engine);
  if (engine) return createCustomRecognizer(engine);
  return createTesseractRecognizer(options);
}

async function findAll(options) {
  const targets = targetTexts(options.text ?? options.targetText ?? options.textoAlvo ?? options.alvoTexto);

  if (!options.base || targets.length === 0) {
    throw createError("missingTextTarget", options.language);
  }

  const prepared = await prepareImage(options.base, options);
  const searchRegions = resolveSearchRegions(prepared.base, options);
  const recognizer = await createRecognizer(options);
  const autoRegions = !hasExplicitRegion(options);
  const threshold = Number.isFinite(Number(options.textThreshold ?? options.threshold))
    ? Number(options.textThreshold ?? options.threshold)
    : 0.82;
  const matches = [];
  let best = null;

  try {
    if (autoRegions) {
      const result = await recognizer.recognize(prepared.image, {
        rectangle: fullRectangle(prepared.base, prepared.scale),
        region: {
          x: 0,
          y: 0,
          width: prepared.base.width,
          height: prepared.base.height
        },
        targets,
        options,
        output: { text: true, blocks: true },
        scale: prepared.scale
      });
      const page = pageFromResult(result);

      for (const region of searchRegions) {
        const match = bestMatchFromPage(page, region, targets, prepared.scale, {
          includeRegionText: false,
          filterCenter: true,
        });

        if (match && (!best || match.score > best.score)) best = match;
        if (match && match.score >= threshold) matches.push(match);
      }

      if (!best) {
        const fallbackRegion = searchRegions.find((region) => region.name === "centro" || region.name === "center")
          || searchRegions[Math.floor(searchRegions.length / 2)];
        const fallback = bestMatchFromPage(page, fallbackRegion, targets, prepared.scale, {
          filterCenter: true,
          regionTextBbox: rectToBbox({
            x: 0,
            y: 0,
            width: prepared.base.width,
            height: prepared.base.height
          }, prepared.scale)
        });

        if (fallback) {
          best = fallback;
          if (fallback.score >= threshold) matches.push(fallback);
        }
      }

      return {
        matches: matches.sort((a, b) => b.score - a.score).slice(0, options.maxMatches || 50),
        best
      };
    }

    for (const region of searchRegions) {
      const rectangle = scaleRegion(region, prepared.scale);
      const result = await recognizer.recognize(prepared.image, {
        rectangle,
        region,
        targets,
        options,
        output: { text: true, blocks: true },
        scale: prepared.scale
      });
      const match = bestMatchFromPage(pageFromResult(result), region, targets, prepared.scale);

      if (match && (!best || match.score > best.score)) best = match;
      if (match && match.score >= threshold) matches.push(match);
    }
  } finally {
    if (typeof recognizer.terminate === "function") {
      await recognizer.terminate().catch(() => {});
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    matches: matches.slice(0, options.maxMatches || 50),
    best
  };
}

async function find(options) {
  const result = await findAll({ ...options, maxMatches: 1 });
  return result.matches[0] || null;
}

async function compare(options) {
  const result = await findAll({ ...options, threshold: -1, maxMatches: 1 });
  return result.best || null;
}

module.exports = {
  find,
  findAll,
  compare
};
