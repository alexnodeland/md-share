import type MarkdownIt from 'markdown-it';
import { slugifyHeading, uniqueSlug } from '../slug.ts';

export const addHeadingAnchors = (md: MarkdownIt): void => {
  const origRule = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const e = env as { __slugs?: Map<string, number> };
    if (!e.__slugs) e.__slugs = new Map<string, number>();
    const next = tokens[idx + 1];
    if (next?.type === 'inline') {
      tokens[idx]!.attrSet('id', uniqueSlug(slugifyHeading(next.content), e.__slugs));
    }
    const open = origRule
      ? origRule(tokens, idx, opts, env, self)
      : self.renderToken(tokens, idx, opts);
    const id = tokens[idx]!.attrGet('id');
    if (!id) return open;
    const icon =
      '<svg class="heading-anchor-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    const anchor = `<a class="heading-anchor" href="#${id}" aria-label="Copy link to this heading">${icon}</a>`;
    return `${open}${anchor}`;
  };
};
