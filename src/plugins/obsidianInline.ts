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

  // `==text==`; the inner text is parsed as Markdown, and — like emphasis —
  // it can't start or end with a space, so `a == b` stays plain text.
  md.inline.ruler.push('obsidian_highlight', (state, silent) => {
    const start = state.pos + 2;
    if (!state.src.startsWith('==', state.pos)) return false;
    const end = state.src.indexOf('==', start);
    if (end < 0 || end > state.posMax - 2 || end === start) return false;
    if (/\s/.test(state.src[start]!) || /\s/.test(state.src[end - 1]!)) return false;
    if (!silent) {
      const oldMax = state.posMax;
      state.push('mark_open', 'mark', 1);
      state.pos = start;
      state.posMax = end;
      state.md.inline.tokenize(state);
      state.posMax = oldMax;
      state.push('mark_close', 'mark', -1);
    }
    state.pos = end + 2;
    return true;
  });

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
