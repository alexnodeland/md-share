# md-share — Philosophy

North-star reference. When a feature decision is ambiguous, it should answer to these principles.

## 1. Serverless by conviction

No backend, no account, no database. **The document *is* the URL.** Content is compressed with lz-string into the query string; sharing = copying a link.

- State lives in the user's hands, never ours.
- No signup wall, no storage quota, no "your session expired."
- A shared link works offline, forever, as long as someone has the HTML.

There is a build step — Vite bundles TypeScript to static assets — but the *output* is still pure `index.html` + `assets/*.js`, deployable to any static host (GitHub Pages, Cloudflare Pages, Netlify, S3, or opened directly via `file://`). "Serverless" is about runtime, not toolchain.

Implication: features that would require server state (collaboration, persistence, accounts) are out of scope unless they can be expressed as pure URL/local-storage semantics.

## 2. Meet writers where they already are

There is no One True Markdown. People paste notes from the tool they already use — and it *just renders*. No reformatting tax, no "export to standard Markdown first."

Implication: when adding a flavor or plugin, the test is "does this unlock content that a real writer already has sitting in another app?" (Current flavors and what each covers live in the README.)

## 3. Render, share, escape

The app is a **pass-through, not a silo.** Users can always leave with their content intact, in the format of their choice. We earn re-use by being useful, not by trapping them.

Implication: every rendered document must have an export path that preserves it. A new feature that can't be exported is a feature that traps.

## 4. Accessibility as a feature, not a checkbox

**If a sighted user sees structure, a listening user should hear structure.** Listen mode is not `speak(innerText)` — a DOM walker narrates semantics: tables read row-by-row with column pairs, code blocks announce their language without reading source, diagrams and math get described. Speaking highlights and scrolls the corresponding element.

Implication: never flatten. When adding a block-level feature, decide what it *sounds* like before shipping it.

## 5. Live, low-friction editing

Editing should feel weightless. Viewing a shared link shows a **read-only banner**; typing silently forks it (removes the banner, strips the query string). Shared docs are *suggestions*, not contracts.

Implication: the write → share loop is the core path. New UI must not add modal steps, confirmations, or "save" ceremony to it. (Exact shortcuts and interactions live in the README.)

## 6. Opinionated aesthetics

A tool with a voice, not neutral chrome. One typographic system for UI, prose, and code; one accent; one palette that callouts, panels, status badges, and Mermaid all share; print CSS that re-colors for paper.

Design isn't decoration; it's the difference between a tool you use and a tool you *want* to use.

Implication: new components inherit the existing design tokens. Nothing should look bolted on.

## 7. Testable by construction

Product principles 1–6 don't survive contact with real users unless the code stays honest. Pure logic is pure; browser APIs live behind ports; one composition root wires them together; 100% coverage on pure modules is enforced; every commit passes a zero-warning gate. (Architecture rules and the gate itself live in [CONTRIBUTING.md](./CONTRIBUTING.md).)

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
