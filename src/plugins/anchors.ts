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

export const addHeadingAnchors = (md: MarkdownIt): void => {
  const origRule =
    md.renderer.rules.heading_open ??
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const next = tokens[idx + 1];
    const token = tokens[idx];
    if (next?.type === 'inline' && token) {
      token.attrSet('id', slugifyHeading(next.content));
    }
    return origRule(tokens, idx, opts, env, self);
  };
};
