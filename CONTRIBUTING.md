# Contributing to md-share

Thanks for wanting to help. This project has a clear philosophy (see [PHILOSOPHY.md](./PHILOSOPHY.md)) and a clear quality bar. Read both below before opening a PR.

---

## 🛠 Setup

**Requirements**
- Node 22.12+ (`.nvmrc` pins the major; run `nvm use`). Node 20 reached end-of-life in April 2026.
- npm 10+ (bundled with recent Node versions)

**Install**
```bash
git clone https://github.com/YOUR_USERNAME/md-share.git
cd md-share
npm install
```

The `npm install` step also registers the pre-commit hook via `simple-git-hooks`. Every commit from that point forward runs lint-staged + `tsc --noEmit` before it's allowed through.

---

## 🔁 Dev loop

```bash
npm run dev          # Vite dev server with HMR, http://localhost:5173
npm run test:watch   # Vitest in watch mode (another terminal)
```

For a one-shot sanity check:
```bash
npm run verify       # the single quality gate — see below
```

---

## 🚦 The quality gate

`npm run verify` runs three things, in this order:

1. **`biome check --error-on-warnings .`** — lint + format across TS, CSS, JSON, HTML. Any warning is an error.
2. **`tsc --noEmit`** — strict TypeScript, including `noUncheckedIndexedAccess`.
3. **`vitest run --coverage`** — all tests pass, and **100 %** statements / branches / functions / lines on the pure modules (see exclusions in `vitest.config.ts`).

This is exactly what CI runs, so a green `verify` locally means a green check on the PR.

**No suppressions. No `--no-verify`.** If the gate fails, fix the root cause — don't bypass it.

---

## 🏛 Architecture rules

The repo is organized around ports-and-adapters:

| Layer | Location | Rule |
|---|---|---|
| **Pure logic** | `src/` (not `adapters/` or `ui/`) | No `window`, no `document`, no globals. Dependencies arrive as function arguments. |
| **Ports** | `src/ports.ts` | Tiny interfaces for browser APIs (`Synth`, `Clipboard`, `Compressor`, `Printer`, `Sanitizer`). |
| **Adapters** | `src/adapters/` | Bind ports to real browser APIs. One file per port. Excluded from coverage. |
| **UI wiring** | `src/ui/` | `initX(deps)` functions that attach event listeners. Excluded from coverage. |
| **Composition** | `src/app.ts` | The *only* file that imports adapters and UI modules and wires them together. |

**If your change touches a new browser API:**
1. Add a minimal interface to `src/ports.ts`.
2. Write the adapter in `src/adapters/`.
3. Inject it via `src/app.ts`.
4. Your pure-logic file takes the port type as an argument — it doesn't know the adapter exists.

---

## 🧪 Testing conventions

- `tests/` mirrors `src/` exactly (including subdirectories like `plugins/`, `listen/`).
- Plugin tests construct a real `markdown-it` instance and assert on rendered HTML. No mocks.
- Listen-mode chunker tests use `happy-dom` fixtures — a fake synth for the player's state machine.
- For markdown-it rule internals that fire in silent mode, reach into `md.block.ruler.__rules__` / `md.inline.ruler.__rules__` and call the rule fn directly (see `tests/plugins/katex.test.ts` for the pattern).
- **Don't test what a dependency already tests.** Don't write `expect(document.addEventListener).toHaveBeenCalled()` — that's verifying a DOM API, not your code.
- **Don't chase coverage on UI wiring.** `src/app.ts`, `src/adapters/**`, `src/ui/**` are explicitly excluded. Their correctness is the manual smoke-test checklist below.

### E2E smoke suite (automated)

`npm run test:e2e` builds the site and runs Playwright against `vite preview` (`e2e/`). CI runs it on every PR. It covers:

- every sample renders with no error boxes, rendered diagrams, and TOC links that resolve
- share round trip (content, flavor, read-only banner, fork on edit), CommonMark links, legacy `?d=` links, unreadable links, a new link pasted into an open tab
- TOC clicks keep the `#d=` payload; Recent versions restore after a shared link overwrites the draft and after Clear
- raw-HTML / crafted-fence XSS payloads stay inert
- task checkboxes after frontmatter + comments, Tab/Shift+Tab, Esc→Tab focus escape, case-insensitive replace-all
- HTML and Markdown exports, theme persistence, and the 360 px phone toolbar and Edit/View toggle

First run: `npx playwright install chromium`. To use a Chromium you already have, set `PW_CHROMIUM_PATH=/path/to/chrome`.

When you add a user-facing behavior, add its check to `e2e/` rather than to the list below.

### Manual smoke test (what automation can't cover)

Run `npm run dev`, load `http://localhost:5173/`, and exercise:

- [ ] Cross-browser decode — copy a `#d=…` URL (`df1.` for most docs) from Chrome, open it in Firefox and Safari, confirm it renders identically; do the reverse too
- [ ] Listen — speech plays, progress advances, skip fwd/back and seek-on-click work, speed change works, `Esc` stops
- [ ] Drop a `.md` file anywhere on the window → it loads into the editor; drop an image → it embeds
- [ ] PNG and PDF exports look right; Copy formatted pastes into a doc with formatting
- [ ] Copy a few paragraphs with a link and a list from Google Docs (or Word) and paste — it arrives as Markdown; `Ctrl/⌘+Shift+V` pastes plain
- [ ] Theme toggle — mermaid re-renders with the matching theme
- [ ] Open `dist/index.html` directly via `file://` after `npm run build` and confirm it still works

---

## ➕ Adding a new flavor

1. **Plugin file** — write `src/plugins/<flavor>.ts`. Export a function `(md: MarkdownIt, deps?) => void` that installs your rules. Keep it typed; use `deps` argument for anything framework-external.
2. **Compose it** — add the flavor to the `Flavor` union in `src/types.ts`, the label in `FLAVOR_LABELS` in `src/flavors.ts`, and apply the plugin inside `applyFlavorPlugins`.
3. **Write tests** — `tests/plugins/<flavor>.test.ts`. Cover every rule, every renderer, every silent-mode path. 100 % coverage is enforced.
4. **Add a showcase sample** — extend `SAMPLES` in `src/samples.ts` with a demo document that *actually uses every feature of the flavor*, and add its `<option>` to `#sample-select` in `index.html`. Remember principle #7: samples are test content.
5. **Update the UI** — add the `<option>` in `index.html` (in `#flavor-select`).
6. **Run `npm run verify`** — if it's green, open a PR.

---

## ✅ PR checklist

Before opening a PR, confirm:

- [ ] `npm run verify` passes locally (Biome 0 warnings, tsc clean, all tests green, 100 % coverage on pure modules)
- [ ] `npm run test:e2e` passes, and the manual smoke items above pass for any UI-touching change
- [ ] No new `--no-verify`, no `biome-ignore`, no `@ts-ignore` without a comment explaining why
- [ ] The change answers the 7-question philosophy check in [PHILOSOPHY.md](./PHILOSOPHY.md) for user-facing features

---

## 📝 Commit style

Match the existing log:
- `Phase N: <short summary>` for multi-file phase commits (rare)
- `<Area>: <imperative short summary>` for targeted changes (e.g. `plugins/katex: handle empty $$ block`)
- For reverts and fixups, say so: `Fix: …`, `Revert: …`

Keep the subject ≤ 70 chars. Use the body to explain *why*, not *what*.

---

## 🐛 Reporting issues

For a real bug: include the flavor, a minimal markdown input, expected vs actual rendered output, and (if relevant) the shared-URL reproduction.

For a flavor gap ("tool X supports syntax Y"): include one or two real examples of the syntax as it appears in that tool, so we can match the pragmatic dialect rather than a theoretical spec.

Thanks for contributing! 💜
