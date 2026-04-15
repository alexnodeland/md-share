export type Flavor = 'gfm' | 'commonmark' | 'extended' | 'academic' | 'obsidian' | 'atlassian';

export const FLAVOR_NAMES = [
  'gfm',
  'commonmark',
  'extended',
  'academic',
  'obsidian',
  'atlassian',
] as const satisfies readonly Flavor[];

export const isFlavor = (x: unknown): x is Flavor =>
  typeof x === 'string' && (FLAVOR_NAMES as readonly string[]).includes(x);

export interface ShareParams {
  source: string | null;
  flavor: Flavor | null;
}

export interface TocHeading {
  level: 2 | 3 | 4;
  text: string;
  slug: string;
}

export interface SpeechChunk {
  text: string;
  el: Element | null;
}

export type Theme = 'dark' | 'light';
