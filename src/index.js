const { configurar, config, obterConfig } = require("./config");
const vision = require("./vision");
const mouse = require("./automation/mouse");
const audio = require("./audio/mic");
const { messages } = require("./i18n");

module.exports = {
  configurar,
  config,
  obterConfig,
  getConfig: obterConfig,
  messages,

  encontrar: vision.encontrar,
  find: vision.find,
  encontrarTodos: vision.encontrarTodos,
  findAll: vision.findAll,
  comparar: vision.comparar,
  compare: vision.compare,
  centro: vision.centro,
  center: vision.center,
  lembrar: vision.lembrar,
  remember: vision.remember,
  lembrado: vision.lembrado,
  remembered: vision.remembered,
  recall: vision.recall,
  esquecer: vision.esquecer,
  forget: vision.forget,
  listarLembrados: vision.listarLembrados,
  listRemembered: vision.listRemembered,

  mover: mouse.mover,
  move: mouse.move,
  moverSuave: mouse.moverSuave,
  moveSmooth: mouse.moveSmooth,
  clicar: mouse.clicar,
  click: mouse.click,
  duploClicar: mouse.duploClicar,
  doubleClick: mouse.doubleClick,
  cliqueDireito: mouse.cliqueDireito,
  rightClick: mouse.rightClick,
  pressionar: mouse.pressionar,
  press: mouse.press,
  soltar: mouse.soltar,
  release: mouse.release,
  scrollar: mouse.scrollar,
  scroll: mouse.scroll,
  scrollUntil: mouse.scrollUntil,
  arrastar: mouse.arrastar,
  drag: mouse.drag,
  aguardar: mouse.aguardar,
  waitFor: mouse.waitFor,
  escrever: mouse.escrever,
  type: mouse.type,
  digitar: mouse.digitar,
  write: mouse.write,
  mic: audio.mic,
  screenshot: mouse.screenshot
};
