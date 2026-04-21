import type MarkdownIt from 'markdown-it';

export interface GraphvizCounter {
  next(): number;
  reset(): void;
}

export const createGraphvizCounter = (): GraphvizCounter => {
  let n = 0;
  return {
    next: () => n++,
    reset: () => {
      n = 0;
    },
  };
};

export const wrapGraphvizFences = (md: MarkdownIt, counter: GraphvizCounter): void => {
  // markdown-it always provides a default fence renderer; assert non-null so we
  // don't carry an untestable defensive fallback.
  const origFence = md.renderer.rules.fence as NonNullable<typeof md.renderer.rules.fence>;

  const isGraphviz = (info: string): boolean => info === 'graphviz' || info === 'dot';

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token && isGraphviz(token.info.trim().toLowerCase())) {
      const id = counter.next();
      return `<div class="graphviz-container"><pre class="graphviz" id="graphviz-${id}">${md.utils.escapeHtml(token.content)}</pre></div>`;
    }
    return origFence(tokens, idx, opts, env, self);
  };
};
