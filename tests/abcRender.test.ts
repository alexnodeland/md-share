import { describe, expect, it } from 'vitest';
import { renderAbcError, sanitizeAbcSvg } from '../src/abcRender.ts';

describe('sanitizeAbcSvg', () => {
  const wrap = (inner: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${inner}</svg>`;

  it('returns empty string for empty input', () => {
    expect(sanitizeAbcSvg('')).toBe('');
    expect(sanitizeAbcSvg('   ')).toBe('');
  });

  it('returns empty string for non-svg root', () => {
    expect(sanitizeAbcSvg('<div>hi</div>')).toBe('');
  });

  it('returns empty string for un-parseable XML', () => {
    // Malformed: unclosed tag with raw `<` noise. happy-dom returns a
    // parsererror document for garbage like this.
    const result = sanitizeAbcSvg('<<not xml');
    expect(result).toBe('');
  });

  it('passes through a benign svg', () => {
    const out = sanitizeAbcSvg(wrap('<path d="M0 0 L5 5"/>'));
    expect(out).toContain('<path');
    expect(out).toContain('M0 0 L5 5');
  });

  it('strips <script> children', () => {
    const out = sanitizeAbcSvg(wrap('<script>alert(1)</script><path/>'));
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<path');
  });

  it('strips <foreignObject> children', () => {
    const out = sanitizeAbcSvg(wrap('<foreignObject><div>x</div></foreignObject><path/>'));
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).toContain('<path');
  });

  it('strips on* event handler attributes', () => {
    const out = sanitizeAbcSvg(wrap('<path onclick="alert(1)"/>'));
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('alert(1)');
  });

  it('strips on* handlers on the svg root itself', () => {
    const out = sanitizeAbcSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path/></svg>',
    );
    expect(out).not.toContain('onload');
    expect(out).not.toContain('alert(1)');
  });

  it('strips javascript: hrefs', () => {
    const out = sanitizeAbcSvg(wrap('<a href="javascript:alert(1)"><path/></a>'));
    expect(out).not.toContain('javascript:');
  });

  it('strips external http(s) hrefs', () => {
    const out = sanitizeAbcSvg(wrap('<a href="https://evil.example"><path/></a>'));
    expect(out).not.toContain('https://evil.example');
  });

  it('strips data:text/html hrefs but keeps data:image/* ones', () => {
    const dangerous = sanitizeAbcSvg(wrap('<image href="data:text/html,<x>"/>'));
    expect(dangerous).not.toContain('data:text/html');
    const safe = sanitizeAbcSvg(
      wrap('<image href="data:image/png;base64,AAAA" width="5" height="5"/>'),
    );
    expect(safe).toContain('data:image/png');
  });

  it('keeps fragment-only hrefs (e.g. gradient refs)', () => {
    const out = sanitizeAbcSvg(wrap('<use href="#grad"/>'));
    expect(out).toContain('#grad');
  });

  it('strips xlink:href pointing at an external resource', () => {
    const out = sanitizeAbcSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
        `<use xlink:href="https://evil.example/sprite#a"/></svg>`,
    );
    expect(out).not.toContain('evil.example');
  });

  it('strips dangerous src attributes', () => {
    const out = sanitizeAbcSvg(wrap('<image src="javascript:alert(1)"/>'));
    expect(out).not.toContain('javascript:');
  });
});

describe('renderAbcError', () => {
  it('wraps the error message in a render-error block', () => {
    const html = renderAbcError('Bad notation', 'X:1\nK:C');
    expect(html).toContain('class="render-error"');
    expect(html).toContain('<strong>ABC render failed</strong>');
    expect(html).toContain('Bad notation');
    expect(html).toContain('X:1');
  });

  it('falls back to a generic message when the input is empty', () => {
    const html = renderAbcError('', 'src');
    expect(html).toContain('Invalid ABC notation');
  });

  it('escapes HTML in the message and the source', () => {
    const html = renderAbcError('<x>', '<y>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;y&gt;');
  });

  it('escapes quote characters in the message', () => {
    const html = renderAbcError('oops "bad"', '');
    expect(html).toContain('&quot;bad&quot;');
  });

  it('escapes ampersands in the message', () => {
    const html = renderAbcError('a & b', '');
    expect(html).toContain('a &amp; b');
  });

  it('omits the source pre when no source is provided', () => {
    const html = renderAbcError('Something went wrong', '');
    expect(html).not.toContain('render-error-src');
  });
});
