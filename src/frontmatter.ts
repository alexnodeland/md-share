export type Direction = 'ltr' | 'rtl' | 'auto';

export interface Frontmatter {
  meta: Record<string, string>;
  body: string;
  dir: Direction;
  lang: string | null;
}

const DELIMITER_OPEN = /^---\r?\n/;
const DELIMITER_CLOSE = /\r?\n---[ \t]*(?:\r?\n|$)/;

const DIRECTIONS = new Set<Direction>(['ltr', 'rtl', 'auto']);

const isDirection = (value: string): value is Direction => DIRECTIONS.has(value as Direction);

const resolveDir = (value: string | undefined): Direction => {
  if (value === undefined) return 'auto';
  const lower = value.toLowerCase();
  return isDirection(lower) ? lower : 'auto';
};

const resolveLang = (value: string | undefined): string | null => {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const parseFrontmatter = (source: string): Frontmatter => {
  const openMatch = DELIMITER_OPEN.exec(source);
  if (!openMatch) return { meta: {}, body: source, dir: 'auto', lang: null };
  const rest = source.slice(openMatch[0].length);
  const closeMatch = DELIMITER_CLOSE.exec(rest);
  if (!closeMatch) return { meta: {}, body: source, dir: 'auto', lang: null };
  const yaml = rest.slice(0, closeMatch.index);
  const body = rest.slice(closeMatch.index + closeMatch[0].length).replace(/^\r?\n/, '');
  const meta: Record<string, string> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 1) continue;
    const key = trimmed.slice(0, colon).trim();
    const raw = trimmed.slice(colon + 1).trim();
    meta[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
  if (Object.keys(meta).length === 0) return { meta: {}, body: source, dir: 'auto', lang: null };
  return { meta, body, dir: resolveDir(meta.dir), lang: resolveLang(meta.lang) };
};

export const renderFrontmatter = (
  meta: Record<string, string>,
  escapeHtml: (s: string) => string,
): string => {
  const entries = Object.entries(meta);
  if (entries.length === 0) return '';
  const rows = entries
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
    .join('');
  return `<dl class="frontmatter">${rows}</dl>`;
};
