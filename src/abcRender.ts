// Pure sanitizer for SVG rendered by abcjs plus an error-box renderer.
// abcjs parses ABC music notation and writes an <svg> into a host div; we
// strip anything script-ish before inserting the markup into the preview.

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// URL gate for href/xlink:href/src after rendering. Fragment refs and
// data:image/* URLs are the only allowed forms; everything else (external
// https, javascript:, data:text/html, etc.) is stripped.
const SAFE_URL_RE = /^\s*(#|data:image\/)/i;

const sanitizeSvgElement = (el: Element): void => {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'href' || name === 'xlink:href' || name === 'src') {
      if (!SAFE_URL_RE.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }
};

// Strip anything script-ish from rendered abcjs SVG. Uses the global
// DOMParser (present in browsers and in happy-dom for tests); we accept this
// one global because its output is an isolated Document, not shared state.
export const sanitizeAbcSvg = (svg: string): string => {
  const trimmed = svg.trim();
  if (!trimmed) return '';
  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
  // If the input was un-parseable XML the browser returns a <parsererror>
  // document — fall back to empty string rather than echoing the error node.
  if (doc.querySelector('parsererror')) return '';
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return '';
  for (const bad of Array.from(root.querySelectorAll('script, foreignObject'))) {
    bad.remove();
  }
  sanitizeSvgElement(root);
  for (const el of Array.from(root.querySelectorAll('*'))) {
    sanitizeSvgElement(el);
  }
  // XMLSerializer is the canonical round-trip for SVG documents; it ships with
  // every environment where DOMParser exists (browsers + happy-dom in tests).
  return new XMLSerializer().serializeToString(root);
};

export const renderAbcError = (message: string, source: string): string => {
  const msg = escapeXml(message || 'Invalid ABC notation');
  const src = escapeXml(source.trim());
  return (
    `<div class="render-error"><strong>ABC render failed</strong>` +
    `<pre>${msg}</pre>` +
    (src ? `<pre class="render-error-src">${src}</pre>` : '') +
    `</div>`
  );
};
