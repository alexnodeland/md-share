import type katexNs from 'katex';
import type MarkdownIt from 'markdown-it';

const errorMessage = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^KaTeX parse error:\s*/i, '').trim();
};

const WHITESPACE_RE = /\s/;
const DIGIT_RE = /\d/;
/** `$5`, `$10,000`, `$3.50.` — a price, not an opening delimiter. */
const CURRENCY_RE = /^\d[\d,.]*(?=[\s,.;:!?)]|$)/;

export const pluginKaTeX = (md: MarkdownIt, katex: typeof katexNs): void => {
  md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine]! + state.tShift[startLine]!;
    const firstLine = state.src.slice(pos, state.eMarks[startLine]).trimEnd();
    if (!firstLine.startsWith('$$')) return false;
    const opener = firstLine.slice(2);

    // `$$ … $$` on one line, or `$$` … a line ending in `$$`.
    const singleLine = opener.length >= 2 && opener.endsWith('$$');
    let lastLine = startLine;
    let closer = '';
    if (!singleLine) {
      let found = false;
      while (++lastLine < endLine) {
        const lineStart = state.bMarks[lastLine]! + state.tShift[lastLine]!;
        const line = state.src.slice(lineStart, state.eMarks[lastLine]).trimEnd();
        if (line.endsWith('$$')) {
          closer = line.slice(0, -2);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    if (silent) return true;

    const content = singleLine
      ? opener.slice(0, -2)
      : [
          opener,
          state.getLines(startLine + 1, lastLine, state.tShift[startLine]!, false),
          closer,
        ].join('\n');

    const token = state.push('math_block', 'div', 0);
    token.content = content.trim();
    token.map = [startLine, lastLine + 1];
    state.line = lastLine + 1;
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

  // Pandoc's rules, so prices like "$5 and $10" stay text: the opening `$`
  // must be followed by non-space, the closing one preceded by non-space and
  // not followed by a digit. Beyond Pandoc, a `$` that starts an amount never
  // opens math, so "$5 and $x^2$" renders only the second as math.
  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    const { src, pos, posMax } = state;
    if (src[pos] !== '$' || src[pos + 1] === '$') return false;
    if (pos + 1 >= posMax || WHITESPACE_RE.test(src[pos + 1]!)) return false;
    if (CURRENCY_RE.test(src.slice(pos + 1, posMax))) return false;
    let end = pos + 1;
    for (;;) {
      end = src.indexOf('$', end + 1);
      if (end === -1 || end >= posMax) return false;
      const before = src[end - 1]!;
      if (before === '\\' || WHITESPACE_RE.test(before) || DIGIT_RE.test(src[end + 1] ?? '')) {
        continue;
      }
      break;
    }
    if (!silent) {
      const token = state.push('math_inline', '', 0);
      token.content = src.slice(pos + 1, end);
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
