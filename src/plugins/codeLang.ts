import type MarkdownIt from 'markdown-it';

export const addCodeLangLabels = (md: MarkdownIt): void => {
  const origFence = md.renderer.rules.fence as NonNullable<typeof md.renderer.rules.fence>;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (!token) return '';
    const html = origFence(tokens, idx, opts, env, self);
    const lang = token.info.trim().replace(/\s.*/, '').toLowerCase();
    if (!lang || lang === 'mermaid') return html;
    return html.replace(/^<pre\b([^>]*)>/, `<pre$1 data-lang="${md.utils.escapeHtml(lang)}">`);
  };
};
