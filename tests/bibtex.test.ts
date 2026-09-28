import { describe, expect, it } from 'vitest';
import {
  type BibEntry,
  cleanLatex,
  formatReference,
  narrativeName,
  parseBibtex,
  type Segment,
} from '../src/bibtex.ts';

const entry = (type: string, fields: Record<string, string>): BibEntry => ({
  type,
  key: 'k',
  fields,
});
const plain = (segments: Segment[]) => segments.map((s) => s.text).join('');

describe('parseBibtex', () => {
  it('reads braced, quoted, and bare values, lower-casing types and field names', () => {
    const [e] = parseBibtex(`@Article{smith20,
      Title = {The {DNA} of it},
      journal = "Nature {Letters}",
      year = 2020,
      month = jan
    }`);
    expect(e).toEqual({
      type: 'article',
      key: 'smith20',
      fields: { title: 'The DNA of it', journal: 'Nature Letters', year: '2020', month: 'jan' },
    });
  });

  it('reads several entries and skips @comment, @string, and @preamble', () => {
    const entries = parseBibtex(`
      @comment{ignore me}
      @string{acm = "ACM"}
      @preamble{"\\newcommand"}
      @book{a, title = {A}}
      Some stray text between entries.
      @misc{b, title = {B},}
    `);
    expect(entries.map((e) => e.key)).toEqual(['a', 'b']);
  });

  it('reads a missing value as empty', () => {
    expect(parseBibtex('@book{a, title =}')[0]!.fields).toEqual({ title: '' });
  });

  it('skips entries without a key', () => {
    expect(parseBibtex('@book{title = {No key}}\n@book{, title = {Empty}}')).toEqual([]);
  });

  it('keeps what it can from an unterminated entry or value', () => {
    expect(parseBibtex('@book{a, title = {Open')).toEqual([
      { type: 'book', key: 'a', fields: { title: 'Open' } },
    ]);
    expect(parseBibtex('@book{a, title = "Open')[0]!.fields.title).toBe('Open');
  });

  it('keeps escaped braces from unbalancing a value', () => {
    expect(parseBibtex('@book{a, title = {50\\} off}, year = 1999}')[0]!.fields).toEqual({
      title: '50 off',
      year: '1999',
    });
  });
});

describe('cleanLatex', () => {
  it('turns accent commands into letters', () => {
    expect(cleanLatex('G{\\"o}del, \\\'Eva, Fran\\c{c}ois, Ha\\v{s}ek, \\"{\\i}')).toBe(
      'Gödel, Éva, François, Hašek, ï',
    );
  });

  it('maps special letters, escapes, dashes, ties, and TeX logos', () => {
    expect(cleanLatex('Stra\\ss e \\o{} {\\AA} \\& 10\\% 1--2 --- a~b {\\TeX} \\LaTeX')).toBe(
      'Straße ø Å & 10% 1–2 — a\u00A0b TeX LaTeX',
    );
  });

  it('drops formatting commands and collapses whitespace', () => {
    expect(cleanLatex('  An \\emph{important}\n   result ')).toBe('An important result');
  });
});

describe('narrativeName', () => {
  it('names one, two, or many authors by surname', () => {
    expect(narrativeName(entry('book', { author: 'Donald E. Knuth' }))).toBe('Knuth');
    expect(narrativeName(entry('book', { author: 'Knuth, Donald and Lamport, Leslie' }))).toBe(
      'Knuth and Lamport',
    );
    expect(narrativeName(entry('book', { author: 'A One and B Two and C Three' }))).toBe(
      'One et al.',
    );
  });

  it('keeps surname particles and falls back to editors, the title, then the key', () => {
    expect(narrativeName(entry('book', { author: 'Ludwig van Beethoven' }))).toBe('van Beethoven');
    expect(narrativeName(entry('book', { editor: 'Jane Roe' }))).toBe('Roe');
    expect(narrativeName(entry('misc', { title: 'Anonymous Work' }))).toBe('Anonymous Work');
    expect(narrativeName(entry('misc', {}))).toBe('k');
  });
});

describe('formatReference', () => {
  it('formats an article: authors, year, quoted title, venue, pages, DOI link', () => {
    const segments = formatReference(
      entry('article', {
        author: 'Lamport, Leslie and Gödel, Kurt and Noether, Emmy',
        title: 'How to Write a Proof',
        journal: 'Amer. Math. Monthly',
        volume: '102',
        number: '7',
        pages: '600–608',
        year: '1994',
        doi: 'https://doi.org/10.2307/2974556',
      }),
    );
    expect(plain(segments)).toBe(
      'Leslie Lamport, Kurt Gödel, and Emmy Noether. 1994. “How to Write a Proof.” Amer. Math. Monthly 102 (7): 600–608. https://doi.org/10.2307/2974556',
    );
    expect(segments.find((s) => s.italic)?.text).toBe('Amer. Math. Monthly');
    expect(segments.at(-1)).toEqual({
      text: 'https://doi.org/10.2307/2974556',
      link: 'https://doi.org/10.2307/2974556',
    });
  });

  it('formats a book: italic title, edition, publisher and place', () => {
    const segments = formatReference(
      entry('book', {
        author: 'Donald E. Knuth',
        title: 'The TeXbook',
        edition: '3',
        publisher: 'Addison-Wesley',
        address: 'Reading, MA',
        year: '1984',
      }),
    );
    expect(plain(segments)).toBe(
      'Donald E. Knuth. 1984. The TeXbook. 3rd ed. Addison-Wesley, Reading, MA.',
    );
    expect(segments.find((s) => s.italic)?.text).toBe('The TeXbook.');
  });

  it('writes edition ordinals', () => {
    const ed = (edition: string) => plain(formatReference(entry('book', { edition })));
    expect([
      ed('1'),
      ed('2'),
      ed('4'),
      ed('11'),
      ed('12'),
      ed('13'),
      ed('21'),
      ed('Second'),
    ]).toEqual([
      '1st ed.',
      '2nd ed.',
      '4th ed.',
      '11th ed.',
      '12th ed.',
      '13th ed.',
      '21st ed.',
      'Second ed.',
    ]);
  });

  it('credits editors when there are no authors', () => {
    expect(plain(formatReference(entry('book', { editor: 'Jane Roe', title: 'Essays?' })))).toBe(
      'Jane Roe, ed. Essays?',
    );
    expect(plain(formatReference(entry('book', { editor: 'A One and B Two' })))).toBe(
      'A One and B Two, eds.',
    );
  });

  it('uses an institution or school, a volume without a number, and a plain URL', () => {
    expect(
      plain(
        formatReference(
          entry('inproceedings', {
            title: 'A talk',
            booktitle: 'Proc. X',
            volume: '4',
            institution: 'MIT',
            url: 'http://example.com/talk',
          }),
        ),
      ),
    ).toBe('“A talk.” Proc. X 4. MIT. http://example.com/talk');
    expect(plain(formatReference(entry('phdthesis', { school: 'Oxford' })))).toBe('Oxford.');
    expect(plain(formatReference(entry('article', { journal: 'J' })))).toBe('J.');
  });

  it('writes a single-word name as is', () => {
    expect(plain(formatReference(entry('misc', { author: 'Plato', year: '380 BC' })))).toBe(
      'Plato. 380 BC.',
    );
  });

  it('never links a non-web URL', () => {
    const segments = formatReference(entry('misc', { url: 'javascript:alert(1)' }));
    expect(segments).toEqual([{ text: 'javascript:alert(1)' }]);
  });

  it('falls back to the key for an empty entry', () => {
    expect(formatReference(entry('misc', {}))).toEqual([{ text: 'k' }]);
  });
});
