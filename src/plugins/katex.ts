import type katexNs from 'katex';
import type MarkdownIt from 'markdown-it';

const errorMessage = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^KaTeX parse error:\s*/i, '').trim();
};

export const pluginKaTeX = (md: MarkdownIt, katex: typeof katexNs): void => {
  md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine]! + state.tShift[startLine]!;
    if (pos + 2 > state.eMarks[startLine]!) return false;
    if (state.src.slice(pos, pos + 2) !== '$$') return false;
    if (silent) return true;

    let nl = startLine;
    let found = false;
    while (++nl < endLine) {
      const lineStart = state.bMarks[nl]! + state.tShift[nl]!;
      if (state.src.slice(lineStart, lineStart + 2) === '$$') {
        found = true;
        break;
      }
    }
    if (!found) return false;

    const token = state.push('math_block', 'div', 0);
    token.content = state.getLines(startLine + 1, nl, state.tShift[startLine]!, false).trim();
    token.map = [startLine, nl + 1];
    state.line = nl + 1;
    return true;
  });

  md.renderer.rules.math_block = (tokens, idx) => {
    const token = tokens[idx]!;
    const content = token.content;
    try {
      return `<div class="katex-display">${katex.renderToString(content, {
        displayMode: true,
        throwOnError: true,
      })}</div>`;
    } catch (err) {
      const line = token.map ? token.map[0]! + 1 : null;
      const prefix = line !== null ? `Line ${line}: ` : '';
      const message = md.utils.escapeHtml(prefix + errorMessage(err));
      return `<pre class="katex-error"><strong>${message}</strong>\n${md.utils.escapeHtml(content)}</pre>`;
    }
  };

  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    if (state.src[state.pos] !== '$') return false;
    if (state.src[state.pos + 1] === '$') return false;
    let end = state.pos + 1;
    while (end < state.posMax && state.src[end] !== '$') end++;
    if (end >= state.posMax || end === state.pos + 1) return false;
    if (!silent) {
      const token = state.push('math_inline', '', 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    const content = tokens[idx]!.content;
    try {
      return katex.renderToString(content, { displayMode: false, throwOnError: true });
    } catch (err) {
      const message = md.utils.escapeHtml(errorMessage(err));
      return `<code class="katex-error" title="${message}">${md.utils.escapeHtml(content)}</code>`;
    }
  };
};
