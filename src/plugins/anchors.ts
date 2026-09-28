import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { slugifyHeading, uniqueSlug } from '../slug.ts';
import type { DocHeading, RenderEnv } from '../types.ts';

/** The reader-visible text of an inline token (what a slug and TOC entry show). */
export const inlineText = (token: Token): string =>
  (token.children ?? [])
    .map((child) => {
      if (child.type === 'html_inline') return '';
      if (child.type === 'softbreak' || child.type === 'hardbreak') return ' ';
      if (child.type === 'image') return inlineText(child);
      return child.content;
    })
    .join('')
    .trim();

/**
 * Assigns every heading a unique id and records the outline in
 * `env.headings`, so the TOC links exactly the ids that get rendered.
 */
export const addHeadingAnchors = (md: MarkdownIt): void => {
  md.core.ruler.push('heading_ids', (state) => {
    const used = new Map<string, number>();
    const headings: DocHeading[] = [];
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!;
      const inline = tokens[i + 1];
      if (open.type !== 'heading_open' || inline?.type !== 'inline') continue;
      const text = inlineText(inline);
      const base = slugifyHeading(text);
      if (!base) continue;
      const slug = uniqueSlug(base, used);
      open.attrSet('id', slug);
      headings.push({ level: Number(open.tag.slice(1)), text, slug });
    }
    (state.env as RenderEnv).headings = headings;
  });

  const origRule = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const open = origRule
      ? origRule(tokens, idx, opts, env, self)
      : self.renderToken(tokens, idx, opts);
    const id = tokens[idx]!.attrGet('id');
    if (!id) return open;
    const icon =
      '<svg class="heading-anchor-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    const anchor = `<a class="heading-anchor" href="#${md.utils.escapeHtml(id)}" aria-label="Copy link to this heading">${icon}</a>`;
    return `${open}${anchor}`;
  };
};
