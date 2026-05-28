const templateEngine = require("./template-engine");
const textEngine = require("./text-engine");
const { obterConfig } = require("../config");
const { parseFindArgs, parseTextFindArgs } = require("../utils/args");
const memory = require("../memory/store");

function getEngine(options) {
  return options.engine || templateEngine;
}

async function encontrar(...args) {
  const options = obterConfig(parseFindArgs(args));
  const key = memory.keyFromOptions(options);

  if (key && (!options.base || !options.target || memory.shouldPreferRemembered(options))) {
    const remembered = await memory.lembrado(key, options);
    if (remembered) return remembered;
    if (!options.base || !options.target) return null;
  }

  const match = await getEngine(options).find(options);
  if (key && match) await memory.lembrar(key, match, options);
  return match;
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

async function encontrarTexto(...args) {
  const options = obterConfig(parseTextFindArgs(args));
  const key = memory.keyFromOptions(options);
  const missingText = options.text === undefined || options.text === null;

  if (key && (!options.base || missingText || memory.shouldPreferRemembered(options))) {
    const remembered = await memory.lembrado(key, options);
    if (remembered) return remembered;
    if (!options.base || missingText) return null;
  }

  const match = await textEngine.find(options);
  if (key && match) await memory.lembrar(key, match, options);
  return match;
}

async function encontrarTextos(...args) {
  const options = obterConfig(parseTextFindArgs(args));
  const result = await textEngine.findAll(options);
  return result.matches;
}

async function compararTexto(...args) {
  const options = obterConfig({ threshold: -1, ...parseTextFindArgs(args) });
  return textEngine.compare(options);
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
  encontrarTexto,
  findText: encontrarTexto,
  procurarTexto: encontrarTexto,
  searchText: encontrarTexto,
  encontrarTextos,
  findAllText: encontrarTextos,
  compararTexto,
  compareText: compararTexto,
  centro,
  center: centro,
  lembrar: memory.lembrar,
  remember: memory.lembrar,
  lembrado: memory.lembrado,
  remembered: memory.lembrado,
  recall: memory.lembrado,
  esquecer: memory.esquecer,
  forget: memory.esquecer,
  listarLembrados: memory.listarLembrados,
  listRemembered: memory.listarLembrados,
  templateEngine,
  textEngine
};
