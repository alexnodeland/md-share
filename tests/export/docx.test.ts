import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { buildDocxOps, type DocxOp } from '../../src/export/docx.ts';

const md = () => new MarkdownIt({ html: true, linkify: true });

const ops = (source: string): DocxOp[] => buildDocxOps(source, md());

describe('buildDocxOps — block types', () => {
  it('emits one heading op per ATX heading with the right level', () => {
    const out = ops('# One\n\n## Two\n\n### Three\n');
    const headings = out.filter((o) => o.kind === 'heading');
    expect(headings.map((h) => h.kind === 'heading' && h.level)).toEqual([1, 2, 3]);
  });

  it('emits a paragraph op for prose', () => {
    const [op] = ops('Hello world.');
    expect(op?.kind).toBe('paragraph');
    if (op?.kind === 'paragraph') {
      expect(op.runs.map((r) => r.text).join('')).toBe('Hello world.');
    }
  });

  it('emits list-item ops for bullet lists with level 0', () => {
    const out = ops('- one\n- two\n');
    const items = out.filter((o) => o.kind === 'list-item');
    expect(items.length).toBe(2);
    for (const item of items) {
      if (item.kind !== 'list-item') throw new Error('unreachable');
      expect(item.ordered).toBe(false);
      expect(item.level).toBe(0);
    }
  });

  it('marks list-items from ordered lists as ordered', () => {
    const out = ops('1. a\n2. b\n');
    const items = out.filter((o) => o.kind === 'list-item');
    expect(items.every((o) => o.kind === 'list-item' && o.ordered)).toBe(true);
  });

  it('emits a blockquote op with the quoted runs', () => {
    const [op] = ops('> a saying');
    expect(op?.kind).toBe('blockquote');
    if (op?.kind === 'blockquote') {
      expect(op.runs.map((r) => r.text).join('')).toContain('a saying');
    }
  });

  it('emits a code-block op preserving content but stripping the trailing newline', () => {
    const [op] = ops('```\nline1\nline2\n```\n');
    expect(op?.kind).toBe('code-block');
    if (op?.kind === 'code-block') {
      expect(op.content).toBe('line1\nline2');
    }
  });

  it('captures code-block language when given', () => {
    const [op] = ops('```js\nconst x = 1;\n```\n');
    if (op?.kind !== 'code-block') throw new Error('expected code-block');
    expect(op.lang).toBe('js');
  });

  it('emits an hr op for `---`', () => {
    const out = ops('before\n\n---\n\nafter');
    expect(out.some((o) => o.kind === 'hr')).toBe(true);
  });

  it('emits a table op with header and row runs', () => {
    const src = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'].join('\n');
    const out = ops(src);
    const table = out.find((o) => o.kind === 'table');
    expect(table).toBeDefined();
    if (table?.kind !== 'table') throw new Error('unreachable');
    expect(table.headers.map((cell) => cell.map((r) => r.text).join(''))).toEqual(['A', 'B']);
    expect(table.rows.map((row) => row.map((cell) => cell.map((r) => r.text).join('')))).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(ops('')).toEqual([]);
  });
});

describe('buildDocxOps — inline runs', () => {
  it('flags bold runs', () => {
    const [op] = ops('It is **bold**.');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    const bold = op.runs.find((r) => r.bold);
    expect(bold?.text).toBe('bold');
  });

  it('flags italic runs', () => {
    const [op] = ops('It is *italic*.');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.find((r) => r.italic)?.text).toBe('italic');
  });

  it('flags inline code runs', () => {
    const [op] = ops('Use `npm` please.');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.find((r) => r.code)?.text).toBe('npm');
  });

  it('attaches href to link runs', () => {
    const [op] = ops('See [here](https://example.com).');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    const linked = op.runs.find((r) => r.href);
    expect(linked?.href).toBe('https://example.com');
    expect(linked?.text).toBe('here');
  });

  it('drops href after the link closes', () => {
    const [op] = ops('See [here](https://example.com) then.');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    const trailing = op.runs.find((r) => r.text.startsWith(' then'));
    expect(trailing?.href).toBeUndefined();
  });

  it('stacks decorations on a single run (bold + italic)', () => {
    const [op] = ops('***yes***');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    const r = op.runs.find((r) => r.text === 'yes');
    expect(r?.bold).toBe(true);
    expect(r?.italic).toBe(true);
  });

  it('preserves image alt text as a run when no image embedding is available', () => {
    const [op] = ops('![dog](d.png)');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.some((r) => r.text === 'dog')).toBe(true);
  });

  it('marks strikethrough runs for `~~gone~~`', () => {
    const [op] = ops('~~gone~~');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.find((r) => r.strike)?.text).toBe('gone');
  });

  it('emits a space run for a softbreak (newline inside a paragraph)', () => {
    const [op] = ops('one\ntwo');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.some((r) => r.text === ' ')).toBe(true);
  });

  it('emits a newline run for a hardbreak (two-space line ending)', () => {
    const [op] = ops('one  \ntwo');
    if (op?.kind !== 'paragraph') throw new Error('unreachable');
    expect(op.runs.some((r) => r.text === '\n')).toBe(true);
  });

  it('silently ignores unknown inline token types', () => {
    // Synthesize a MarkdownIt-like stub that emits an unknown inline token.
    const stub = {
      parse: () => [
        { type: 'paragraph_open', tag: 'p', level: 0, children: null, attrs: null, content: '' },
        {
          type: 'inline',
          tag: '',
          level: 1,
          content: '',
          children: [
            { type: 'text', tag: '', level: 0, content: 'hi', children: null, attrs: null },
            {
              type: 'made_up_xyz',
              tag: '',
              level: 0,
              content: 'ignored',
              children: null,
              attrs: null,
            },
          ],
          attrs: null,
        },
        { type: 'paragraph_close', tag: 'p', level: 0, children: null, attrs: null, content: '' },
      ],
    };
    const out = buildDocxOps('', stub as unknown as Parameters<typeof buildDocxOps>[1]);
    expect(out).toHaveLength(1);
    if (out[0]?.kind !== 'paragraph') throw new Error('unreachable');
    // The unknown token contributed no run; only `hi` survives.
    expect(out[0].runs.map((r) => r.text).join('')).toBe('hi');
  });
});

describe('buildDocxOps — defensive branches for unbalanced token streams', () => {
  // These drive the fallback returns in collectInlineBetween and parseTable
  // that fire when markdown-it (or a hostile consumer) emits an open without
  // a matching close. markdown-it itself never does, but the fallbacks keep
  // the walker from looping forever on bad input.
  it('returns a blockquote when blockquote_close is missing', () => {
    const stub = {
      parse: () => [
        {
          type: 'blockquote_open',
          tag: 'blockquote',
          level: 0,
          content: '',
          children: null,
          attrs: null,
        },
        // No blockquote_close.
      ],
    };
    const out = buildDocxOps('', stub as unknown as Parameters<typeof buildDocxOps>[1]);
    expect(out[0]?.kind).toBe('blockquote');
  });

  it('returns a table when table_close is missing', () => {
    const stub = {
      parse: () => [
        { type: 'table_open', tag: 'table', level: 0, content: '', children: null, attrs: null },
        // No table_close.
      ],
    };
    const out = buildDocxOps('', stub as unknown as Parameters<typeof buildDocxOps>[1]);
    expect(out[0]?.kind).toBe('table');
  });
});
