import type MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';

const OPEN_RE = /^\{(info|note|warning|tip|error|expand|code)(?::([^}]*))?\}/i;

/** `title=Release Notes|icon=false` → `Release Notes` */
const panelTitle = (params: string): string => {
  const entry = params.split('|').find((p) => /^\s*title\s*=/i.test(p));
  return entry ? entry.slice(entry.indexOf('=') + 1).trim() : '';
};

const lineText = (state: StateBlock, line: number): string =>
  state.src.slice(state.bMarks[line]! + state.tShift[line]!, state.eMarks[line]).trimEnd();

/** Index of the line that is exactly `{name}` (case-insensitive), or -1. */
const findCloseLine = (state: StateBlock, from: number, endLine: number, tag: string): number => {
  for (let line = from; line < endLine; line++) {
    if (lineText(state, line).toLowerCase() === tag) return line;
  }
  return -1;
};

/**
 * Confluence wiki macros as a block rule rather than a regex pre-pass, so
 * macro text inside code fences stays literal, nesting works, and token line
 * maps still point at the editor source. Supported forms:
 *
 *     {info:title=T}          {info}One line{info}
 *     body (Markdown)
 *     {info}
 */
export const pluginAtlassianBlocks = (md: MarkdownIt): void => {
  md.block.ruler.before(
    'fence',
    'atl_macro',
    (state, startLine, endLine, silent) => {
      const first = lineText(state, startLine);
      const match = OPEN_RE.exec(first);
      if (!match) return false;
      const name = match[1]!.toLowerCase();
      const params = match[2] ?? '';
      const tag = `{${name}}`;
      const rest = first.slice(match[0].length);

      let closeLine = startLine;
      let inline: string | null = null;
      if (rest) {
        if (!rest.toLowerCase().endsWith(tag)) return false;
        inline = rest.slice(0, -tag.length);
      } else {
        closeLine = findCloseLine(state, startLine + 1, endLine, tag);
        if (closeLine === -1) return false;
      }
      if (silent) return true;

      const map: [number, number] = [startLine, closeLine + 1];
      if (name === 'code') {
        const token = state.push('fence', 'code', 0);
        token.info = params.trim();
        token.markup = '```';
        token.content =
          inline !== null
            ? `${inline}\n`
            : state.getLines(startLine + 1, closeLine, state.blkIndent, true);
        token.map = map;
        state.line = closeLine + 1;
        return true;
      }

      const kind = name === 'expand' ? 'atl_expand' : 'atl_panel';
      const open = state.push(`${kind}_open`, 'div', 1);
      open.meta = { type: name, title: name === 'expand' ? params.trim() : panelTitle(params) };
      open.map = map;
      if (inline !== null) {
        state.push('paragraph_open', 'p', 1).map = map;
        const text = state.push('inline', '', 0);
        text.content = inline.trim();
        text.map = map;
        text.children = [];
        state.push('paragraph_close', 'p', -1);
      } else {
        const oldLineMax = state.lineMax;
        state.lineMax = closeLine;
        state.md.block.tokenize(state, startLine + 1, closeLine);
        state.lineMax = oldLineMax;
      }
      state.push(`${kind}_close`, 'div', -1);
      state.line = closeLine + 1;
      return true;
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
  );

  md.renderer.rules.atl_panel_open = (tokens, idx) => {
    const { type, title } = tokens[idx]!.meta as { type: string; title: string };
    return `<div class="atl-panel atl-panel-${type}"><div class="atl-panel-title">${md.utils.escapeHtml(title || type)}</div>\n`;
  };
  md.renderer.rules.atl_panel_close = () => '</div>\n';
  md.renderer.rules.atl_expand_open = (tokens, idx) => {
    const { title } = tokens[idx]!.meta as { title: string };
    return `<details class="atl-expand"><summary>${md.utils.escapeHtml(title || 'Click to expand')}</summary><div class="expand-body">\n`;
  };
  md.renderer.rules.atl_expand_close = () => '</div></details>\n';
};
