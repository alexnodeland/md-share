import type { DiagramRenderer } from '../ports.ts';
import { renderVegaLiteError, sanitizeVegaLiteSpec, sanitizeVegaSvg } from '../vegaLiteSpec.ts';

type VegaEmbedMod = typeof import('vega-embed');

let mod: VegaEmbedMod | null = null;
let pending: Promise<VegaEmbedMod> | null = null;

const loadLib = (): Promise<VegaEmbedMod> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('vega-embed').then((m) => {
      mod = m;
      return mod;
    });
  }
  return pending;
};

type EmbedSpec = Parameters<VegaEmbedMod['default']>[1];

export const browserVegaLiteRenderer: DiagramRenderer = {
  render: async (source) => {
    const parsed = sanitizeVegaLiteSpec(source);
    if ('error' in parsed) return renderVegaLiteError(parsed.error, source);
    try {
      const vegaMod = await loadLib();
      const embed = vegaMod.default;
      const host = document.createElement('div');
      // vega-embed writes into a live DOM subtree; detach after so nothing
      // from this render survives in the document.
      document.body.appendChild(host);
      try {
        // `spec` is `unknown` after sanitization; embed needs the wider
        // Vega / Vega-Lite spec union. Cast at the adapter boundary only.
        const result = await embed(host, parsed.spec as EmbedSpec, {
          actions: false,
          renderer: 'svg',
        });
        const svgEl = host.querySelector('svg');
        const rawSvg = svgEl ? svgEl.outerHTML : '';
        result.finalize();
        return sanitizeVegaSvg(rawSvg);
      } finally {
        host.remove();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderVegaLiteError(message, source);
    }
  },
};
