import type MarkdownIt from 'markdown-it';

export interface VegaLiteCounter {
  next(): number;
  reset(): void;
}

export const createVegaLiteCounter = (): VegaLiteCounter => {
  let n = 0;
  return {
    next: () => n++,
    reset: () => {
      n = 0;
    },
  };
};

export const wrapVegaLiteFences = (md: MarkdownIt, counter: VegaLiteCounter): void => {
  // markdown-it always provides a default fence renderer; assert non-null so we
  // don't carry an untestable defensive fallback.
  const origFence = md.renderer.rules.fence as NonNullable<typeof md.renderer.rules.fence>;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token && token.info.trim().toLowerCase() === 'vega-lite') {
      const id = counter.next();
      return `<div class="vega-lite-container"><pre class="vega-lite" id="vega-lite-${id}">${md.utils.escapeHtml(token.content)}</pre></div>`;
    }
    return origFence(tokens, idx, opts, env, self);
  };
};
