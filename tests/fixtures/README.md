# Test fixtures

## `sample.docx`

Minimal DOCX used by `tests/integration/importers/docx.test.ts` and
`tests/integration/export/docx.test.ts` for round-trip integration tests.

Contents (deliberately small — each piece exercises a Mammoth feature):

- One `<h1>` heading
- One paragraph with `<strong>` bold and `<em>` italic inline runs
- One three-item unordered list
- One 2×2 table with a header row

### Regenerate

```sh
node tests/fixtures/generate-sample-docx.mjs
```

The generator uses the `docx` package (dev-dep) to emit a proper
OOXML Word document — paragraphs, runs, tables — that Mammoth can
parse. An earlier attempt using `html-docx-js-typescript` produced
files wrapping the HTML as `<w:altChunk>`, which Mammoth ignores by
design; avoid that path for Mammoth-backed fixtures.

If a test is sensitive to specific Word-ish styling that this
generator doesn't reproduce, author a replacement manually in
LibreOffice / Google Docs / Word and overwrite `sample.docx` in
place; the integration tests assert on structural fragments, not on
an exact round-trip of the input.
