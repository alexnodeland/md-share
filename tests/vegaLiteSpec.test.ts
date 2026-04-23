import { describe, expect, it } from 'vitest';
import { renderVegaLiteError, sanitizeVegaLiteSpec, sanitizeVegaSvg } from '../src/vegaLiteSpec.ts';

const MINIMAL = {
  data: { values: [{ a: 1, b: 2 }] },
  mark: 'bar',
  encoding: { x: { field: 'a' }, y: { field: 'b' } },
};

describe('sanitizeVegaLiteSpec', () => {
  it('accepts a minimal inline-values spec', () => {
    const result = sanitizeVegaLiteSpec(JSON.stringify(MINIMAL));
    expect('spec' in result).toBe(true);
    if ('spec' in result) expect(result.spec).toEqual(MINIMAL);
  });

  it('rejects an empty string', () => {
    const result = sanitizeVegaLiteSpec('');
    expect(result).toEqual({ error: 'Empty Vega-Lite spec' });
  });

  it('rejects whitespace-only input', () => {
    const result = sanitizeVegaLiteSpec('   \n  ');
    expect(result).toEqual({ error: 'Empty Vega-Lite spec' });
  });

  it('rejects invalid JSON with a clear error', () => {
    const result = sanitizeVegaLiteSpec('{not json');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/Invalid JSON/);
  });

  it('rejects a JSON primitive', () => {
    const result = sanitizeVegaLiteSpec('42');
    expect(result).toEqual({ error: 'Vega-Lite spec must be a JSON object' });
  });

  it('rejects a JSON null', () => {
    const result = sanitizeVegaLiteSpec('null');
    expect(result).toEqual({ error: 'Vega-Lite spec must be a JSON object' });
  });

  it('rejects a top-level array', () => {
    const result = sanitizeVegaLiteSpec(JSON.stringify([MINIMAL]));
    expect(result).toEqual({ error: 'Vega-Lite spec must be a JSON object' });
  });

  it('walks nested arrays in layered specs without false positives', () => {
    const spec = { layer: [{ mark: 'bar' }, { mark: 'line' }] };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('rejects top-level `signal`', () => {
    const result = sanitizeVegaLiteSpec('{"signal":"2+2"}');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/signal/);
  });

  it('rejects top-level `signals`', () => {
    const result = sanitizeVegaLiteSpec('{"signals":[{"name":"s","value":1}]}');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/signals/);
  });

  it('rejects top-level `loader`', () => {
    const result = sanitizeVegaLiteSpec('{"loader":{"baseURL":"https://evil"}}');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/loader/);
  });

  it('rejects nested `signal` buried inside encoding', () => {
    const spec = { mark: 'bar', encoding: { x: { field: { signal: 'datum.a' } } } };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/signal/);
  });

  it('rejects `signal` inside an array element', () => {
    const spec = { layer: [{ signal: 'foo' }] };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
  });

  it('rejects data.url pointing at a remote URL', () => {
    const spec = { data: { url: 'https://example.com/data.csv' }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/data\.url/);
  });

  it('rejects data.url with a relative path (still a network fetch)', () => {
    const spec = { data: { url: 'data.csv' }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
  });

  it('allows data.url that is a pure fragment ref', () => {
    const spec = { data: { url: '#inline' }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('allows data.url that is empty (e.g. placeholder)', () => {
    const spec = { data: { url: '' }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('allows a non-string data.url (ignored by our gate)', () => {
    const spec = { data: { url: 42 }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('rejects data.values[*].url referencing a remote resource', () => {
    const spec = {
      data: { values: [{ url: 'https://example.com/a.json' }] },
      mark: 'bar',
    };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/data\.values/);
  });

  it('allows data.values entries that are primitives', () => {
    const spec = { data: { values: [1, 2, 3] }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('allows data.values objects without a url field', () => {
    const spec = { data: { values: [{ a: 1 }] }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('rejects datasets.<name>.url referencing a remote resource', () => {
    const spec = { datasets: { foo: { url: 'https://example.com/x.csv' } }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/datasets/);
  });

  it('allows datasets entries that are inline arrays', () => {
    const spec = { datasets: { foo: [{ a: 1 }] }, mark: 'bar' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('rejects data.url buried inside a layered spec', () => {
    const spec = {
      layer: [{ mark: 'line', data: { url: 'https://evil.example/data.json' }, encoding: {} }],
    };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toMatch(/data\.url/);
  });

  it('rejects datasets inside a nested block', () => {
    const spec = {
      vconcat: [{ datasets: { bad: { url: 'https://x/x' } }, mark: 'bar' }],
    };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('error' in result).toBe(true);
  });

  it('ignores non-object data values when scanning', () => {
    const spec = { mark: 'bar', data: 'named' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });

  it('ignores non-object datasets values when scanning', () => {
    const spec = { mark: 'bar', datasets: 'weird' };
    const result = sanitizeVegaLiteSpec(JSON.stringify(spec));
    expect('spec' in result).toBe(true);
  });
});

describe('sanitizeVegaSvg', () => {
  const wrap = (inner: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${inner}</svg>`;

  it('returns empty string for empty input', () => {
    expect(sanitizeVegaSvg('')).toBe('');
    expect(sanitizeVegaSvg('   ')).toBe('');
  });

  it('returns empty string for non-svg root', () => {
    expect(sanitizeVegaSvg('<div>hi</div>')).toBe('');
  });

  it('returns empty string for un-parseable XML', () => {
    // Malformed: unclosed tag with raw `<` noise. happy-dom returns a
    // parsererror document for garbage like this.
    const result = sanitizeVegaSvg('<<not xml');
    expect(result).toBe('');
  });

  it('passes through a benign svg', () => {
    const out = sanitizeVegaSvg(wrap('<rect x="0" y="0" width="5" height="5"/>'));
    expect(out).toContain('<rect');
    expect(out).toContain('width="5"');
  });

  it('strips <script> children', () => {
    const out = sanitizeVegaSvg(wrap('<script>alert(1)</script><rect/>'));
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<rect');
  });

  it('strips <foreignObject> children', () => {
    const out = sanitizeVegaSvg(wrap('<foreignObject><div>x</div></foreignObject><rect/>'));
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).toContain('<rect');
  });

  it('strips on* event handler attributes', () => {
    const out = sanitizeVegaSvg(wrap('<rect onclick="alert(1)"/>'));
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('alert(1)');
  });

  it('strips on* handlers on the svg root itself', () => {
    const out = sanitizeVegaSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>',
    );
    expect(out).not.toContain('onload');
    expect(out).not.toContain('alert(1)');
  });

  it('strips javascript: hrefs', () => {
    const out = sanitizeVegaSvg(wrap('<a href="javascript:alert(1)"><rect/></a>'));
    expect(out).not.toContain('javascript:');
  });

  it('strips external http(s) hrefs', () => {
    const out = sanitizeVegaSvg(wrap('<a href="https://evil.example"><rect/></a>'));
    expect(out).not.toContain('https://evil.example');
  });

  it('strips data:text/html hrefs but keeps data:image/* ones', () => {
    const dangerous = sanitizeVegaSvg(wrap('<image href="data:text/html,<x>"/>'));
    expect(dangerous).not.toContain('data:text/html');
    const safe = sanitizeVegaSvg(
      wrap('<image href="data:image/png;base64,AAAA" width="5" height="5"/>'),
    );
    expect(safe).toContain('data:image/png');
  });

  it('keeps fragment-only hrefs (e.g. gradient refs)', () => {
    const out = sanitizeVegaSvg(wrap('<use href="#grad"/>'));
    expect(out).toContain('#grad');
  });

  it('strips xlink:href pointing at an external resource', () => {
    const out = sanitizeVegaSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
        `<use xlink:href="https://evil.example/sprite#a"/></svg>`,
    );
    expect(out).not.toContain('evil.example');
  });

  it('strips dangerous src attributes', () => {
    const out = sanitizeVegaSvg(wrap('<image src="javascript:alert(1)"/>'));
    expect(out).not.toContain('javascript:');
  });
});

describe('renderVegaLiteError', () => {
  it('wraps the error message in a render-error block', () => {
    const html = renderVegaLiteError('Bad spec', '{"mark":"bar"}');
    expect(html).toContain('class="render-error"');
    expect(html).toContain('<strong>Vega-Lite render failed</strong>');
    expect(html).toContain('Bad spec');
    expect(html).toContain('mark');
  });

  it('falls back to a generic message when the input is empty', () => {
    const html = renderVegaLiteError('', 'src');
    expect(html).toContain('Invalid Vega-Lite spec');
  });

  it('escapes HTML in the message and the source', () => {
    const html = renderVegaLiteError('<x>', '<y>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;y&gt;');
  });

  it('escapes quote characters in the message', () => {
    const html = renderVegaLiteError('oops "bad"', '');
    expect(html).toContain('&quot;bad&quot;');
  });

  it('escapes ampersands in the message', () => {
    const html = renderVegaLiteError('a & b', '');
    expect(html).toContain('a &amp; b');
  });

  it('omits the source pre when no source is provided', () => {
    const html = renderVegaLiteError('Something went wrong', '');
    expect(html).not.toContain('render-error-src');
  });
});
