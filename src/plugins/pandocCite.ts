import type MarkdownIt from 'markdown-it';

const CITE_KEY_RE = /^[\w][\w:.-]*$/;

interface CiteEnv {
  __cites?: Map<string, number>;
}

export const pluginPandocCite = (md: MarkdownIt): void => {
  md.inline.ruler.after('emphasis', 'pandoc_cite', (state, silent) => {
    const src = state.src;
    if (src[state.pos] !== '[') return false;
    if (src[state.pos + 1] !== '@') return false;
    const end = src.indexOf(']', state.pos + 2);
    if (end < 0) return false;
    const key = src.slice(state.pos + 2, end).trim();
    if (!CITE_KEY_RE.test(key)) return false;

    if (!silent) {
      const env = state.env as CiteEnv;
      if (!env.__cites) env.__cites = new Map<string, number>();
      let n = env.__cites.get(key);
      if (n === undefined) {
        n = env.__cites.size + 1;
        env.__cites.set(key, n);
      }
      const token = state.push('pandoc_cite', '', 0);
      token.content = key;
      token.meta = { n };
    }
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.pandoc_cite = (tokens, idx) => {
    const token = tokens[idx]!;
    const meta = token.meta as { n: number };
    const key = md.utils.escapeHtml(token.content);
    return `<sup class="pandoc-cite"><a href="#ref-${key}">[${meta.n}]</a></sup>`;
  };
};
