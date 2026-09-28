export type Flavor = 'commonmark' | 'extended' | 'academic' | 'gfm' | 'obsidian' | 'atlassian';

export const FLAVOR_NAMES = [
  'commonmark',
  'extended',
  'academic',
  'gfm',
  'obsidian',
  'atlassian',
] as const satisfies readonly Flavor[];

export const isFlavor = (x: unknown): x is Flavor =>
  typeof x === 'string' && (FLAVOR_NAMES as readonly string[]).includes(x);

export interface ShareParams {
  source: string | null;
  flavor: Flavor | null;
  anchor: string | null;
}

export interface DocHeading {
  level: number;
  text: string;
  slug: string;
}

/** The markdown-it `env` object md-share's plugins read from and write to. */
export interface RenderEnv {
  /** Filled by the heading-anchor rule: every heading with an id, in order. */
  headings?: DocHeading[];
  /** Source lines stripped before rendering (frontmatter), so line maps point into the editor. */
  lineOffset?: number;
}

export interface SpeechChunk {
  text: string;
  el: Element | null;
}

export type Theme = 'dark' | 'light';
