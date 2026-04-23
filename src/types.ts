export type Flavor =
  | 'commonmark'
  | 'extended'
  | 'academic'
  | 'gfm'
  | 'obsidian'
  | 'atlassian'
  | 'notion';

export const FLAVOR_NAMES = [
  'commonmark',
  'extended',
  'academic',
  'gfm',
  'obsidian',
  'atlassian',
  'notion',
] as const satisfies readonly Flavor[];

export const isFlavor = (x: unknown): x is Flavor =>
  typeof x === 'string' && (FLAVOR_NAMES as readonly string[]).includes(x);

export interface ShareParams {
  source: string | null;
  flavor: Flavor | null;
  anchor: string | null;
}

export interface TocHeading {
  level: 2 | 3 | 4;
  text: string;
  slug: string;
}

export interface SpeechChunk {
  text: string;
  el: Element | null;
  lang?: string;
}

export type Theme = 'dark' | 'light';
