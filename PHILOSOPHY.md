# md.render — Philosophy

North-star reference. When a feature decision is ambiguous, it should answer to these principles.

## 1. Serverless by conviction

No backend, no account, no database. **The document *is* the URL.** Content is compressed with lz-string into the query string; sharing = copying a link.

- State lives in the user's hands, never ours.
- No signup wall, no storage quota, no "your session expired."
- A shared link works offline, forever, as long as someone has the HTML.

There is a build step — Vite bundles TypeScript to static assets — but the *output* is still pure `index.html` + `assets/*.js`, deployable to any static host (GitHub Pages, Cloudflare Pages, Netlify, S3, or opened directly via `file://`). "Serverless" is about runtime, not toolchain.

Implication: features that would require server state (collaboration, persistence, accounts) are out of scope unless they can be expressed as pure URL/local-storage semantics.

## 2. Meet writers where they already are

There is no One True Markdown. The app speaks six dialects:

- **GFM** — default, what most people paste.
- **CommonMark** — the spec, strict.
- **Extended** — footnotes, deflists, typographer.
- **Academic** — Extended + KaTeX.
- **Obsidian** — callouts, wikilinks, `==highlights==`, `#tags`, `%%comments%%`, math.
- **Atlassian** — `{info}` panels, `{status}`, `{expand}`, `@mentions`, `{code}`.

People paste notes from the tool they already use and it *just renders*. No reformatting tax, no "export to standard Markdown first."

Implication: when adding a flavor or plugin, the test is "does this unlock content that a real writer already has sitting in another app?"

## 3. Render, share, escape

The app is a **pass-through, not a silo.** Exports are first-class, not buried:

- Markdown (`.md`) — the source.
- HTML snippet — paste anywhere.
- PNG — for chat, slides, screenshots.
- PDF — via print CSS, properly themed.

Users can always leave with their content intact. We earn re-use by being useful, not by trapping them.

## 4. Accessibility as a feature, not a checkbox

**Listen mode is semantic, not dumb `speak(innerText)`.** The DOM walker narrates structure:

- Headings → `"Section: <title>"`
- Tables → `"A table with columns X, Y, Z"` then `"Row 1. Name: Alice. Status: Done."`
- Code blocks → `"A code block in rust"` (not the code itself)
- Diagrams → `"A diagram is shown here"`
- Math → `"A mathematical equation is displayed"`
- Callouts → `"Tip: <body>"`, `"Warning: <body>"`
- Task lists → `"Done: <item>"` / `"Not done: <item>"`
- Lists, blockquotes, expands, footnotes, deflists — each handled on its own terms.

Speaking chunk highlights and scrolls the corresponding element. Skip forward/back, seek, 0.75×–2× speed.

This is the principle: **if a sighted user sees structure, a listening user should hear structure.** Never flatten.

## 5. Live, low-friction editing

Editing should feel weightless:

- Split pane, 180ms debounced render.
- Drag-and-drop `.md` / `.markdown` / `.txt` anywhere on the window.
- `Ctrl+S` → share dialog (not "save to cloud").
- `Ctrl+E` → toggle editor pane for distraction-free reading.
- `Esc` → close any modal, stop audio.
- Tab inserts two spaces, doesn't leave the textarea.
- Mobile: Edit/View toggle instead of cramped split.

Viewing a shared link shows a **read-only banner** — "Viewing a shared document — edit to make it yours." Typing silently forks it (removes the banner, strips the query string). Shared docs are *suggestions*, not contracts.

## 6. Opinionated aesthetics

A tool with a voice, not neutral chrome:

- JetBrains Mono for UI and code, Source Serif 4 for prose.
- Violet accent (`#a78bfa` / `#7c3aed`), carefully tuned dark and light tokens.
- Mermaid themed to match both modes.
- Callouts, panels, status badges all share the same palette — nothing looks bolted on.
- Print CSS strips chrome and re-colors for paper.

Design isn't decoration; it's the difference between a tool you use and a tool you *want* to use.

## 7. Testable by construction

Product principles 1–6 don't survive contact with real users unless the code stays honest. The architecture reflects that:

- **Pure logic is pure.** Plugins, the share-URL codec, the TOC generator, the DOM-to-speech chunker, and the listen-mode state machine take their dependencies as arguments. They touch no globals, no `window`, no `document` at the module boundary. They are tested against `markdown-it` instances or `happy-dom` fixtures with zero mocks.
- **Ports isolate the browser.** The things we can't test — `SpeechSynthesis`, `navigator.clipboard`, `window.print`, `html2canvas`, `LZString`, `mermaid.run` — live behind explicit `Synth`, `Clipboard`, `Printer`, `Compressor` ports. A handful of adapters in `src/adapters/` bind them to real APIs. `src/app.ts` is the only file that wires adapters to pure modules.
- **100% coverage on the pure modules, no asterisks.** Statements, branches, functions, and lines — all four at 100%, enforced by `vitest.config.ts` thresholds. The modules that are deliberately excluded (`app.ts`, `adapters/**`, `ui/**`) are listed with a justification; their correctness is verified by manual smoke tests, not by tests that assert `addEventListener` was called.
- **Zero-warning lifecycle.** Biome + `tsc --noEmit` + Vitest run on every commit through `simple-git-hooks`. `npm run verify` is the single gate. No suppressions, no "nits."

This is why refactoring is safe, why adding a flavor is a 30-line plugin file plus ~10 tests, and why the migration from single-file HTML to modules didn't regress a single user-facing feature.

A corollary: **defaults are test content.** During the TS migration we discovered the single-file `index.html` had accumulated smart-quote and en-dash corruption from a copy-paste round-trip — enough that the default Mermaid diagrams would not parse and every CSS variable was silently unresolved (`var(–border)` instead of `var(--border)`). Philosophy #2 (*meet writers where they are*) means: the default docs are the first rendering most users see. They're not decoration; they're the implicit promise that "this thing works."

---

## Core thesis

> A Markdown document should be trivially shareable, readable in any flavor, listenable, exportable, and owned by nobody but its author.

When evaluating a new feature, ask:

1. Does it require a server? → probably no.
2. Does it respect flavors the user already writes in? → required.
3. Does it keep export parity? → required.
4. Does it degrade for listening / printing / mobile? → required.
5. Does it add friction to the core write → share loop? → probably no.
6. Can the pure logic be written with injected dependencies and tested without a DOM or network? → required.
7. Can it ship behind the existing `npm run verify` gate with 100% coverage on the pure modules and zero warnings? → required.
