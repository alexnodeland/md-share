import type MarkdownIt from 'markdown-it';

const STATUS_PREFIX = '{status:';
const MENTION_BOUNDARY_RE = /\w/;
const MENTION_RE = /^@([\w][\w.-]*)/;
const COLOR_RE = /color=(\w+)/i;
const TITLE_RE = /title=([^|}]+)/i;

interface StatusMeta {
  color: string;
  title: string;
}

export const pluginAtlassianInline = (md: MarkdownIt): void => {
  md.inline.ruler.push('atl_status', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + STATUS_PREFIX.length) !== STATUS_PREFIX) {
      return false;
    }
    const end = state.src.indexOf('}', state.pos);
    if (end < 0) return false;
    const params = state.src.slice(state.pos + STATUS_PREFIX.length, end);
    if (!silent) {
      const colorMatch = params.match(COLOR_RE);
      const titleMatch = params.match(TITLE_RE);
      const token = state.push('atl_status', '', 0);
      token.meta = {
        color: (colorMatch?.[1] ?? 'grey').toLowerCase(),
        title: titleMatch?.[1] ?? 'STATUS',
      } satisfies StatusMeta;
    }
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.atl_status = (tokens, idx) => {
    const meta = tokens[idx]?.meta as StatusMeta | undefined;
    if (!meta) return '';
    return `<span class="atl-status atl-status-${meta.color}">${md.utils.escapeHtml(meta.title)}</span>`;
  };

  md.inline.ruler.push('atl_mention', (state, silent) => {
    if (state.src[state.pos] !== '@') return false;
    if (state.pos > 0 && MENTION_BOUNDARY_RE.test(state.src[state.pos - 1] ?? '')) return false;
    const match = state.src.slice(state.pos).match(MENTION_RE);
    if (!match) return false;
    if (!silent) {
      const token = state.push('atl_mention', '', 0);
      token.content = match[1] ?? '';
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.atl_mention = (tokens, idx) => {
    const content = tokens[idx]?.content ?? '';
    return `<span class="atl-mention">@${md.utils.escapeHtml(content)}</span>`;
  };
};
