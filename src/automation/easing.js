const easings = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - ((1 - t) * (1 - t)),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)
};

function getEasing(easing) {
  if (typeof easing === "function") return easing;
  return easings[easing] || easings.easeInOut;
}

function pathBetween(from, to, options = {}) {
  const duration = Math.max(0, options.duration || 0);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const speed = Math.max(0.1, options.speed || 1);
  const minSteps = Math.max(2, options.minSteps || 12);
  const byDistance = Math.ceil(distance / (18 * speed));
  const byDuration = duration ? Math.ceil(duration / 16) : 0;
  const steps = Math.max(minSteps, byDistance, byDuration);
  const easing = getEasing(options.easing);
  const points = [];

  for (let step = 1; step <= steps; step += 1) {
    const progress = easing(step / steps);
    points.push({
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress
    });
  }

  return points;
}

module.exports = {
  easings,
  getEasing,
  pathBetween
};
