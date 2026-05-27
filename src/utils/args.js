function isImageInput(value) {
  return typeof value === "string" || Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function isPoint(value) {
  return Boolean(value && typeof value === "object" && (
    (Number.isFinite(value.x) && Number.isFinite(value.y)) ||
    (Number.isFinite(value.centerX) && Number.isFinite(value.centerY))
  ));
}

function toPoint(value) {
  if (!isPoint(value)) return null;
  if (Number.isFinite(value.centerX) && Number.isFinite(value.centerY)) {
    return { x: value.centerX, y: value.centerY };
  }
  return { x: value.x, y: value.y };
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

function parseFindArgs(args) {
  if (args.length === 1 && args[0] && typeof args[0] === "object" && !isImageInput(args[0])) {
    const options = args[0];
    return {
      ...options,
      base: pick(options, ["base", "imagem", "image", "screenshot", "print"]),
      target: pick(options, ["alvo", "target", "template", "icone", "icon"])
    };
  }

  return {
    ...(args[2] || {}),
    base: args[0],
    target: args[1]
  };
}

function parseTargetArgs(args) {
  if (args.length === 1 && isImageInput(args[0])) {
    return { find: { target: args[0] }, options: {} };
  }

  if (args.length === 1 && isPoint(args[0])) {
    return { point: toPoint(args[0]), options: args[0] };
  }

  if (args.length === 1 && args[0] && typeof args[0] === "object" && !isImageInput(args[0])) {
    const point = toPoint(args[0]);
    if (point) return { point, options: args[0] };
    return { find: parseFindArgs(args), options: args[0] };
  }

  if (isPoint(args[0])) {
    return { point: toPoint(args[0]), options: args[1] || {} };
  }

  return { find: parseFindArgs(args), options: args[2] || {} };
}

module.exports = {
  isImageInput,
  isPoint,
  toPoint,
  parseFindArgs,
  parseTargetArgs
};
