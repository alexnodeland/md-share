import type MarkdownIt from 'markdown-it';

export interface AbcCounter {
  next(): number;
  reset(): void;
}

export const createAbcCounter = (): AbcCounter => {
  let n = 0;
  return {
    next: () => n++,
    reset: () => {
      n = 0;
    },
  };
};

export const wrapAbcFences = (md: MarkdownIt, counter: AbcCounter): void => {
  // markdown-it always provides a default fence renderer; assert non-null so we
  // don't carry an untestable defensive fallback.
  const origFence = md.renderer.rules.fence as NonNullable<typeof md.renderer.rules.fence>;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token && token.info.trim().toLowerCase() === 'abc') {
      const id = counter.next();
      return `<div class="abc-container"><pre class="abc" id="abc-${id}">${md.utils.escapeHtml(token.content)}</pre></div>`;
    }
    return origFence(tokens, idx, opts, env, self);
  };
};
