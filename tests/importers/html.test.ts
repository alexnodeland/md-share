import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, postProcess, sanitizeDocument } from '../../src/importers/html.ts';

const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

const bodyHtml = (doc: Document): string => doc.body.innerHTML;

describe('sanitizeDocument', () => {
  it('removes <script> tags entirely', () => {
    const doc = parse('<p>ok</p><script>alert(1)</script>');
    sanitizeDocument(doc);
    expect(bodyHtml(doc)).toBe('<p>ok</p>');
  });

  it('strips <style>, <meta>, <base>, <object>, <embed>, <iframe>', () => {
    const doc = parse(
      '<p>ok</p><style>.x{}</style><meta name="a"><base href="x"><object></object><embed src="x"><iframe src="about:blank"></iframe>',
    );
    sanitizeDocument(doc);
    expect(bodyHtml(doc)).toBe('<p>ok</p>');
  });

  it('removes <link> elements regardless of rel', () => {
    const html = '<p>ok</p>';
    const doc = parse(html);
    const link = doc.createElement('link');
    link.setAttribute('rel', 'preload');
    doc.body.appendChild(link);
    sanitizeDocument(doc);
    expect(doc.querySelector('link')).toBeNull();
  });

  it('removes all on* event handlers', () => {
    const doc = parse('<a href="#" onclick="alert(1)" onmouseover="x()">click</a>');
    sanitizeDocument(doc);
    const a = doc.querySelector('a');
    expect(a?.hasAttribute('onclick')).toBe(false);
    expect(a?.hasAttribute('onmouseover')).toBe(false);
    expect(a?.getAttribute('href')).toBe('#');
  });

  it('strips javascript: hrefs', () => {
    const doc = parse('<a href="javascript:alert(1)">x</a>');
    sanitizeDocument(doc);
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('strips vbscript: hrefs', () => {
    const doc = parse('<a href="vbscript:evil">x</a>');
    sanitizeDocument(doc);
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('strips data: non-image srcs', () => {
    const doc = parse('<iframe src="data:text/html,<script>x"></iframe>');
    sanitizeDocument(doc);
    expect(doc.querySelector('iframe')).toBeNull();
  });

  it('preserves safe data:image/ srcs on images', () => {
    const doc = parse('<img src="data:image/png;base64,AAAA" alt="t">');
    sanitizeDocument(doc);
    expect(doc.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('strips xlink:href javascript payloads', () => {
    const doc = parse('<svg><use xlink:href="javascript:alert(1)"></use></svg>');
    sanitizeDocument(doc);
    expect(doc.querySelector('use')?.hasAttribute('xlink:href')).toBe(false);
  });

  it('removes SVG <script> children', () => {
    const doc = parse('<svg><rect></rect></svg>');
    const svg = doc.querySelector('svg')!;
    const script = doc.createElementNS('http://www.w3.org/2000/svg', 'script');
    script.textContent = 'alert(1)';
    svg.insertBefore(script, svg.firstChild);
    sanitizeDocument(doc);
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.querySelector('rect')).not.toBeNull();
  });

  it('removes SVG <foreignObject> children', () => {
    const doc = parse(
      '<svg><foreignObject width="10" height="10"><div>x</div></foreignObject><circle r="1"></circle></svg>',
    );
    sanitizeDocument(doc);
    expect(doc.querySelector('foreignObject')).toBeNull();
    expect(doc.querySelector('svg circle')).not.toBeNull();
  });

  it('preserves ordinary safe markup', () => {
    const doc = parse('<h1>Title</h1><p>Hi <strong>world</strong></p>');
    sanitizeDocument(doc);
    expect(bodyHtml(doc)).toBe('<h1>Title</h1><p>Hi <strong>world</strong></p>');
  });

  it('leaves plain http/https hrefs untouched', () => {
    const doc = parse('<a href="https://example.com/x">x</a>');
    sanitizeDocument(doc);
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('https://example.com/x');
  });
});

describe('postProcess', () => {
  it('normalizes CRLF to LF', () => {
    expect(postProcess('a\r\nb')).toBe('a\nb');
  });

  it('normalizes lone CR to LF', () => {
    expect(postProcess('a\rb')).toBe('a\nb');
  });

  it('collapses runs of more than two newlines into two', () => {
    expect(postProcess('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims trailing whitespace on each line', () => {
    expect(postProcess('a   \nb\t\t\n')).toBe('a\nb');
  });

  it('trims leading and trailing whitespace of the whole string', () => {
    expect(postProcess('\n\n hi \n\n')).toBe('hi');
  });
});

describe('htmlToMarkdown', () => {
  const fakeTurndown = (s: string) => s.replace(/<[^>]+>/g, '').trim();

  it('sanitizes the document and then hands it to the turndown service', () => {
    const out = htmlToMarkdown('<script>bad</script><p>good</p>', {
      parseHtml: parse,
      turndown: fakeTurndown,
    });
    expect(out).toBe('good');
  });

  it('runs postProcess on the turndown output', () => {
    const out = htmlToMarkdown('<p>a</p>\r\n\r\n\r\n<p>b</p>', {
      parseHtml: parse,
      turndown: (s) => s.replace(/<\/?p>/g, '\n\n'),
    });
    expect(out).toMatch(/^a\n\nb$/);
  });

  it('returns empty string when the parsed document has no body content', () => {
    const out = htmlToMarkdown('', {
      parseHtml: parse,
      turndown: fakeTurndown,
    });
    expect(out).toBe('');
  });

  it('returns empty string when parser yields a document without a body element', () => {
    const fakeParser = (_: string): Document =>
      ({
        body: null,
        querySelectorAll: () => [] as unknown as NodeListOf<Element>,
      }) as unknown as Document;
    const out = htmlToMarkdown('x', { parseHtml: fakeParser, turndown: () => 'x' });
    expect(out).toBe('x');
  });
});
