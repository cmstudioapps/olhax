const { loadGray } = require("./image");
const { buildScales } = require("./preprocess");
const { createError } = require("../i18n");

const EPSILON = 1e-9;
const THIRD = 1 / 3;

const NAMED_AREAS = {
  superior: { x: 0, y: 0, width: 1, height: THIRD },
  top: { x: 0, y: 0, width: 1, height: THIRD },
  inferior: { x: 0, y: 1 - THIRD, width: 1, height: THIRD },
  bottom: { x: 0, y: 1 - THIRD, width: 1, height: THIRD },
  esquerda: { x: 0, y: 0, width: THIRD, height: 1 },
  left: { x: 0, y: 0, width: THIRD, height: 1 },
  direita: { x: 1 - THIRD, y: 0, width: THIRD, height: 1 },
  right: { x: 1 - THIRD, y: 0, width: THIRD, height: 1 },
  centro: { x: THIRD, y: THIRD, width: THIRD, height: THIRD },
  center: { x: THIRD, y: THIRD, width: THIRD, height: THIRD },
  "superior-esquerda": { x: 0, y: 0, width: THIRD, height: THIRD },
  "esquerda-superior": { x: 0, y: 0, width: THIRD, height: THIRD },
  "top-left": { x: 0, y: 0, width: THIRD, height: THIRD },
  "left-top": { x: 0, y: 0, width: THIRD, height: THIRD },
  "superior-direita": { x: 1 - THIRD, y: 0, width: THIRD, height: THIRD },
  "direita-superior": { x: 1 - THIRD, y: 0, width: THIRD, height: THIRD },
  "top-right": { x: 1 - THIRD, y: 0, width: THIRD, height: THIRD },
  "right-top": { x: 1 - THIRD, y: 0, width: THIRD, height: THIRD },
  "inferior-esquerda": { x: 0, y: 1 - THIRD, width: THIRD, height: THIRD },
  "esquerda-inferior": { x: 0, y: 1 - THIRD, width: THIRD, height: THIRD },
  "bottom-left": { x: 0, y: 1 - THIRD, width: THIRD, height: THIRD },
  "left-bottom": { x: 0, y: 1 - THIRD, width: THIRD, height: THIRD },
  "inferior-direita": { x: 1 - THIRD, y: 1 - THIRD, width: THIRD, height: THIRD },
  "direita-inferior": { x: 1 - THIRD, y: 1 - THIRD, width: THIRD, height: THIRD },
  "bottom-right": { x: 1 - THIRD, y: 1 - THIRD, width: THIRD, height: THIRD },
  "right-bottom": { x: 1 - THIRD, y: 1 - THIRD, width: THIRD, height: THIRD }
};

const AUTO_AREAS = [
  { name: "superior-esquerda", rect: { x: 0, y: 0, width: THIRD, height: THIRD } },
  { name: "superior", rect: { x: THIRD, y: 0, width: THIRD, height: THIRD } },
  { name: "superior-direita", rect: { x: 1 - THIRD, y: 0, width: THIRD, height: THIRD } },
  { name: "esquerda", rect: { x: 0, y: THIRD, width: THIRD, height: THIRD } },
  { name: "centro", rect: { x: THIRD, y: THIRD, width: THIRD, height: THIRD } },
  { name: "direita", rect: { x: 1 - THIRD, y: THIRD, width: THIRD, height: THIRD } },
  { name: "inferior-esquerda", rect: { x: 0, y: 1 - THIRD, width: THIRD, height: THIRD } },
  { name: "inferior", rect: { x: THIRD, y: 1 - THIRD, width: THIRD, height: THIRD } },
  { name: "inferior-direita", rect: { x: 1 - THIRD, y: 1 - THIRD, width: THIRD, height: THIRD } }
];

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

function pickRegion(options = {}) {
  return options.region
    ?? options.regiao
    ?? options.area
    ?? options.bounds
    ?? options.where
    ?? null;
}

function normalizeAreaName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-");
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function pickNumber(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined) return numberFrom(obj[key]);
  }
  return NaN;
}

function toPixelValue(value, size) {
  const number = numberFrom(value);
  if (!Number.isFinite(number)) return NaN;
  if (number >= 0 && number <= 1) return number * size;
  return number;
}

function rectToPixels(rect, base) {
  const rawX = toPixelValue(rect.x, base.width);
  const rawY = toPixelValue(rect.y, base.height);
  const rawWidth = toPixelValue(rect.width, base.width);
  const rawHeight = toPixelValue(rect.height, base.height);

  if (
    !Number.isFinite(rawX)
    || !Number.isFinite(rawY)
    || !Number.isFinite(rawWidth)
    || !Number.isFinite(rawHeight)
    || rawWidth <= 0
    || rawHeight <= 0
  ) {
    return null;
  }

  const left = Math.max(0, Math.min(base.width, Math.floor(rawX)));
  const top = Math.max(0, Math.min(base.height, Math.floor(rawY)));
  const right = Math.max(left, Math.min(base.width, Math.ceil(rawX + rawWidth)));
  const bottom = Math.max(top, Math.min(base.height, Math.ceil(rawY + rawHeight)));

  if (right <= left || bottom <= top) return null;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function objectRegion(value) {
  return {
    x: pickNumber(value, ["x", "left"]),
    y: pickNumber(value, ["y", "top"]),
    width: pickNumber(value, ["width", "w", "largura"]),
    height: pickNumber(value, ["height", "h", "altura"])
  };
}

function resolveSearchRegions(base, options) {
  const raw = pickRegion(options);

  if (!raw) {
    return AUTO_AREAS.map((area) => ({
      ...rectToPixels(area.rect, base),
      name: area.name,
      mode: "center"
    }));
  }

  const name = typeof raw === "string" ? normalizeAreaName(raw) : null;
  const rect = name ? NAMED_AREAS[name] : objectRegion(raw);

  const region = rect && rectToPixels(rect, base);
  if (!region) throw createError("invalidArgs", options.language);

  return [{
    ...region,
    ...(name ? { name } : {}),
    mode: "inside"
  }];
}

function targetLabel(input) {
  if (typeof input !== "string") return undefined;

  const trimmed = input.trim();
  if (/^data:image\//i.test(trimmed)) return undefined;
  if (trimmed.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) return undefined;

  return input;
}

function alignStart(value, origin, step) {
  if (step <= 1) return value;
  const remainder = ((value - origin) % step + step) % step;
  return remainder === 0 ? value : value + step - remainder;
}

function candidateBounds(region, target, base, step) {
  if (region.mode === "center") {
    const centerX = target.width / 2;
    const centerY = target.height / 2;
    const right = region.x + region.width;
    const bottom = region.y + region.height;
    const lastX = right >= base.width;
    const lastY = bottom >= base.height;
    const minX = Math.max(0, Math.ceil(region.x - centerX));
    const minY = Math.max(0, Math.ceil(region.y - centerY));
    const maxX = Math.min(
      base.width - target.width,
      lastX ? Math.floor(right - centerX) : Math.ceil(right - centerX) - 1
    );
    const maxY = Math.min(
      base.height - target.height,
      lastY ? Math.floor(bottom - centerY) : Math.ceil(bottom - centerY) - 1
    );

    return {
      xStart: alignStart(minX, 0, step),
      yStart: alignStart(minY, 0, step),
      xEnd: maxX,
      yEnd: maxY
    };
  }

  return {
    xStart: region.x,
    yStart: region.y,
    xEnd: region.x + region.width - target.width,
    yEnd: region.y + region.height - target.height
  };
}

async function matchOneScale(base, targetInput, options, scale, searchRegions) {
  const target = prepareTemplate(await loadGray(targetInput, { ...options, scale }));

  if (target.width > base.width || target.height > base.height) {
    return { matches: [], best: null };
  }

  const sums = integral(base.data, base.width, base.height);
  const squaredSums = integral(base.data, base.width, base.height, true);
  const threshold = options.threshold;
  const step = Math.max(1, Math.floor(options.searchStep || 1));
  const label = targetLabel(targetInput);
  const matches = [];
  let best = null;

  for (const region of searchRegions) {
    if (region.mode !== "center" && (target.width > region.width || target.height > region.height)) {
      continue;
    }

    const bounds = candidateBounds(region, target, base, step);
    if (bounds.xEnd < bounds.xStart || bounds.yEnd < bounds.yStart) continue;

    for (let y = bounds.yStart; y <= bounds.yEnd; y += step) {
      for (let x = bounds.xStart; x <= bounds.xEnd; x += step) {
        const score = scoreAt(base, target, sums, squaredSums, x, y);
        const found = {
          x,
          y,
          width: target.width,
          height: target.height,
          score: Number(score.toFixed(6)),
          scale,
          region: {
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height
          }
        };
        if (region.name) found.area = region.name;
        if (label !== undefined) found.target = label;

        const match = centerOf(found);

        if (!best || match.score > best.score) best = match;
        if (score >= threshold) matches.push(match);
      }
    }
  }

  return { matches, best };
}

function targetInputs(target) {
  if (Array.isArray(target)) return target;
  return target ? [target] : [];
}

async function findAll(options) {
  const targets = targetInputs(options.target);

  if (!options.base || targets.length === 0) {
    throw createError("missingImage", options.language);
  }

  const base = await loadGray(options.base, options);
  const searchRegions = resolveSearchRegions(base, options);
  const scales = buildScales(options);
  const all = [];
  let best = null;

  for (const target of targets) {
    for (const scale of scales) {
      const result = await matchOneScale(base, target, options, scale, searchRegions);
      all.push(...result.matches);
      if (result.best && (!best || result.best.score > best.score)) best = result.best;
    }
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
  compare,
  resolveSearchRegions,
  centerOf
};
