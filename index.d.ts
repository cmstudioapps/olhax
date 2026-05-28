/// <reference types="node" />
import { EventEmitter } from "node:events";

/** File path, base64 string, data:image/*;base64 URI, Buffer, or Uint8Array. */
export type ImageInput = string | Buffer | Uint8Array;
/** One target image, or variants of the same target image. */
export type TargetInput = ImageInput | ImageInput[];
/** One target text, or variants of the same target text. */
export type TextTarget = string | string[];
export type Language = "pt" | "en";
export type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";
export type AreaName =
  | "inferior"
  | "superior"
  | "esquerda"
  | "direita"
  | "centro"
  | "inferior-esquerda"
  | "inferior-direita"
  | "superior-esquerda"
  | "superior-direita"
  | "bottom"
  | "top"
  | "left"
  | "right"
  | "center"
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export interface SearchRegion {
  /** Left coordinate in pixels, or 0..1 for a percentage of the base image width. */
  x: number;
  /** Top coordinate in pixels, or 0..1 for a percentage of the base image height. */
  y: number;
  /** Width in pixels, or 0..1 for a percentage of the base image width. */
  width: number;
  /** Height in pixels, or 0..1 for a percentage of the base image height. */
  height: number;
}

export type SearchArea = AreaName | SearchRegion;

export interface Match {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  score: number;
  scale?: number;
  /** String target variant that produced this match, when available. */
  target?: string;
  /** Named search area that produced this match, when available. */
  area?: string;
  /** Pixel search region that produced this match, when available. */
  region?: SearchRegion;
  remembered?: boolean;
  lembrado?: boolean;
  key?: string;
  updatedAt?: string;
}

export interface TextMatch extends Match {
  text: string;
  texto: string;
  targetText: string;
  textScore?: number;
  confidence?: number;
  recognizedText?: string;
  ocr?: boolean;
  kind?: "region" | "block" | "paragraph" | "line" | "word" | "words" | string;
}

export interface Point {
  x: number;
  y: number;
}

export interface OcrOptions {
  lang?: string;
  idioma?: string;
  scale?: number;
  cachePath?: string;
  cacheMethod?: "write" | "readOnly" | "refresh" | "none" | string;
  langPath?: string;
  corePath?: string;
  workerPath?: string;
  dataPath?: string;
  gzip?: boolean;
  psm?: string | number;
  oem?: number;
  params?: Record<string, unknown>;
  workerOptions?: Record<string, unknown>;
  recognizeOptions?: Record<string, unknown>;
  config?: string | Record<string, unknown>;
  engine?: unknown;
}

export interface FindOptions {
  base?: ImageInput;
  imagem?: ImageInput;
  image?: ImageInput;
  screenshot?: ImageInput;
  print?: ImageInput;
  alvo?: TargetInput;
  target?: TargetInput;
  template?: TargetInput;
  icone?: TargetInput;
  icon?: TargetInput;
  threshold?: number;
  /** Named area or percentage/pixel rectangle that limits the visual search. */
  area?: SearchArea;
  /** Percentage/pixel rectangle that limits the visual search. */
  region?: SearchRegion;
  /** Portuguese alias for area/region. */
  regiao?: SearchArea;
  /** Alias for region. */
  bounds?: SearchRegion;
  /** Alias for area/region. */
  where?: SearchArea;
  maxMatches?: number;
  minDistance?: number;
  searchStep?: number;
  scales?: number[];
  scaleTolerance?: number;
  toleranciaEscala?: number;
  blur?: boolean | number;
  sharpen?: boolean;
  normalize?: boolean;
  language?: Language;
  lembrar?: string | boolean;
  remember?: string | boolean;
  memoria?: string | boolean;
  memoryKey?: string;
  nome?: string;
  name?: string;
  usarLembrado?: boolean;
  useRemembered?: boolean;
  preferirLembrado?: boolean;
  preferRemembered?: boolean;
  memoryDir?: string;
  lembrarDir?: string;
  memoryFile?: string;
  arquivoMemoria?: string;
  ttlMs?: number;
  ocr?: OcrOptions;
  ocrEngine?: unknown;
  ocrLang?: string;
  idiomaOcr?: string;
  ocrScale?: number;
  escalaOcr?: number;
  textScale?: number;
  textThreshold?: number;
  ocrPsm?: string | number;
  ocrParams?: Record<string, unknown>;
}

export interface MoveOptions extends FindOptions {
  duration?: number;
  easing?: EasingName | ((t: number) => number);
  minSteps?: number;
  speed?: number;
  arrivalTolerance?: number;
  toleranciaChegada?: number;
  arrivalTimeout?: number;
  tempoChegada?: number;
  arrivalInterval?: number;
  intervaloChegada?: number;
  settleMs?: number;
  aguardarEstavelMs?: number;
  verifyArrival?: boolean;
  verificarChegada?: boolean;
}

export interface WriteOptions extends MoveOptions {
  texto?: string | number | boolean;
  text?: string | number | boolean;
  value?: string | number | boolean;
  content?: string | number | boolean;
  afterClickDelay?: number;
}

export interface TextFindOptions extends Omit<FindOptions, "alvo" | "target" | "template" | "icone" | "icon"> {
  texto?: TextTarget;
  text?: TextTarget;
  textoAlvo?: TextTarget;
  alvoTexto?: TextTarget;
  targetText?: TextTarget;
  textTarget?: TextTarget;
  palavra?: TextTarget;
  word?: TextTarget;
  frase?: TextTarget;
  phrase?: TextTarget;
  query?: TextTarget;
  busca?: TextTarget;
  search?: TextTarget;
}

export interface TextMoveOptions extends TextFindOptions, Omit<MoveOptions, keyof FindOptions> {}

export interface ConfigOptions extends FindOptions {
  timeout?: number;
  interval?: number;
  movement?: MoveOptions;
  click?: {
    delay?: number;
    button?: "left" | "right" | "middle";
  };
  write?: {
    afterClickDelay?: number;
  };
  ocr?: OcrOptions;
  ocrEngine?: unknown;
  scroll?: {
    amount?: number;
    stepDelay?: number;
    maxScrolls?: number;
  };
  mic?: MicOptions;
  memory?: {
    file?: string;
    ttlMs?: number | null;
    prefer?: boolean;
  };
  engine?: unknown;
  automation?: unknown;
}

export interface MicAudioEvent {
  audio: Buffer;
  rms: number;
  speech: boolean;
  durationMs: number;
}

export interface MicSegment {
  audio: Buffer;
  pcm: Buffer;
  wav: Buffer;
  durationMs: number;
  reason: "silence" | "stop" | "maxSegmentMs" | string;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface MicTranscription extends MicSegment {
  text: string;
  raw?: unknown;
}

export interface MicModelEvent {
  phase?: "download" | "extract" | "ready" | string;
  model?: string;
  loaded?: number;
  total?: number;
  path?: string;
}

export interface MicOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  threshold?: number;
  silenceMs?: number;
  preSpeechMs?: number;
  minSpeechMs?: number;
  maxSegmentMs?: number;
  lang?: "pt" | "en" | string;
  idioma?: "pt" | "en" | string;
  modelPath?: string;
  modelsDir?: string;
  downloadModel?: boolean;
  baixarModelo?: boolean;
  grammar?: string[];
  words?: boolean;
  partialWords?: boolean;
  voskLogLevel?: number;
  device?: string;
  debug?: boolean;
  autoStart?: boolean;
  recorder?: {
    stream: EventEmitter;
    start(): void;
    stop?(): void;
  };
}

export interface MicController extends EventEmitter {
  start(): this;
  iniciar(): this;
  stop(): this;
  parar(): this;
  isListening(): boolean;
  ouvindo(): boolean;
  on(event: "audio", listener: (event: MicAudioEvent) => void): this;
  on(event: "falaInicio" | "speechStart", listener: (event: { rms: number }) => void): this;
  on(event: "falaFim" | "speechEnd", listener: (event: MicSegment) => void): this;
  on(event: "transcricaoParcial" | "partialTranscription", listener: (event: MicTranscription) => void): this;
  on(event: "transcricao" | "transcription", listener: (event: MicTranscription) => void): this;
  on(event: "modelo" | "model", listener: (event: MicModelEvent) => void): this;
  on(event: "inicio" | "start", listener: (event: { sampleRate: number; modelPath?: string }) => void): this;
  on(event: "fim" | "stop", listener: () => void): this;
  on(event: "erro" | "error", listener: (error: Error) => void): this;
}

export function configurar(options?: ConfigOptions): ConfigOptions;
export const config: typeof configurar;
export function obterConfig(options?: ConfigOptions): ConfigOptions;
export const getConfig: typeof obterConfig;

export function encontrar(base: ImageInput, alvo: TargetInput, options?: FindOptions): Promise<Match | null>;
export function encontrar(options: FindOptions): Promise<Match | null>;
export const find: typeof encontrar;

export function encontrarTodos(base: ImageInput, alvo: TargetInput, options?: FindOptions): Promise<Match[]>;
export function encontrarTodos(options: FindOptions): Promise<Match[]>;
export const findAll: typeof encontrarTodos;

export function comparar(base: ImageInput, alvo: TargetInput, options?: FindOptions): Promise<Match | null>;
export function comparar(options: FindOptions): Promise<Match | null>;
export const compare: typeof comparar;

export function encontrarTexto(texto: TextTarget, options?: TextFindOptions): Promise<TextMatch | null>;
export function encontrarTexto(base: ImageInput, texto: TextTarget, options?: TextFindOptions): Promise<TextMatch | null>;
export function encontrarTexto(options: TextFindOptions): Promise<TextMatch | null>;
export const findText: typeof encontrarTexto;
export const procurarTexto: typeof encontrarTexto;
export const searchText: typeof encontrarTexto;

export function encontrarTextos(texto: TextTarget, options?: TextFindOptions): Promise<TextMatch[]>;
export function encontrarTextos(base: ImageInput, texto: TextTarget, options?: TextFindOptions): Promise<TextMatch[]>;
export function encontrarTextos(options: TextFindOptions): Promise<TextMatch[]>;
export const findAllText: typeof encontrarTextos;

export function compararTexto(texto: TextTarget, options?: TextFindOptions): Promise<TextMatch | null>;
export function compararTexto(base: ImageInput, texto: TextTarget, options?: TextFindOptions): Promise<TextMatch | null>;
export function compararTexto(options: TextFindOptions): Promise<TextMatch | null>;
export const compareText: typeof compararTexto;

export function centro(match: Match): Point;
export const center: typeof centro;
export function lembrar(key: string, match: Match | Point, options?: ConfigOptions): Promise<Match | null>;
export const remember: typeof lembrar;
export function lembrado(key: string, options?: ConfigOptions): Promise<Match | null>;
export const remembered: typeof lembrado;
export const recall: typeof lembrado;
export function esquecer(key: string, options?: ConfigOptions): Promise<boolean>;
export const forget: typeof esquecer;
export function listarLembrados(options?: ConfigOptions): Promise<Record<string, Match>>;
export const listRemembered: typeof listarLembrados;

export function mover(destino: Point | Match, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function mover(alvo: TargetInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function mover(base: ImageInput, alvo: TargetInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export const move: typeof mover;
export const moverSuave: typeof mover;
export const moveSmooth: typeof mover;

export function clicar(destino: Point | Match, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function clicar(alvo: TargetInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function clicar(base: ImageInput, alvo: TargetInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function clicar(options: TextMoveOptions): Promise<Point & { match?: TextMatch | null }>;
export const click: typeof clicar;
export function clicarTexto(texto: TextTarget, options?: TextMoveOptions): Promise<Point & { match?: TextMatch | null }>;
export function clicarTexto(base: ImageInput, texto: TextTarget, options?: TextMoveOptions): Promise<Point & { match?: TextMatch | null }>;
export function clicarTexto(options: TextMoveOptions): Promise<Point & { match?: TextMatch | null }>;
export const clickText: typeof clicarTexto;
export const duploClicar: typeof clicar;
export const doubleClick: typeof clicar;
export const cliqueDireito: typeof clicar;
export const rightClick: typeof clicar;

export function escrever(destino: Point | Match, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export function escrever(alvo: TargetInput, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export function escrever(base: ImageInput, alvo: TargetInput, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export function escrever(options: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export const type: typeof escrever;
export const digitar: typeof escrever;
export const write: typeof escrever;

export function pressionar(button?: "left" | "right" | "middle", options?: ConfigOptions): Promise<void>;
export const press: typeof pressionar;
export function soltar(button?: "left" | "right" | "middle", options?: ConfigOptions): Promise<void>;
export const release: typeof soltar;

export function scrollar(amount: number, options?: ConfigOptions): Promise<{ dx: number; dy: number }>;
export function scrollar(options: { x?: number; y?: number; dx?: number; dy?: number; horizontal?: number; vertical?: number }): Promise<{ dx: number; dy: number }>;
export const scroll: typeof scrollar;

export function arrastar(from: Point | Match | TargetInput, to: Point | Match | TargetInput, options?: MoveOptions): Promise<{ from: Point; to: Point }>;
export const drag: typeof arrastar;

export function aguardar(base: ImageInput, alvo: TargetInput, options?: FindOptions): Promise<Match>;
export function aguardar(alvo: TargetInput, options?: FindOptions): Promise<Match>;
export function aguardar(options: FindOptions): Promise<Match>;
export const waitFor: typeof aguardar;

export function scrollUntil(base: ImageInput, alvo: TargetInput, options?: FindOptions): Promise<Match>;
export function scrollUntil(alvo: TargetInput, options?: FindOptions): Promise<Match>;
export function mic(options?: MicOptions): MicController;
export function screenshot(options?: ConfigOptions): Promise<Buffer>;
export const print: typeof screenshot;
export const capturar: typeof screenshot;
export const capture: typeof screenshot;
