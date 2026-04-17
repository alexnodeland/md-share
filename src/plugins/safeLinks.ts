import type MarkdownIt from 'markdown-it';

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

const isExternal = (href: string): boolean => EXTERNAL_RE.test(href);

export const applySafeLinks = (md: MarkdownIt): void => {
  const orig = md.renderer.rules.link_open;
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]!;
    const href = token.attrGet('href');
    if (href && isExternal(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
    return orig ? orig(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
};
