/// <reference types="node" />

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
}

export interface MoveOptions extends FindOptions {
  duration?: number;
  easing?: EasingName | ((t: number) => number);
  minSteps?: number;
  speed?: number;
}

export interface ConfigOptions extends FindOptions {
  timeout?: number;
  interval?: number;
  movement?: MoveOptions;
  click?: {
    delay?: number;
    button?: "left" | "right" | "middle";
  };
  scroll?: {
    amount?: number;
    stepDelay?: number;
    maxScrolls?: number;
  };
  engine?: unknown;
  automation?: unknown;
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
export function screenshot(options?: ConfigOptions): Promise<Buffer>;
