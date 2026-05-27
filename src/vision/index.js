const templateEngine = require("./template-engine");
const { obterConfig } = require("../config");
const { parseFindArgs } = require("../utils/args");

function getEngine(options) {
  return options.engine || templateEngine;
}

async function encontrar(...args) {
  const options = obterConfig(parseFindArgs(args));
  return getEngine(options).find(options);
}

async function encontrarTodos(...args) {
  const options = obterConfig(parseFindArgs(args));
  const result = await getEngine(options).findAll(options);
  return result.matches;
}

async function comparar(...args) {
  const options = obterConfig({ threshold: -1, ...parseFindArgs(args) });
  return getEngine(options).compare(options);
}

function centro(match) {
  if (!match) return null;
  return {
    x: Number.isFinite(match.centerX) ? match.centerX : match.x + match.width / 2,
    y: Number.isFinite(match.centerY) ? match.centerY : match.y + match.height / 2
  };
}

module.exports = {
  encontrar,
  find: encontrar,
  encontrarTodos,
  findAll: encontrarTodos,
  comparar,
  compare: comparar,
  centro,
  center: centro,
  templateEngine
};
