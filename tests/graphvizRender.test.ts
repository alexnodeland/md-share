import { describe, expect, it } from 'vitest';
import { renderGraphvizError, sanitizeGraphvizSvg } from '../src/graphvizRender.ts';

describe('sanitizeGraphvizSvg', () => {
  const wrap = (inner: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${inner}</svg>`;

  it('returns empty string for empty input', () => {
    expect(sanitizeGraphvizSvg('')).toBe('');
    expect(sanitizeGraphvizSvg('   ')).toBe('');
  });

  it('returns empty string for non-svg root', () => {
    expect(sanitizeGraphvizSvg('<div>hi</div>')).toBe('');
  });

  it('returns empty string for un-parseable XML', () => {
    const result = sanitizeGraphvizSvg('<<not xml');
    expect(result).toBe('');
  });

  it('passes through a benign svg', () => {
    const out = sanitizeGraphvizSvg(wrap('<path d="M0 0 L5 5"/>'));
    expect(out).toContain('<path');
    expect(out).toContain('M0 0 L5 5');
  });

  it('strips <script> children', () => {
    const out = sanitizeGraphvizSvg(wrap('<script>alert(1)</script><path/>'));
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<path');
  });

  it('strips <foreignObject> children', () => {
    const out = sanitizeGraphvizSvg(wrap('<foreignObject><div>x</div></foreignObject><path/>'));
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).toContain('<path');
  });

  it('strips on* event handler attributes', () => {
    const out = sanitizeGraphvizSvg(wrap('<path onclick="alert(1)"/>'));
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('alert(1)');
  });

  it('strips on* handlers on the svg root itself', () => {
    const out = sanitizeGraphvizSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path/></svg>',
    );
    expect(out).not.toContain('onload');
    expect(out).not.toContain('alert(1)');
  });

  it('strips javascript: hrefs (Graphviz clickable node output)', () => {
    const out = sanitizeGraphvizSvg(wrap('<a href="javascript:alert(1)"><path/></a>'));
    expect(out).not.toContain('javascript:');
  });

  it('strips external http(s) hrefs on <a> node links', () => {
    const out = sanitizeGraphvizSvg(wrap('<a href="https://evil.example"><path/></a>'));
    expect(out).not.toContain('https://evil.example');
  });

  it('strips data:text/html hrefs but keeps data:image/* ones', () => {
    const dangerous = sanitizeGraphvizSvg(wrap('<image href="data:text/html,<x>"/>'));
    expect(dangerous).not.toContain('data:text/html');
    const safe = sanitizeGraphvizSvg(
      wrap('<image href="data:image/png;base64,AAAA" width="5" height="5"/>'),
    );
    expect(safe).toContain('data:image/png');
  });

  it('keeps fragment-only hrefs (e.g. gradient / clip-path refs)', () => {
    const out = sanitizeGraphvizSvg(wrap('<use href="#grad"/>'));
    expect(out).toContain('#grad');
  });

  it('strips xlink:href pointing at an external resource (Graphviz URL nodes)', () => {
    const out = sanitizeGraphvizSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
        `<a xlink:href="https://evil.example/page"><text>x</text></a></svg>`,
    );
    expect(out).not.toContain('evil.example');
  });

  it('strips dangerous src attributes', () => {
    const out = sanitizeGraphvizSvg(wrap('<image src="javascript:alert(1)"/>'));
    expect(out).not.toContain('javascript:');
  });
});

describe('renderGraphvizError', () => {
  it('wraps the error message in a render-error block', () => {
    const html = renderGraphvizError('Bad DOT syntax', 'digraph { A -> }');
    expect(html).toContain('class="render-error"');
    expect(html).toContain('<strong>Graphviz render failed</strong>');
    expect(html).toContain('Bad DOT syntax');
    expect(html).toContain('digraph');
  });

  it('falls back to a generic message when the input is empty', () => {
    const html = renderGraphvizError('', 'src');
    expect(html).toContain('Invalid Graphviz DOT');
  });

  it('escapes HTML in the message and the source', () => {
    const html = renderGraphvizError('<x>', '<y>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;y&gt;');
  });

  it('escapes quote characters in the message', () => {
    const html = renderGraphvizError('oops "bad"', '');
    expect(html).toContain('&quot;bad&quot;');
  });

  it('escapes ampersands in the message', () => {
    const html = renderGraphvizError('a & b', '');
    expect(html).toContain('a &amp; b');
  });

  it('omits the source pre when no source is provided', () => {
    const html = renderGraphvizError('Something went wrong', '');
    expect(html).not.toContain('render-error-src');
  });
});
