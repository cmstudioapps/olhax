const { obterConfig } = require("../config");

let bancozPromise;

function keyFromOptions(options = {}) {
  const value = options.lembrar ?? options.remember ?? options.memoria ?? options.memoryKey;
  if (value === true) return options.nome || options.name || options.id || null;
  return value || null;
}

function normalizeKey(key) {
  if (key === undefined || key === null) return null;
  const text = String(key).trim();
  return text.length ? text : null;
}

function toRememberedMatch(value) {
  if (!value) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width || 0);
  const height = Number(value.height || 0);
  const centerX = Number.isFinite(Number(value.centerX)) ? Number(value.centerX) : x + width / 2;
  const centerY = Number.isFinite(Number(value.centerY)) ? Number(value.centerY) : y + height / 2;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x,
    y,
    width,
    height,
    centerX,
    centerY,
    score: Number.isFinite(Number(value.score)) ? Number(value.score) : 1,
    remembered: true,
    lembrado: true,
    key: value.key
  };
}

async function getBancoz(options = {}) {
  if (!bancozPromise) {
    bancozPromise = import("bancoz").then((mod) => mod.default || mod);
  }

  const bancoz = await bancozPromise;

  if (options.memoryDir || options.lembrarDir) {
    bancoz.path(options.memoryDir || options.lembrarDir);
  }

  if (typeof bancoz.fila === "function") bancoz.fila(true);
  if (typeof bancoz.cache === "function") bancoz.cache(true);

  return bancoz;
}

function memoryFile(options = {}) {
  return options.memoryFile || options.arquivoMemoria || options.memory?.file || "olhax/lembrados";
}

async function lembrar(key, match, options = {}) {
  const config = obterConfig(options);
  const normalized = normalizeKey(key);
  const remembered = toRememberedMatch(match);

  if (!normalized || !remembered) return null;

  const bancoz = await getBancoz(config);
  const record = {
    ...remembered,
    key: normalized,
    updatedAt: new Date().toISOString()
  };

  await bancoz.criar(memoryFile(config), normalized, record);
  return record;
}

async function lembrado(key, options = {}) {
  const config = obterConfig(options);
  const normalized = normalizeKey(key);
  if (!normalized) return null;

  const bancoz = await getBancoz(config);
  const record = await bancoz.ler(memoryFile(config), normalized);
  const match = toRememberedMatch(record);
  if (!match) return null;

  const ttl = config.ttlMs ?? config.memory?.ttlMs;
  if (ttl && record.updatedAt && Date.now() - Date.parse(record.updatedAt) > ttl) {
    return null;
  }

  return {
    ...match,
    key: normalized,
    updatedAt: record.updatedAt
  };
}

async function esquecer(key, options = {}) {
  const config = obterConfig(options);
  const normalized = normalizeKey(key);
  if (!normalized) return false;

  const bancoz = await getBancoz(config);
  await bancoz.deletar(memoryFile(config), normalized);
  return true;
}

async function listarLembrados(options = {}) {
  const config = obterConfig(options);
  const bancoz = await getBancoz(config);
  return (await bancoz.ler(memoryFile(config))) || {};
}

function shouldPreferRemembered(options = {}) {
  return Boolean(
    options.usarLembrado
    || options.useRemembered
    || options.preferirLembrado
    || options.preferRemembered
    || options.memory?.prefer
  );
}

module.exports = {
  keyFromOptions,
  lembrar,
  remember: lembrar,
  lembrado,
  remembered: lembrado,
  recall: lembrado,
  esquecer,
  forget: esquecer,
  listarLembrados,
  listRemembered: listarLembrados,
  shouldPreferRemembered
};
