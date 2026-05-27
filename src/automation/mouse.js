const { obterConfig } = require("../config");
const { encontrar } = require("../vision");
const { createError } = require("../i18n");
const { parseTargetArgs, parseWriteArgs, isImageInput, toPoint } = require("../utils/args");
const { sleep } = require("../utils/time");
const { pathBetween } = require("./easing");
const { getBackend } = require("./backend");

async function resolvePoint(parsed, options) {
  if (parsed.point) return parsed.point;

  const findOptions = { ...parsed.find };
  if (!findOptions.base && findOptions.target) {
    findOptions.base = await getBackend(options).screenshot();
  }

  const match = await encontrar(findOptions);
  if (!match) throw createError("notFound", options.language);

  return {
    x: match.centerX,
    y: match.centerY,
    match
  };
}

async function moverSuave(...args) {
  const parsed = parseTargetArgs(args);
  const options = obterConfig({ ...(parsed.options || {}) });
  return moveParsedTarget(parsed, options);
}

async function moveParsedTarget(parsed, options) {
  const movement = { ...options.movement, ...(parsed.options || {}) };
  const backend = getBackend(options);
  const destination = await resolvePoint(parsed, options);
  const origin = await backend.getPosition();
  const points = pathBetween(origin, destination, movement);
  const delay = movement.duration ? movement.duration / points.length : 0;

  for (const point of points) {
    await backend.moveTo(point.x, point.y);
    if (delay > 0) await sleep(delay);
  }

  return {
    x: destination.x,
    y: destination.y,
    match: destination.match || null
  };
}

async function mover(...args) {
  return moverSuave(...args);
}

async function clicar(...args) {
  const parsed = parseTargetArgs(args);
  const options = obterConfig({ ...(parsed.options || {}) });
  const backend = getBackend(options);
  const moved = await moverSuave(...args);
  const button = options.button || options.click.button || "left";
  const clicks = options.clicks || 1;

  for (let index = 0; index < clicks; index += 1) {
    await backend.click(button);
    if (index < clicks - 1) await sleep(options.delay || options.click.delay);
  }

  return moved;
}

async function duploClicar(...args) {
  const parsed = parseTargetArgs(args);
  const options = obterConfig({ ...(parsed.options || {}), clicks: 2 });
  const backend = getBackend(options);
  const moved = await moverSuave(...args);
  await backend.doubleClick(options.button || "left");
  return moved;
}

async function cliqueDireito(...args) {
  const parsed = parseTargetArgs(args);
  const options = { ...(parsed.options || {}), button: "right" };

  if (parsed.point) return clicar(parsed.point, options);
  if (parsed.find) return clicar({ ...parsed.find, ...options });

  return clicar(...args, options);
}

async function pressionar(button = "left", options = {}) {
  const config = obterConfig(options);
  return getBackend(config).press(button);
}

async function soltar(button = "left", options = {}) {
  const config = obterConfig(options);
  return getBackend(config).release(button);
}

async function scrollar(amountOrOptions = 0, maybeOptions = {}) {
  const options = typeof amountOrOptions === "object"
    ? obterConfig(amountOrOptions)
    : obterConfig(maybeOptions);

  const dx = typeof amountOrOptions === "object"
    ? amountOrOptions.x || amountOrOptions.dx || amountOrOptions.horizontal || 0
    : maybeOptions.x || maybeOptions.dx || maybeOptions.horizontal || 0;

  const dy = typeof amountOrOptions === "object"
    ? amountOrOptions.y || amountOrOptions.dy || amountOrOptions.vertical || 0
    : amountOrOptions;

  await getBackend(options).scroll(dx, dy);
  return { dx, dy };
}

async function screenshot(options = {}) {
  const config = obterConfig(options);
  return getBackend(config).screenshot();
}

async function resolveDragEndpoint(value, options, role) {
  const point = toPoint(value);
  if (point) return point;

  if (isImageInput(value)) {
    const base = options.base || options.print || options.screenshot || await screenshot(options);
    const match = await encontrar({ ...options, base, target: value });
    if (!match) throw createError("notFound", options.language, { role });
    return { x: match.centerX, y: match.centerY, match };
  }

  throw createError("invalidArgs", options.language);
}

async function arrastar(from, to, options = {}) {
  const config = obterConfig(options);
  const backend = getBackend(config);
  const dragConfig = { ...config };

  if (!dragConfig.base && !toPoint(from) && !toPoint(to) && isImageInput(from) && isImageInput(to)) {
    dragConfig.base = await screenshot(config);
  }

  const start = await resolveDragEndpoint(from, dragConfig, "from");
  const end = await resolveDragEndpoint(to, dragConfig, "to");

  await moverSuave(start, dragConfig);
  await backend.press(dragConfig.button || "left");
  await moverSuave(end, dragConfig);
  await backend.release(dragConfig.button || "left");

  return {
    from: start,
    to: end
  };
}

async function aguardar(...args) {
  const started = Date.now();
  const parsed = parseTargetArgs(args);
  const options = obterConfig({ ...(parsed.options || {}) });
  const timeout = options.timeout;
  const interval = options.interval;

  while (Date.now() - started <= timeout) {
    const findOptions = parsed.find ? { ...parsed.find } : null;
    if (findOptions && !findOptions.base && findOptions.target) {
      findOptions.base = await screenshot(options);
    }

    const match = findOptions ? await encontrar(findOptions) : null;
    if (match) return match;
    await sleep(interval);
  }

  throw createError("timeout", options.language);
}

async function scrollUntil(...args) {
  const parsed = parseTargetArgs(args);
  const options = obterConfig({ ...(parsed.options || {}) });
  const amount = options.amount || options.scroll.amount;
  const maxScrolls = options.maxScrolls || options.scroll.maxScrolls;

  for (let index = 0; index < maxScrolls; index += 1) {
    try {
      const findOptions = parsed.find ? { ...parsed.find, timeout: options.interval } : null;
      const match = findOptions ? await aguardar(findOptions) : null;
      if (match) return match;
    } catch (error) {
      if (error.code !== "timeout" && error.code !== "notFound") throw error;
    }

    await scrollar(amount, options);
    await sleep(options.scroll.stepDelay);
  }

  throw createError("notFound", options.language);
}

async function escrever(...args) {
  const parsed = parseWriteArgs(args);
  const options = obterConfig({ ...(parsed.options || {}) });

  if (parsed.text === undefined || parsed.text === null) {
    throw createError("missingText", options.language);
  }

  const backend = getBackend(options);
  const moved = await moveParsedTarget(parsed.target, options);
  await backend.click(options.button || options.click.button || "left");

  const delay = options.afterClickDelay ?? options.write.afterClickDelay;
  if (delay > 0) await sleep(delay);

  if (typeof backend.typeText !== "function") {
    throw createError("keyboardUnavailable", options.language);
  }

  await backend.typeText(String(parsed.text));

  return {
    ...moved,
    text: String(parsed.text)
  };
}

module.exports = {
  mover,
  move: mover,
  moverSuave,
  moveSmooth: moverSuave,
  clicar,
  click: clicar,
  duploClicar,
  doubleClick: duploClicar,
  cliqueDireito,
  rightClick: cliqueDireito,
  pressionar,
  press: pressionar,
  soltar,
  release: soltar,
  scrollar,
  scroll: scrollar,
  scrollUntil,
  arrastar,
  drag: arrastar,
  aguardar,
  waitFor: aguardar,
  escrever,
  type: escrever,
  digitar: escrever,
  write: escrever,
  screenshot
};
