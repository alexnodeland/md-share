import { renderAbcError, sanitizeAbcSvg } from '../abcRender.ts';
import type { DiagramRenderer } from '../ports.ts';

type AbcMod = typeof import('abcjs');

let mod: AbcMod | null = null;
let pending: Promise<AbcMod> | null = null;

const loadLib = (): Promise<AbcMod> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('abcjs').then((m) => {
      // abcjs publishes both a namespace and a default export; the namespace
      // carries `renderAbc` directly. Cast at the boundary so pure code stays
      // structurally typed.
      mod = (m as { default?: AbcMod }).default ?? (m as unknown as AbcMod);
      return mod;
    });
  }
  return pending;
};

export const browserAbcRenderer: DiagramRenderer = {
  render: async (source) => {
    const trimmed = source.trim();
    if (!trimmed) return renderAbcError('Empty ABC block', source);
    try {
      const abcMod = await loadLib();
      const host = document.createElement('div');
      // abcjs writes into a live DOM subtree; detach after so nothing
      // from this render survives in the document.
      document.body.appendChild(host);
      try {
        abcMod.renderAbc(host, trimmed, {
          responsive: 'resize',
          add_classes: true,
        });
        const svgEl = host.querySelector('svg');
        if (!svgEl) return renderAbcError('abcjs produced no SVG output', source);
        return sanitizeAbcSvg(svgEl.outerHTML);
      } finally {
        host.remove();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderAbcError(message, source);
    }
  },
};
