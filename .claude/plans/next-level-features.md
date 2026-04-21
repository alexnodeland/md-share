# Next-level features for md-share

A survey of candidate features that could bring md-share to the next level, each measured against the 7-question check in [PHILOSOPHY.md](../../PHILOSOPHY.md).

> Excluded from this doc by request: command palette, editor slash-commands, remix lineage.

The seven gates are shorthanded as:
1. No server? 2. Respects existing flavors? 3. Export parity? 4. Degrades for listen/print/mobile? 5. No friction on write → share? 6. Pure-logic with injected deps? 7. Ships under the `verify` gate at 100% pure-module coverage?

---

## Tier 1 — High impact, perfectly aligned

### 1. QR code in share modal
A QR of the current `?d=…` URL, rendered client-side (e.g. `qrcode` npm). Solves "open this on my phone" with zero backend. Fits beside the existing copy-link button.

- **Why now:** the share URL already *is* the document — a QR is just another rendering of the same string.
- **Shape:** new `src/qr.ts` pure (takes string → matrix), `src/adapters/qr.ts` or UI-level canvas draw, toggled in `ui/share.ts`.
- **Gate:** 1✅ 2 n/a 3✅ 4 (graceful hide on print) 5✅ 6✅ 7✅.

### 2. URL length meter + overflow strategy
Long `?d=` URLs get mangled by SMS, Slack, Discord, QR scanners. Show a live indicator in the share modal (green < 1 KB, amber < 2 KB, red above) and when we cross the threshold, suggest:
- Strip embedded base64 images (`imageEmbed.ts` already is the choke point)
- "Download .md + share that" hint
- "Copy as data URL" for paste-into-email

- **Shape:** `src/shareSize.ts` pure — `(encoded, limits) → { band, suggestions }`. UI consumes it.
- **Gate:** 1✅ 2 n/a 3✅ 4✅ 5✅ 6✅ 7✅.

### 3. DOCX / HTML paste → Markdown import
The biggest flavor-gap isn't a flavor, it's *input*. People paste from Google Docs, Notion exports, Word, Confluence. Use `turndown` on HTML paste and `mammoth` (in-browser) on dropped `.docx`.

- **Why:** principle #2 literally says "meet writers where they are." Most writers don't have Markdown on their clipboard.
- **Shape:** `src/importers/html.ts` and `src/importers/docx.ts`, pure functions `(input) → markdown`. Adapters wrap the third-party libs behind a `HtmlToMd` / `DocxToMd` port. Lazy-loaded bundles.
- **Gate:** 1✅ 2✅ 3✅ 4 n/a 5✅ 6✅ 7✅.

### 4. Export to standalone `.html` and `.docx`
Current HTML export is a *snippet*. Add:
- **Self-contained HTML** — single file, styles inlined, fonts via data URIs, renders offline. The "I just need to email someone this doc" format.
- **`.docx`** via the `docx` package — Academic/GitHub flavors benefit most.

Both serve principle #3 (escape with parity).

- **Shape:** `src/export/standaloneHtml.ts` pure (HTML + CSS text → single string), `src/export/docx.ts` pure AST → ops. Wire through `exportMenu`.
- **Gate:** 1✅ 2✅ 3✅ 4 n/a 5✅ 6✅ 7✅.

---

## Tier 2 — Flavor & rendering depth

### 5. Academic flavor depth (Pandoc-ish)
The Academic flavor stops at KaTeX. Add:
- `[@citekey]` → numbered citations, with a bibliography block (BibTeX-in-codefence or YAML array in frontmatter).
- Figure/table numbering + `{#fig:foo}` cross-refs → `\ref{fig:foo}`-style.
- Equation numbering with `{#eq:foo}`.

- **Shape:** new `src/plugins/pandocCite.ts` + `src/plugins/crossRef.ts`. Tests render HTML against real markdown-it.
- **Gate:** 1✅ 2✅ 3 (export to LaTeX is its natural parity — see #7) 4✅ 5✅ 6✅ 7✅.

### 6. Notion flavor
Different enough from Obsidian to warrant its own plugin:
- Toggles (`▸ heading` / `▾ heading` collapse blocks)
- Colored callouts (`<aside>` with color attr)
- `@mentions` and inline databases as tables
- `/` slash commands in source rendered as literal `/command`

- **Shape:** `src/plugins/notion.ts` + sample doc in `src/defaults.ts`.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅.

### 7. LaTeX / Typst export from Academic
Mathematicians want to leave with `.tex`, not PDF. A pure AST → LaTeX serializer that understands the Academic feature set (math, cites, figures, cross-refs).

- **Shape:** `src/export/latex.ts` pure (markdown AST → string). Typst is a second serializer with the same input.
- **Gate:** 1✅ 2✅ 3✅ 4 n/a 5✅ 6✅ 7✅.

### 8. More diagram renderers (all lazy, all like Mermaid)
Mermaid already proves the lazy-loaded-wasm pattern. Add:
- **Graphviz** (`viz.js` wasm) — dot graphs
- **D2** (wasm) — modern diagrams
- **ABC** music notation
- **Chess** boards from FEN / PGN
- **Vega-Lite** charts from JSON

Each is a `pre.lang-<kind>` handler that mirrors `src/plugins/mermaid.ts` + a render step in `app.ts`.

- **Gate:** 1✅ 2 n/a 3 (rendered as SVG in HTML export; source survives in Markdown export) 4 (describe block for listen — see #10) 5✅ 6✅ 7✅.

### 9. Document linter pane
Run on the same parse the renderer does. Flags:
- Broken heading refs (`[#not-a-heading]`)
- Missing footnote definitions
- Duplicate slug IDs
- Images without alt text
- Tables without headers
- Math with unbalanced `$` or `$$`
- Dead wikilinks (Obsidian flavor)

Collapsed drawer at the bottom of the preview, with counts in a badge.

- **Shape:** `src/lint.ts` pure — `(ast | rendered DOM, flavor) → Diagnostic[]`. UI panel consumes the array.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5 (opt-in drawer) 6✅ 7✅.

---

## Tier 3 — Listen mode & a11y depth (principle #4)

### 10. Karaoke caption overlay
Render a bottom strip showing the current utterance text as it plays. Helps low-hearing users and loud environments.

- **Shape:** the chunker already produces the text; a new UI overlay subscribes to the player state machine.
- **Gate:** 1✅ 2 n/a 3 n/a 4 (is the a11y feature) 5✅ 6✅ 7 (UI-only, smoke-tested).

### 11. Voice picker with saved preference
Current synth uses the browser default. Let users pick from `synth.getVoices()`, preview, and persist in localStorage.

- **Shape:** extend `Synth` port with `listVoices()`; pure `voicePreference.ts` handles selection logic; UI dropdown in listen bar.
- **Gate:** 1✅ 2 n/a 3 n/a 4✅ 5✅ 6✅ 7✅.

### 12. Per-block language tagging
A `lang="fr"` attribute on blockquotes/headings via a small directive (`[[lang:fr]] …` or frontmatter). Consumed by listen mode (voice switch) *and* `<html lang>` as fallback.

- **Shape:** tiny markdown-it rule + extension to the listen chunker.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅.

---

## Tier 4 — Editing ergonomics (principle #5)

### 13. Autocomplete for heading refs, footnotes, wikilinks
As the user types `[[`, `[^`, or `#` inside a link, surface suggestions drawn from the current document.

- **Shape:** `src/editorComplete.ts` pure — `(source, cursor) → Suggestion[]`. Popup UI rendered from the existing selection-toolbar pattern.
- **Gate:** 1✅ 2✅ 3 n/a 4 (desktop feature; degrades gracefully on mobile) 5✅ 6✅ 7✅.

### 14. Markdown-aware wrapping & multi-cursor
Select text, press `**`, it wraps. Press `[`, it wraps in `[…](url)` with cursor in the URL slot. Same pattern for `` ` ``, `_`, `~~`, `==`. Optional VS-Code-style multi-cursor for column edits.

- **Shape:** extend `src/editorCommands.ts` (pure string + range → range).
- **Gate:** 1✅ 2✅ 3 n/a 4✅ 5✅ 6✅ 7✅.

### 15. Local draft history
Currently there's one draft in localStorage. Keep a rolling N snapshots keyed by content hash; a "History" drawer lets users recover from an accidental clear or flavor switch.

- **Shape:** extend `src/draft.ts` with a ring buffer. Opt-in toggle in settings. Fully local, no server.
- **Gate:** 1✅ 2 n/a 3 n/a 4 n/a 5 (opt-in) 6✅ 7✅.

### 16. File System Access API
Open a `.md` file in place so Ctrl+S saves back to disk. Fallback to download on unsupported browsers.

- **Shape:** new port `FileHandle` in `ports.ts`; adapter in `src/adapters/fileHandle.ts`; UI in export menu ("Open…" / "Save to disk").
- **Gate:** 1✅ 2 n/a 3✅ 4 n/a 5 (speeds up the loop for power users) 6✅ 7✅.

---

## Tier 5 — Polish

### 17. Web Share Target + PWA manifest
The service worker is already registered. Add a manifest with `share_target` so Android's share sheet can route `.md`/`text/plain` into md-share.

- **Gate:** 1✅ 2 n/a 3 n/a 4 n/a 5 (removes a step) 6 n/a (manifest) 7 (build-time asset).

### 18. Embed mode (`?embed=1`)
Hide all chrome — header, banner, editor toggle. For iframing docs into other sites. Keyboard shortcuts still work; print CSS unchanged.

- **Shape:** one CSS class + a switch in `app.ts` based on parsed share params.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅.

### 19. Custom theme via URL
A third compressed param `?t=` containing a CSS-variables delta (accent, serif, mono, palette). Lets a team brand their shared docs without forking the HTML.

- **Shape:** `src/theme.ts` already owns theme vars; extend with `(overrides) → stylesheet`, wire through share params. Sanitize to a known allowlist of variables — this is the main security surface.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅ (with strict sanitization tests).

### 20. Writing stats deepening
Current stats = word + char count. Add reading time, Flesch-Kincaid, heading count, link count. Still a pure function over source.

- **Shape:** extend `src/stats.ts` — it's already a pure module.
- **Gate:** all ✅.

### 21. Paste-image-from-clipboard
Drag-drop already works. Verify and polish Ctrl+V of a screenshot so it runs through `compressImage` and `insertImageAtCursor` the same way a drop does.

- **Shape:** extend editor paste handler in `ui/editor.ts`.
- **Gate:** all ✅.

### 22. Emoji shortcodes + picker
`:smile:` → 😄 via a markdown-it plugin, plus a picker on `:` autocomplete.

- **Shape:** `src/plugins/emoji.ts`.
- **Gate:** all ✅.

### 23. Internationalization
- RTL content support (Hebrew/Arabic) — CSS `dir="auto"` on prose containers + a frontmatter override.
- UI translation scaffold (small, since UI surface is small).

- **Gate:** all ✅.

### 24. Accessibility contrast checker
For user-embedded colors (Atlassian panels, custom theme via #19, Mermaid overrides), compute WCAG contrast and surface failures in the linter pane (#9).

- **Gate:** all ✅.

### 25. Outline / focus mode
Collapse everything outside the current heading section. Useful for long docs, keyboard navigable.

- **Gate:** all ✅.

### 26. Source URL trust hint
When a shared link loads, show the origin host of `document.referrer` briefly in the read-only banner, so users know where the link came from. Defense-in-depth UX.

- **Gate:** all ✅.

---

## Explicitly out-of-bounds

These fail gate #1 (no server) and are listed so they don't keep getting re-proposed:

- Real-time collaboration, persistent comments, accounts, cloud sync
- Grammar / style check via remote LLM API
- Any "Sign in with …" flow
- Server-side short-link service

A WebRTC-only co-edit is *technically* serverless at runtime but the signaling channel pushes it past "zero backend" in spirit; leave for a separate design doc if ever revisited.

---

## Suggested sequencing

If picking a path through these:

1. **#2 URL length meter** first — it protects the primary use case and reveals whether #3/#4 (importers/exports) are urgent.
2. **#1 QR code** — tiny, high delight, ships in an afternoon.
3. **#3 HTML/DOCX paste import** — biggest principle-#2 win per line of code.
4. **#9 Linter pane** — once there are more features, having self-check becomes proportionally more valuable.
5. **#4 Standalone HTML / DOCX export** — closes the loop with principle #3.
6. Everything else as interest and usage data suggest.
