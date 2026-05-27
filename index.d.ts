/// <reference types="node" />
import { EventEmitter } from "node:events";

/** File path, base64 string, data:image/*;base64 URI, Buffer, or Uint8Array. */
export type ImageInput = string | Buffer | Uint8Array;
export type Language = "pt" | "en";
export type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface Match {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  score: number;
  scale?: number;
  remembered?: boolean;
  lembrado?: boolean;
  key?: string;
  updatedAt?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface FindOptions {
  base?: ImageInput;
  imagem?: ImageInput;
  image?: ImageInput;
  screenshot?: ImageInput;
  print?: ImageInput;
  alvo?: ImageInput;
  target?: ImageInput;
  template?: ImageInput;
  icone?: ImageInput;
  icon?: ImageInput;
  threshold?: number;
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
}

export interface MoveOptions extends FindOptions {
  duration?: number;
  easing?: EasingName | ((t: number) => number);
  minSteps?: number;
  speed?: number;
}

export interface WriteOptions extends MoveOptions {
  texto?: string | number | boolean;
  text?: string | number | boolean;
  value?: string | number | boolean;
  content?: string | number | boolean;
  afterClickDelay?: number;
}

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

export function encontrar(base: ImageInput, alvo: ImageInput, options?: FindOptions): Promise<Match | null>;
export function encontrar(options: FindOptions): Promise<Match | null>;
export const find: typeof encontrar;

export function encontrarTodos(base: ImageInput, alvo: ImageInput, options?: FindOptions): Promise<Match[]>;
export function encontrarTodos(options: FindOptions): Promise<Match[]>;
export const findAll: typeof encontrarTodos;

export function comparar(base: ImageInput, alvo: ImageInput, options?: FindOptions): Promise<Match | null>;
export function comparar(options: FindOptions): Promise<Match | null>;
export const compare: typeof comparar;

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
export function mover(alvo: ImageInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function mover(base: ImageInput, alvo: ImageInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export const move: typeof mover;
export const moverSuave: typeof mover;
export const moveSmooth: typeof mover;

export function clicar(destino: Point | Match, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function clicar(alvo: ImageInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export function clicar(base: ImageInput, alvo: ImageInput, options?: MoveOptions): Promise<Point & { match?: Match | null }>;
export const click: typeof clicar;
export const duploClicar: typeof clicar;
export const doubleClick: typeof clicar;
export const cliqueDireito: typeof clicar;
export const rightClick: typeof clicar;

export function escrever(destino: Point | Match, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export function escrever(alvo: ImageInput, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
export function escrever(base: ImageInput, alvo: ImageInput, texto: string | number | boolean, options?: WriteOptions): Promise<Point & { match?: Match | null; text: string }>;
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

export function arrastar(from: Point | Match | ImageInput, to: Point | Match | ImageInput, options?: MoveOptions): Promise<{ from: Point; to: Point }>;
export const drag: typeof arrastar;

export function aguardar(base: ImageInput, alvo: ImageInput, options?: FindOptions): Promise<Match>;
export function aguardar(alvo: ImageInput, options?: FindOptions): Promise<Match>;
export function aguardar(options: FindOptions): Promise<Match>;
export const waitFor: typeof aguardar;

export function scrollUntil(base: ImageInput, alvo: ImageInput, options?: FindOptions): Promise<Match>;
export function scrollUntil(alvo: ImageInput, options?: FindOptions): Promise<Match>;
export function mic(options?: MicOptions): MicController;
export function screenshot(options?: ConfigOptions): Promise<Buffer>;
