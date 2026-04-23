import { renderGraphvizError, sanitizeGraphvizSvg } from '../graphvizRender.ts';
import type { DiagramRenderer } from '../ports.ts';

type VizMod = typeof import('@viz-js/viz');
type Viz = Awaited<ReturnType<VizMod['instance']>>;

let viz: Viz | null = null;
let pending: Promise<Viz> | null = null;

const loadViz = (): Promise<Viz> => {
  if (viz) return Promise.resolve(viz);
  if (!pending) {
    pending = import('@viz-js/viz').then(async (m) => {
      // The library publishes both a namespace and a default export; the
      // namespace carries `instance` directly.
      const factory =
        (m as { default?: VizMod }).default?.instance ?? (m as unknown as VizMod).instance;
      viz = await factory();
      return viz;
    });
  }
  return pending;
};

export const browserGraphvizRenderer: DiagramRenderer = {
  render: async (source) => {
    const trimmed = source.trim();
    if (!trimmed) return renderGraphvizError('Empty Graphviz block', source);
    try {
      const v = await loadViz();
      const svg = v.renderString(trimmed, { format: 'svg' });
      if (!svg) return renderGraphvizError('Graphviz produced no SVG output', source);
      return sanitizeGraphvizSvg(svg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderGraphvizError(message, source);
    }
  },
};
