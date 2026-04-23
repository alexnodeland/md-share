// Pure sanitizer for Vega-Lite JSON specs plus an SVG sanitizer for the
// rendered output. Both treat the input as hostile and strip anything that
// could reach the network or execute script at parse/render time.

// Keys whose mere presence in a spec indicates a dynamic / scripted feature
// we refuse to execute (Vega signals run expressions, loaders resolve URLs).
const FORBIDDEN_KEYS = new Set(['signal', 'signals', 'loader']);

interface Ok {
  spec: unknown;
}

interface Err {
  error: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Remote URLs in data / datasets are rejected. Fragment-only refs (#foo) and
// inline objects are fine; anything else — absolute, relative, or protocol-
// relative — is treated as a network fetch and blocked.
const looksRemote = (url: unknown): boolean => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (trimmed.startsWith('#')) return false;
  return true;
};

// Recursively scan any JSON value for forbidden keys. We walk into arrays and
// nested objects so an attacker can't hide `signal` deep inside `encoding`.
const findForbiddenKey = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenKey(item);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return key;
    const found = findForbiddenKey(value[key]);
    if (found) return found;
  }
  return null;
};

const checkDataBlock = (data: unknown): string | null => {
  if (!isObject(data)) return null;
  if ('url' in data && looksRemote(data.url)) {
    return 'data.url refers to a remote resource; only inline `values` are allowed';
  }
  const values = data.values;
  if (Array.isArray(values)) {
    for (const v of values) {
      if (isObject(v) && 'url' in v && looksRemote((v as { url?: unknown }).url)) {
        return 'data.values[*].url refers to a remote resource';
      }
    }
  }
  return null;
};

const checkDatasets = (datasets: unknown): string | null => {
  if (!isObject(datasets)) return null;
  for (const key of Object.keys(datasets)) {
    const ds = datasets[key];
    if (isObject(ds) && 'url' in ds && looksRemote(ds.url)) {
      return `datasets["${key}"].url refers to a remote resource`;
    }
  }
  return null;
};

// Top-level or nested `data`/`datasets` entries: anywhere these appear we
// block remote URLs. Vega-Lite allows layered/faceted specs with their own
// data blocks, so this must walk the whole tree.
const scanDataRefs = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = scanDataRefs(item);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if ('data' in value) {
    const err = checkDataBlock(value.data);
    if (err) return err;
  }
  if ('datasets' in value) {
    const err = checkDatasets(value.datasets);
    if (err) return err;
  }
  for (const key of Object.keys(value)) {
    if (key === 'data' || key === 'datasets') continue;
    const found = scanDataRefs(value[key]);
    if (found) return found;
  }
  return null;
};

export const sanitizeVegaLiteSpec = (raw: string): Ok | Err => {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'Empty Vega-Lite spec' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    // JSON.parse always throws a SyntaxError (Error subclass) on bad input.
    return { error: `Invalid JSON: ${(err as Error).message}` };
  }
  if (!isObject(parsed)) {
    return { error: 'Vega-Lite spec must be a JSON object' };
  }
  const forbidden = findForbiddenKey(parsed);
  if (forbidden) {
    return { error: `Spec contains forbidden key "${forbidden}"` };
  }
  const dataErr = scanDataRefs(parsed);
  if (dataErr) return { error: dataErr };
  return { spec: parsed };
};

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

// Strip anything script-ish from rendered Vega SVG. Uses the global
// DOMParser (present in browsers and in happy-dom for tests); we accept this
// one global because its output is an isolated Document, not shared state.
export const sanitizeVegaSvg = (svg: string): string => {
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

export const renderVegaLiteError = (message: string, source: string): string => {
  const msg = escapeXml(message || 'Invalid Vega-Lite spec');
  const src = escapeXml(source.trim());
  return (
    `<div class="render-error"><strong>Vega-Lite render failed</strong>` +
    `<pre>${msg}</pre>` +
    (src ? `<pre class="render-error-src">${src}</pre>` : '') +
    `</div>`
  );
};
