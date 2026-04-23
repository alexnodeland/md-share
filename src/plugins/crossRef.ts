import type MarkdownIt from 'markdown-it';

export type RefKind = 'fig' | 'tbl' | 'eq';

const LABEL_RE = /\{#(fig|tbl|eq):([\w-]+)\}/g;
const REF_RE = /^\[@(fig|tbl|eq):([\w-]+)\]/;

const KIND_WORD: Record<RefKind, string> = {
  fig: 'Figure',
  tbl: 'Table',
  eq: 'Equation',
};

interface CrossRefEnv {
  __xref?: Map<string, { kind: RefKind; n: number }>;
}

const collectLabels = (src: string): Map<string, { kind: RefKind; n: number }> => {
  const counters: Record<RefKind, number> = { fig: 0, tbl: 0, eq: 0 };
  const labels = new Map<string, { kind: RefKind; n: number }>();
  for (const m of src.matchAll(LABEL_RE)) {
    const kind = m[1] as RefKind;
    const id = m[2] as string;
    const key = `${kind}:${id}`;
    if (labels.has(key)) continue;
    counters[kind] += 1;
    labels.set(key, { kind, n: counters[kind] });
  }
  return labels;
};

export const pluginCrossRef = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'xref_collect', (state) => {
    const env = state.env as CrossRefEnv;
    env.__xref = collectLabels(state.src);
  });

  md.inline.ruler.after('emphasis', 'xref', (state, silent) => {
    const match = state.src.slice(state.pos).match(REF_RE);
    if (!match) return false;
    const kind = match[1] as RefKind;
    const id = match[2] as string;
    if (!silent) {
      const env = state.env as CrossRefEnv;
      const entry = env.__xref?.get(`${kind}:${id}`);
      const token = state.push('xref', '', 0);
      token.content = id;
      token.meta = {
        kind,
        n: entry?.n ?? 0,
        resolved: Boolean(entry),
      };
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.xref = (tokens, idx) => {
    const token = tokens[idx]!;
    const meta = token.meta as { kind: RefKind; n: number; resolved: boolean };
    const word = KIND_WORD[meta.kind];
    const id = md.utils.escapeHtml(token.content);
    if (!meta.resolved) {
      return `<span class="xref xref-unresolved">${word} ?${id}?</span>`;
    }
    return `<a class="xref" href="#${meta.kind}-${id}">${word}&nbsp;${meta.n}</a>`;
  };

  const stripLabels = (text: string, env: CrossRefEnv): string =>
    text.replace(LABEL_RE, (_m, kind: string, id: string) => {
      const entry = env.__xref!.get(`${kind}:${id}`)!;
      return `<span class="xref-anchor" id="${kind}-${id}" data-kind="${kind}" data-num="${entry.n}"></span>`;
    });

  md.core.ruler.push('xref_strip', (state) => {
    const env = state.env as CrossRefEnv;
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue;
      for (const child of token.children) {
        if (child.type === 'text' && child.content.includes('{#')) {
          child.content = stripLabels(child.content, env);
          child.type = 'html_inline';
        }
      }
    }
  });
};
