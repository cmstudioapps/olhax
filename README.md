# OLHAX

OLHAX e uma biblioteca Node.js para automacao visual simples.

Voce entrega uma imagem base, entrega a imagem alvo, e a OLHAX retorna onde encontrou. Depois voce pode mover o mouse, clicar, dar duplo clique, scrollar, arrastar e aguardar algo aparecer.

OLHAX is a simple Node.js library for visual automation.

Give it a base image, give it a target image, and OLHAX returns where the target was found. Then you can move the mouse, click, double-click, scroll, drag, and wait for something to appear.

## Instalar / Install

```bash
npm install olhax
```

Requisitos:

- Node.js 18 ou superior.
- Windows, macOS ou Linux com suporte do backend de automacao usado por `@nut-tree-fork/nut-js`.
- Imagens em PNG, JPG ou WebP, via path, Buffer, Uint8Array, base64 puro ou data URI.

## Importar / Import

CommonJS:

```js
const visao = require("olhax");
```

ES Modules / `"type": "module"`:

```js
import visao, { encontrar, clicar } from "olhax";
```

English aliases work the same way:

```js
import olhax, { find, click } from "olhax";
```

## Primeiro uso / First Use

Portugues:

```js
const visao = require("olhax");

async function main() {
  const alvo = await visao.encontrar("print.png", "icone.png");

  if (!alvo) {
    console.log("Nao achei o icone.");
    return;
  }

  console.log(alvo);
  await visao.clicar(alvo);
}

main().catch(console.error);
```

English:

```js
const olhax = require("olhax");

async function main() {
  const target = await olhax.find("screenshot.png", "icon.png");

  if (!target) {
    console.log("Icon not found.");
    return;
  }

  console.log(target);
  await olhax.click(target);
}

main().catch(console.error);
```

## Conceito principal / Main Concept

A OLHAX trabalha com dois tipos de entrada:

- `base`: a imagem maior, normalmente um print ou screenshot.
- `alvo` / `target`: a imagem menor que voce quer localizar dentro da base.

Exemplo:

```js
const match = await visao.encontrar({
  base: "print.png",
  alvo: "icone.png",
  threshold: 0.85
});
```

Resultado:

```js
{
  x: 10,
  y: 20,
  width: 32,
  height: 32,
  centerX: 26,
  centerY: 36,
  score: 0.94
}
```

Campos:

- `x`, `y`: canto superior esquerdo onde o alvo foi encontrado.
- `width`, `height`: tamanho do alvo encontrado.
- `centerX`, `centerY`: centro do alvo, ideal para clicar.
- `score`: confianca do match, de `0` a `1`.

`encontrar` / `find` retorna `null` quando nao acha. Acoes como `clicar` / `click` lancam erro quando o alvo nao e encontrado.

## Receitas rapidas / Quick Recipes

Encontrar uma imagem:

```js
const alvo = await visao.encontrar("print.png", "icone.png");
```

Encontrar e lembrar a posicao para usar depois:

```js
await visao.encontrar("print.png", "google.png", {
  lembrar: "google"
});
```

Encontrar todas as ocorrencias:

```js
const alvos = await visao.encontrarTodos("print.png", "icone.png", {
  threshold: 0.85
});
```

Clicar no alvo encontrado:

```js
await visao.clicar("print.png", "icone.png");
```

Levar o mouse ate um campo, clicar e escrever:

```js
await visao.escrever({ x: 120, y: 300 }, "meu texto");
```

Mover suavemente ate uma coordenada:

```js
await visao.moverSuave({
  x: 120,
  y: 300,
  duration: 400,
  easing: "easeInOut"
});
```

Aguardar uma imagem aparecer:

```js
const botao = await visao.aguardar("print.png", "botao.png", {
  timeout: 3000,
  interval: 200
});
```

Scroll vertical:

```js
await visao.scrollar(-800);
```

Scroll horizontal, quando o backend suportar:

```js
await visao.scrollar({ x: 300 });
```

Arrastar de uma coordenada para outra:

```js
await visao.arrastar({ x: 100, y: 200 }, { x: 400, y: 200 });
```

Arrastar de uma imagem para outra:

```js
await visao.arrastar("origem.png", "destino.png");
```

## Usando a tela atual / Using The Current Screen

Quando voce passa apenas o alvo para uma acao, a OLHAX tenta capturar a tela atual pelo backend de automacao.

```js
await visao.clicar("icone.png");
await visao.moverSuave("icone.png");
await visao.aguardar("botao.png");
```

Isso depende do suporte a screenshot do backend. Se a captura de tela nao estiver disponivel no seu ambiente, use explicitamente a imagem base:

```js
await visao.clicar("print.png", "icone.png");
```

## Arquivos, buffers e base64 / Files, Buffers And Base64

Voce pode passar caminhos de arquivo:

```js
const alvo = await visao.encontrar("print.png", "icone.png");
```

Ou buffers:

```js
const fs = require("node:fs/promises");
const visao = require("olhax");

const print = await fs.readFile("print.png");
const icone = await fs.readFile("icone.png");

const alvo = await visao.encontrar(print, icone);
```

Ou base64 puro:

```js
const alvo = await visao.encontrar({
  base: printBase64,
  alvo: iconeBase64
});
```

Ou data URI:

```js
const alvo = await visao.encontrar({
  base: "data:image/png;base64,iVBORw0KGgo...",
  alvo: "data:image/png;base64,iVBORw0KGgo..."
});
```

English:

```js
const target = await olhax.find({
  base: screenshotBase64,
  target: iconBase64
});
```

Para evitar confusao com caminhos de arquivo, a OLHAX tenta usar uma string como arquivo primeiro. Se o arquivo nao existir e a string for uma imagem base64 valida PNG, JPG ou WebP, ela sera tratada como imagem.

## Linux

A parte de reconhecimento visual da OLHAX funciona em Linux porque roda em Node.js com `sharp`.

As funcoes que controlam mouse, scroll, drag e screenshot dependem do backend nativo `@nut-tree-fork/nut-js`. Esse backend declara suporte a `linux`, `darwin` e `win32`, mas no Linux normalmente precisa de:

- uma sessao grafica real;
- variavel `DISPLAY` configurada;
- suporte X11/XTest disponivel no ambiente;
- permissoes suficientes para controlar mouse e capturar tela.

Em ambientes headless, containers, SSH sem display, Wayland restritivo ou CI sem servidor grafico, a busca por imagem em arquivos, buffers e base64 ainda pode funcionar, mas automacao de mouse e screenshot podem falhar. Nesses casos use uma imagem base explicita:

```js
await visao.encontrar("print.png", "icone.png");
```

ou forneca um backend customizado em `configurar`.

## Busca visual / Visual Search

### `encontrar` / `find`

Retorna o primeiro match acima do `threshold`.

```js
const alvo = await visao.encontrar({
  base: "print.png",
  alvo: "icone.png",
  threshold: 0.85
});
```

### `encontrarTodos` / `findAll`

Retorna todos os matches aceitos.

```js
const alvos = await visao.encontrarTodos({
  base: "print.png",
  alvo: "icone.png",
  threshold: 0.85,
  maxMatches: 20,
  minDistance: 10
});
```

### `comparar` / `compare`

Retorna o melhor candidato, mesmo que ele fique abaixo do `threshold` configurado.

```js
const melhor = await visao.comparar("print.png", "icone.png");
```

### Preprocessamento simples

Use quando o print e o alvo tiverem pequenas diferencas de contraste, escala ou nitidez:

```js
const alvo = await visao.encontrar({
  base: "print.png",
  alvo: "icone.png",
  threshold: 0.82,
  normalize: true,
  sharpen: true,
  scaleTolerance: 0.08
});
```

Opcoes uteis:

- `threshold`: confianca minima para aceitar o match.
- `scaleTolerance`: tenta variacoes pequenas de escala.
- `scales`: lista manual de escalas, por exemplo `[1, 0.9, 1.1]`.
- `normalize`: normaliza contraste.
- `sharpen`: aplica nitidez.
- `blur`: aplica desfoque leve antes da busca.
- `searchStep`: pula pixels durante a busca. Maior e mais rapido, mas menos preciso.

## Lembrar posicoes / Remember Positions

Quando `lembrar` / `remember` e usado, a OLHAX salva o match em JSON com Bancoz. Depois o dev pode recuperar a coordenada pelo nome, sem reenviar a imagem.

Primeira vez, procurando pela imagem:

```js
await visao.encontrar("print.png", "google.png", {
  lembrar: "google"
});
```

Depois, usando so o nome lembrado:

```js
const google = await visao.encontrar({
  lembrar: "google"
});

await visao.clicar(google);
```

Tambem funciona em ingles:

```js
await olhax.find("screenshot.png", "google.png", {
  remember: "google"
});

const google = await olhax.recall("google");
await olhax.click(google);
```

Se voce quiser preferir a posicao salva mesmo quando passar imagem de novo:

```js
const google = await visao.encontrar("print.png", "google.png", {
  lembrar: "google",
  usarLembrado: true
});
```

Funcoes diretas:

```js
await visao.lembrar("google", { x: 100, y: 200, width: 40, height: 20 });
const google = await visao.lembrado("google");
const todos = await visao.listarLembrados();
await visao.esquecer("google");
```

Por padrao, os dados ficam em:

```txt
BANCO Z/
  olhax/
    lembrados.json
```

Configurar pasta/arquivo:

```js
visao.configurar({
  memory: {
    file: "olhax/posicoes",
    ttlMs: null,
    prefer: false
  }
});

await visao.encontrar("print.png", "google.png", {
  lembrar: "google",
  memoryDir: "./dados"
});
```

Esse recurso usa `bancoz` por baixo para persistir JSON de forma simples.

## Mouse e cliques / Mouse And Clicks

Todas estas chamadas movem o mouse suavemente antes da acao:

```js
await visao.clicar("print.png", "icone.png");
await visao.duploClicar("print.png", "icone.png");
await visao.cliqueDireito("print.png", "icone.png");
```

Tambem da para clicar em uma coordenada ou em um match ja encontrado:

```js
const alvo = await visao.encontrar("print.png", "icone.png");

if (alvo) {
  await visao.clicar(alvo);
}

await visao.clicar({ x: 100, y: 200 });
```

Para fluxos manuais:

```js
await visao.pressionar("left");
await visao.moverSuave({ x: 300, y: 200 });
await visao.soltar("left");
```

English aliases:

```js
await olhax.click("screenshot.png", "icon.png");
await olhax.doubleClick("screenshot.png", "icon.png");
await olhax.rightClick("screenshot.png", "icon.png");
await olhax.press("left");
await olhax.release("left");
```

## Escrever / Type Text

`escrever` / `type` move o mouse ate o destino, clica e entao digita o texto.

Coordenada:

```js
await visao.escrever({ x: 120, y: 300 }, "Ola mundo");
```

Match ja encontrado:

```js
const campo = await visao.encontrar("print.png", "campo.png");

if (campo) {
  await visao.escrever(campo, "usuario@email.com");
}
```

Imagem dentro de uma base:

```js
await visao.escrever("print.png", "campo.png", "usuario@email.com");
```

Imagem na tela atual, quando screenshot estiver disponivel:

```js
await visao.escrever("campo.png", "usuario@email.com");
```

Com opcoes:

```js
await visao.escrever(
  { x: 120, y: 300 },
  "texto",
  {
    duration: 300,
    easing: "easeInOut",
    afterClickDelay: 100
  }
);
```

English aliases:

```js
await olhax.type({ x: 120, y: 300 }, "hello");
await olhax.write("screenshot.png", "field.png", "hello");
```

## Audio e microfone / Audio And Microphone

`mic()` escuta o microfone, detecta quando alguem comeca a falar, detecta silencio e transcreve automaticamente com Vosk offline/local.

Nao usa OpenAI, GPT, Whisper ou servico em nuvem. Na primeira execucao, a OLHAX pode baixar e cachear um modelo pequeno do Vosk para o idioma escolhido.

```js
const ouvido = visao.mic();

ouvido.on("falaInicio", () => {
  console.log("Comecou a falar");
});

ouvido.on("falaFim", ({ wav, durationMs }) => {
  console.log("Parou de falar", { bytes: wav.length, durationMs });
});

ouvido.on("transcricao", ({ text }) => {
  console.log("Texto:", text);
});

ouvido.on("erro", console.error);
```

English:

```js
const listener = olhax.mic();

listener.on("speechStart", () => {
  console.log("Speech started");
});

listener.on("speechEnd", ({ wav, durationMs }) => {
  console.log("Speech ended", { bytes: wav.length, durationMs });
});

listener.on("transcription", ({ text }) => {
  console.log("Text:", text);
});

listener.on("error", console.error);
```

Idioma:

```js
const ouvido = visao.mic({
  lang: "pt"
});
```

English:

```js
const listener = olhax.mic({
  lang: "en"
});
```

Controle manual:

```js
const ouvido = visao.mic({ autoStart: false });

ouvido.iniciar();
// ...
ouvido.parar();
```

Opcoes uteis:

- `threshold`: sensibilidade da deteccao de voz.
- `silenceMs`: quanto tempo de silencio encerra um trecho.
- `preSpeechMs`: audio preservado antes do inicio detectado.
- `minSpeechMs`: duracao minima para aceitar um trecho.
- `maxSegmentMs`: duracao maxima de um trecho continuo.
- `sampleRate`: padrao `16000`.
- `lang`: `"pt"` ou `"en"` para baixar o modelo pequeno padrao.
- `modelPath`: caminho para um modelo Vosk ja baixado.
- `modelsDir`: pasta de cache dos modelos.
- `downloadModel`: `false` impede download automatico.

No Windows/macOS, o pacote `mic` normalmente usa `sox`. No Linux, usa `arecord`/ALSA. Se o ambiente nao tiver gravador de sistema disponivel, forneca um `recorder` customizado.

## Movimento suave / Smooth Movement

`moverSuave` / `moveSmooth` nunca teleporta diretamente para o destino. Ele calcula pontos intermediarios entre a posicao atual do cursor e o destino.

```js
await visao.moverSuave({
  x: 120,
  y: 300,
  duration: 400,
  easing: "easeInOut",
  minSteps: 20,
  speed: 1
});
```

Opcoes:

- `duration`: duracao total aproximada em milissegundos.
- `easing`: `"linear"`, `"easeIn"`, `"easeOut"` ou `"easeInOut"`.
- `minSteps`: minimo de pontos intermediarios.
- `speed`: multiplicador simples para ajustar a quantidade de passos por distancia.

Tambem funciona passando uma imagem:

```js
await visao.moverSuave("print.png", "icone.png", {
  duration: 500
});
```

## Scroll

Vertical:

```js
await visao.scrollar(-800);
await visao.scrollar(800);
```

Horizontal:

```js
await visao.scrollar({ x: 300 });
await visao.scrollar({ x: -300 });
```

Scroll ate encontrar:

```js
const alvo = await visao.scrollUntil("print.png", "icone.png", {
  amount: -600,
  maxScrolls: 10,
  interval: 200
});
```

## Drag And Drop

Coordenada para coordenada:

```js
await visao.arrastar(
  { x: 100, y: 200 },
  { x: 400, y: 200 },
  { duration: 600 }
);
```

Imagem para imagem:

```js
await visao.arrastar("origem.png", "destino.png", {
  duration: 600
});
```

Se voce passar duas imagens, a OLHAX tenta capturar a tela atual e encontrar as duas imagens nela. Se isso nao funcionar no seu ambiente, passe coordenadas ou use uma imagem base para encontrar os pontos antes.

## Configuracao / Configuration

Configuracao global:

```js
visao.configurar({
  language: "pt",
  threshold: 0.82,
  maxMatches: 50,
  minDistance: 8,
  timeout: 5000,
  interval: 250,
  movement: {
    duration: 350,
    easing: "easeInOut",
    minSteps: 18,
    speed: 1
  },
  click: {
    delay: 80,
    button: "left"
  },
  write: {
    afterClickDelay: 80
  },
  mic: {
    sampleRate: 16000,
    lang: "pt",
    threshold: 0.015,
    silenceMs: 800,
    downloadModel: true
  },
  memory: {
    file: "olhax/lembrados",
    ttlMs: null,
    prefer: false
  },
  scroll: {
    amount: -600,
    stepDelay: 120,
    maxScrolls: 12
  }
});
```

Configuracao por chamada:

```js
await visao.clicar("print.png", "icone.png", {
  threshold: 0.9,
  duration: 500,
  easing: "easeOut"
});
```

## Aliases PT/EN

| Portugues | English | O que faz |
| --- | --- | --- |
| `configurar` | `config` | Define configuracao global |
| `encontrar` | `find` | Encontra o primeiro match |
| `encontrarTodos` | `findAll` | Encontra varios matches |
| `comparar` | `compare` | Retorna o melhor candidato |
| `centro` | `center` | Retorna `{ x, y }` do centro |
| `lembrar` | `remember` | Salva uma posicao em JSON |
| `lembrado` | `remembered` | Recupera uma posicao salva |
| `lembrado` | `recall` | Alias para recuperar |
| `esquecer` | `forget` | Remove uma posicao salva |
| `listarLembrados` | `listRemembered` | Lista posicoes salvas |
| `clicar` | `click` | Move e clica |
| `duploClicar` | `doubleClick` | Move e da duplo clique |
| `cliqueDireito` | `rightClick` | Move e clica com botao direito |
| `escrever` | `type` | Move, clica e digita texto |
| `digitar` | `write` | Alias para escrever texto |
| `mic` | `mic` | Escuta microfone e emite eventos de fala |
| `mover` | `move` | Alias de movimento suave |
| `moverSuave` | `moveSmooth` | Move com interpolacao |
| `scrollar` | `scroll` | Faz scroll |
| `arrastar` | `drag` | Arrasta e solta |
| `aguardar` | `waitFor` | Aguarda uma imagem aparecer |
| `pressionar` | `press` | Segura botao do mouse |
| `soltar` | `release` | Solta botao do mouse |

## Erros comuns / Common Errors

### `Imagem alvo nao encontrada` / `Target image was not found`

O alvo nao passou do `threshold`.

Tente:

- conferir se `print.png` e `icone.png` estao na mesma escala;
- reduzir `threshold`, por exemplo `0.82`;
- usar `normalize: true`;
- recortar melhor o icone, sem bordas grandes;
- usar `scaleTolerance: 0.08` se houver diferenca de zoom.

### `Automacao de mouse indisponivel` / `Mouse automation is unavailable`

O backend de automacao nao iniciou corretamente.

Tente:

- reinstalar dependencias com `npm install`;
- verificar permissoes de acessibilidade no macOS;
- executar em uma sessao grafica real, nao em terminal sem tela;
- fornecer um backend customizado em `configurar`.

### `Automacao de teclado indisponivel` / `Keyboard automation is unavailable`

`escrever` conseguiu chegar ate a camada de teclado, mas o backend nao tem suporte a digitacao.

Tente:

- confirmar se `@nut-tree-fork/nut-js` instalou corretamente;
- testar em uma sessao grafica real;
- fornecer `typeText(text)` no backend customizado.

### `Captura de audio indisponivel` / `Audio capture is unavailable`

`mic()` nao conseguiu iniciar o gravador do sistema.

Tente:

- instalar `sox` no Windows/macOS;
- instalar `alsa-utils` no Linux para ter `arecord`;
- confirmar permissoes de microfone do sistema;
- fornecer um `recorder` customizado.

### `Transcricao offline indisponivel` / `Offline transcription is unavailable`

O Vosk nao iniciou, o modelo nao foi encontrado, ou o modelo nao pode ser baixado.

Tente:

- manter `downloadModel: true` na primeira execucao;
- configurar `modelPath` para um modelo Vosk local;
- conferir permissao de escrita em `modelsDir` ou em `~/.olhax/models`;
- usar `lang: "pt"` ou `lang: "en"`.

### `Captura de tela indisponivel` / `Screen capture is unavailable`

Chamadas como `clicar("icone.png")` precisam capturar a tela atual.

Tente:

- usar `clicar("print.png", "icone.png")`;
- passar um buffer de screenshot como `base`;
- trocar ou configurar o backend de automacao.

### `Tempo limite atingido` / `Timed out`

`aguardar` nao encontrou o alvo antes do `timeout`.

Tente:

- aumentar `timeout`;
- reduzir `interval`;
- confirmar se a tela realmente mudou;
- ajustar `threshold`.

## Backend customizado / Custom Backend

A API publica nao depende do motor interno. Voce pode trocar o reconhecimento visual ou a automacao sem mudar o codigo que usa OLHAX.

```js
visao.configurar({
  engine: meuMotorVisual,
  automation: meuBackendDeMouse
});
```

Motor visual esperado:

```js
const meuMotorVisual = {
  async find(options) {},
  async findAll(options) {},
  async compare(options) {}
};
```

Backend de automacao esperado:

```js
const meuBackendDeMouse = {
  async getPosition() {},
  async moveTo(x, y) {},
  async click(button) {},
  async doubleClick(button) {},
  async press(button) {},
  async release(button) {},
  async scroll(dx, dy) {},
  async typeText(text) {},
  async screenshot() {}
};
```

## Arquitetura

```txt
src/
  index.js              API publica CommonJS e aliases
  index.mjs             API publica ESM
  config.js             configuracao global
  i18n.js               mensagens PT/EN
  vision/               reconhecimento visual
  automation/           mouse, scroll, drag e easing
  audio/                microfone, VAD e transcricao offline
  utils/                argumentos e tempo
```

Camadas:

1. API publica curta e bilingue.
2. Automacao de mouse/scroll/drag.
3. Reconhecimento visual.
4. Preprocessamento de imagem.
5. Utilitarios.
6. Configuracao e idioma.

## Desenvolvimento / Development

```bash
npm install
npm test
npm run lint
npm pack --dry-run
```

As dependencias diretas estao travadas para evitar atualizacoes automaticas inesperadas:

```json
{
  "@nut-tree-fork/nut-js": "4.2.2",
  "sharp": "0.33.5"
}
```

## Filosofia

A OLHAX tenta esconder a parte chata: matching, preprocessamento, coordenadas, centro do alvo e movimento do cursor.

A API deve continuar parecendo isto:

```js
const alvo = await visao.encontrar("print.png", "icone.png");
await visao.clicar(alvo);
```

Simples, previsivel e facil de trocar por baixo quando o motor interno evoluir.
