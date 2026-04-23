// Notion flavor: `?> summary` opens a toggle wrapping the next blockquote;
// `{callout:color}…{callout}` fences into `<aside class="notion-callout">`;
// inline `@mention` and `/command` render as styled spans.
import type MarkdownIt from 'markdown-it';

const CALLOUT_COLORS = new Set([
  'blue',
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'purple',
  'pink',
]);

const TOGGLE_RE = /^\?>[ \t]*(.*)$/;
const CALLOUT_RE = /\{callout:([a-z]+)\}([\s\S]*?)\{callout\}/gi;
const MENTION_BOUNDARY_RE = /\w/;
const MENTION_RE = /^@(\w[\w.-]*)/;
const SLASH_RE = /^\/(\w[\w-]*)/;

// Built-in text terminators per markdown-it + `/` so slash-command rule sees it.
const isTextTerminator = (ch: number): boolean => {
  switch (ch) {
    case 0x0a: // \n
    case 0x21: // !
    case 0x23: // #
    case 0x24: // $
    case 0x25: // %
    case 0x26: // &
    case 0x2a: // *
    case 0x2b: // +
    case 0x2d: // -
    case 0x2f: // /
    case 0x3a: // :
    case 0x3c: // <
    case 0x3d: // =
    case 0x3e: // >
    case 0x40: // @
    case 0x5b: // [
    case 0x5c: // \
    case 0x5d: // ]
    case 0x5e: // ^
    case 0x5f: // _
    case 0x60: // `
    case 0x7b: // {
    case 0x7d: // }
    case 0x7e: // ~
      return true;
    default:
      return false;
  }
};

export const pluginNotion = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'notion_callout', (state) => {
    state.src = state.src.replace(CALLOUT_RE, (match, rawColor: string, body: string) => {
      const color = rawColor.toLowerCase();
      if (!CALLOUT_COLORS.has(color)) return match;
      return `\n<aside class="notion-callout" data-color="${color}">\n\n${body.trim()}\n\n</aside>\n`;
    });
  });

  md.core.ruler.before('normalize', 'notion_toggle', (state) => {
    const lines = state.src.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const match = line.match(TOGGLE_RE);
      if (!match) {
        out.push(line);
        continue;
      }
      const summary = md.utils.escapeHtml(match[1]!.trim() || 'Toggle');
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j]!.startsWith('>')) {
        body.push(lines[j]!.replace(/^>[ \t]?/, ''));
        j++;
      }
      out.push(
        '',
        `<details class="notion-toggle"><summary>${summary}</summary>`,
        '',
        body.join('\n'),
        '',
        '</details>',
        '',
      );
      i = j - 1;
    }
    state.src = out.join('\n');
  });

  md.inline.ruler.at('text', (state, silent) => {
    let pos = state.pos;
    const max = state.posMax;
    while (pos < max && !isTextTerminator(state.src.charCodeAt(pos))) pos++;
    if (pos === state.pos) return false;
    if (!silent) state.pending += state.src.slice(state.pos, pos);
    state.pos = pos;
    return true;
  });

  md.inline.ruler.push('notion_mention', (state, silent) => {
    if (state.src[state.pos] !== '@') return false;
    if (state.pos > 0 && MENTION_BOUNDARY_RE.test(state.src[state.pos - 1]!)) return false;
    const match = state.src.slice(state.pos).match(MENTION_RE);
    if (!match) return false;
    if (!silent) {
      const token = state.push('notion_mention', '', 0);
      token.content = match[1]!;
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.notion_mention = (tokens, idx) =>
    `<span class="notion-mention">@${md.utils.escapeHtml(tokens[idx]!.content)}</span>`;

  md.inline.ruler.push('notion_slash', (state, silent) => {
    if (state.src[state.pos] !== '/') return false;
    if (state.pos > 0 && MENTION_BOUNDARY_RE.test(state.src[state.pos - 1]!)) return false;
    const match = state.src.slice(state.pos).match(SLASH_RE);
    if (!match) return false;
    if (!silent) {
      const token = state.push('notion_slash', '', 0);
      token.content = match[1]!;
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.notion_slash = (tokens, idx) =>
    `<code class="notion-slash">/${md.utils.escapeHtml(tokens[idx]!.content)}</code>`;
};
