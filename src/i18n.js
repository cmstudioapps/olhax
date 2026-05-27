const messages = {
  invalidArgs: {
    pt: "Argumentos invalidos. Use caminhos, buffers, pontos { x, y } ou um objeto de opcoes.",
    en: "Invalid arguments. Use paths, buffers, points { x, y }, or an options object."
  },
  missingImage: {
    pt: "Imagem base e imagem alvo sao obrigatorias.",
    en: "Base image and target image are required."
  },
  notFound: {
    pt: "Imagem alvo nao encontrada.",
    en: "Target image was not found."
  },
  automationUnavailable: {
    pt: "Automacao de mouse indisponivel. Instale/configure @nut-tree-fork/nut-js ou forneca um backend customizado.",
    en: "Mouse automation is unavailable. Install/configure @nut-tree-fork/nut-js or provide a custom backend."
  },
  screenshotUnavailable: {
    pt: "Captura de tela indisponivel no backend de automacao atual.",
    en: "Screen capture is unavailable in the current automation backend."
  },
  imageTooLarge: {
    pt: "A imagem alvo precisa ser menor ou igual a imagem base.",
    en: "Target image must be smaller than or equal to the base image."
  },
  timeout: {
    pt: "Tempo limite atingido aguardando a imagem aparecer.",
    en: "Timed out while waiting for the image to appear."
  }
};

function text(code, language = "pt") {
  const entry = messages[code] || messages.invalidArgs;
  return entry[language] || entry.pt;
}

function createError(code, language, details = {}) {
  const error = new Error(text(code, language));
  error.code = code;
  error.messages = messages[code] || messages.invalidArgs;
  Object.assign(error, details);
  return error;
}

module.exports = {
  messages,
  text,
  createError
};
