import type MarkdownIt from 'markdown-it';

const STRIP_RE = /[*_`[\]#]/g;
const NON_SLUG_RE = /[^\w\s-]/g;
const WHITESPACE_RE = /\s+/g;

export const slugifyHeading = (text: string): string =>
  text
    .replace(STRIP_RE, '')
    .trim()
    .toLowerCase()
    .replace(NON_SLUG_RE, '')
    .replace(WHITESPACE_RE, '-');

export const uniqueSlug = (base: string, used: Map<string, number>): string => {
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
};

export const addHeadingAnchors = (md: MarkdownIt): void => {
  const origRule = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const e = env as { __slugs?: Map<string, number> };
    if (!e.__slugs) e.__slugs = new Map<string, number>();
    const next = tokens[idx + 1];
    if (next?.type === 'inline') {
      tokens[idx]!.attrSet('id', uniqueSlug(slugifyHeading(next.content), e.__slugs));
    }
    return origRule ? origRule(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
};
