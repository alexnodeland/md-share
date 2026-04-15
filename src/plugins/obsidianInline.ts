import type MarkdownIt from 'markdown-it';

const TAG_RE = /^#([\w][\w/-]*)/;
const MENTION_BOUNDARY_RE = /\w/;

export const pluginObsidianInline = (md: MarkdownIt): void => {
  md.inline.ruler.push('wikilink', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '[[') return false;
    const end = state.src.indexOf(']]', state.pos + 2);
    if (end < 0) return false;
    if (!silent) {
      const raw = state.src.slice(state.pos + 2, end);
      const parts = raw.split('|');
      const target = parts[0]!.trim();
      const display = parts.length > 1 ? parts[1]!.trim() : target;
      const token = state.push('wikilink', '', 0);
      token.content = display;
      token.meta = { target };
    }
    state.pos = end + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const token = tokens[idx]!;
    const target = token.meta.target as string;
    return `<span class="wikilink" title="${md.utils.escapeHtml(target)}">${md.utils.escapeHtml(token.content)}</span>`;
  };

  md.inline.ruler.push('obsidian_highlight', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '==') return false;
    const end = state.src.indexOf('==', state.pos + 2);
    if (end < 0) return false;
    if (!silent) {
      const token = state.push('obsidian_highlight', '', 0);
      token.content = state.src.slice(state.pos + 2, end);
    }
    state.pos = end + 2;
    return true;
  });

  md.renderer.rules.obsidian_highlight = (tokens, idx) =>
    `<mark>${md.utils.escapeHtml(tokens[idx]!.content)}</mark>`;

  md.inline.ruler.push('obsidian_tag', (state, silent) => {
    if (state.src[state.pos] !== '#') return false;
    if (state.pos > 0 && MENTION_BOUNDARY_RE.test(state.src[state.pos - 1]!)) return false;
    const match = state.src.slice(state.pos).match(TAG_RE);
    if (!match) return false;
    if (!silent) {
      const token = state.push('obsidian_tag', '', 0);
      token.content = match[1]!;
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.obsidian_tag = (tokens, idx) =>
    `<span class="obsidian-tag">#${md.utils.escapeHtml(tokens[idx]!.content)}</span>`;
};
