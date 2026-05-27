const { loadGray } = require("./image");
const { buildScales } = require("./preprocess");
const { createError } = require("../i18n");

const EPSILON = 1e-9;

function integral(data, width, height, squared = false) {
  const out = new Float64Array((width + 1) * (height + 1));

  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      const value = data[(y - 1) * width + (x - 1)];
      row += squared ? value * value : value;
      out[y * (width + 1) + x] = out[(y - 1) * (width + 1) + x] + row;
    }
  }

  return out;
}

function sumRect(table, width, x, y, rectWidth, rectHeight) {
  const stride = width + 1;
  const x2 = x + rectWidth;
  const y2 = y + rectHeight;
  return table[y2 * stride + x2] - table[y * stride + x2] - table[y2 * stride + x] + table[y * stride + x];
}

function prepareTemplate(template) {
  const total = template.width * template.height;
  let sum = 0;

  for (let index = 0; index < template.data.length; index += 1) {
    sum += template.data[index];
  }

  const mean = sum / total;
  const delta = new Float64Array(total);
  let variance = 0;

  for (let index = 0; index < total; index += 1) {
    const value = template.data[index] - mean;
    delta[index] = value;
    variance += value * value;
  }

  return {
    ...template,
    total,
    mean,
    delta,
    denom: Math.sqrt(variance)
  };
}

function solidScore(base, template, x, y) {
  let diff = 0;

  for (let ty = 0; ty < template.height; ty += 1) {
    const baseOffset = (y + ty) * base.width + x;
    const templateOffset = ty * template.width;
    for (let tx = 0; tx < template.width; tx += 1) {
      diff += Math.abs(base.data[baseOffset + tx] - template.data[templateOffset + tx]);
    }
  }

  return Math.max(0, 1 - diff / (template.total * 255));
}

function scoreAt(base, template, sums, squaredSums, x, y) {
  if (template.denom < EPSILON) {
    return solidScore(base, template, x, y);
  }

  const baseSum = sumRect(sums, base.width, x, y, template.width, template.height);
  const baseSquared = sumRect(squaredSums, base.width, x, y, template.width, template.height);
  const baseVariance = baseSquared - (baseSum * baseSum) / template.total;

  if (baseVariance < EPSILON) return 0;

  let numerator = 0;
  for (let ty = 0; ty < template.height; ty += 1) {
    const baseOffset = (y + ty) * base.width + x;
    const templateOffset = ty * template.width;
    for (let tx = 0; tx < template.width; tx += 1) {
      numerator += template.delta[templateOffset + tx] * base.data[baseOffset + tx];
    }
  }

  return numerator / (template.denom * Math.sqrt(baseVariance));
}

function centerOf(match) {
  return {
    ...match,
    centerX: match.x + match.width / 2,
    centerY: match.y + match.height / 2
  };
}

function overlaps(a, b, minDistance) {
  const ax = a.centerX;
  const ay = a.centerY;
  const bx = b.centerX;
  const by = b.centerY;
  const distance = Math.hypot(ax - bx, ay - by);
  return distance < minDistance;
}

function suppress(matches, minDistance, maxMatches) {
  const sorted = matches.sort((a, b) => b.score - a.score);
  const kept = [];

  for (const match of sorted) {
    if (kept.length >= maxMatches) break;
    if (!kept.some((item) => overlaps(item, match, minDistance))) {
      kept.push(match);
    }
  }

  return kept;
}

async function matchOneScale(base, targetInput, options, scale) {
  const target = prepareTemplate(await loadGray(targetInput, { ...options, scale }));

  if (target.width > base.width || target.height > base.height) {
    return [];
  }

  const sums = integral(base.data, base.width, base.height);
  const squaredSums = integral(base.data, base.width, base.height, true);
  const threshold = options.threshold;
  const step = Math.max(1, Math.floor(options.searchStep || 1));
  const matches = [];
  let best = null;

  for (let y = 0; y <= base.height - target.height; y += step) {
    for (let x = 0; x <= base.width - target.width; x += step) {
      const score = scoreAt(base, target, sums, squaredSums, x, y);
      const match = centerOf({
        x,
        y,
        width: target.width,
        height: target.height,
        score: Number(score.toFixed(6)),
        scale
      });

      if (!best || match.score > best.score) best = match;
      if (score >= threshold) matches.push(match);
    }
  }

  return { matches, best };
}

async function findAll(options) {
  if (!options.base || !options.target) {
    throw createError("missingImage", options.language);
  }

  const base = await loadGray(options.base, options);
  const scales = buildScales(options);
  const all = [];
  let best = null;

  for (const scale of scales) {
    const result = await matchOneScale(base, options.target, options, scale);
    all.push(...result.matches);
    if (result.best && (!best || result.best.score > best.score)) best = result.best;
  }

  const minDistance = options.minDistance || Math.max(8, Math.min(base.width, base.height) * 0.01);
  const matches = suppress(all, minDistance, options.maxMatches || 50);

  return {
    matches,
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
