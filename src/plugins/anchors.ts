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
  const origRule = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const next = tokens[idx + 1];
    if (next?.type === 'inline') {
      tokens[idx]!.attrSet('id', slugifyHeading(next.content));
    }
    return origRule ? origRule(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
};
