function buildScales(options = {}) {
  if (Array.isArray(options.scales) && options.scales.length) {
    return [...new Set(options.scales.filter((scale) => scale > 0))];
  }

  const tolerance = options.scaleTolerance || options.toleranciaEscala;
  if (!tolerance) return [1];

  const value = tolerance > 1 ? tolerance / 100 : tolerance;
  return [1, 1 - value, 1 + value]
    .filter((scale) => scale > 0)
    .sort((a, b) => Math.abs(1 - a) - Math.abs(1 - b));
}

module.exports = { buildScales };
