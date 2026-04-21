# Contributing to md-share

Thanks for wanting to help. This project has a clear philosophy (see [PHILOSOPHY.md](./PHILOSOPHY.md)) and a clear quality bar. Read both below before opening a PR.

---

## 🛠 Setup

**Requirements**
- Node 20.19+ (Vite 8 requires this minimum)
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
3. **`vitest run`** — all tests pass.

Additionally, `npm run test:coverage` enforces **100 %** statements / branches / functions / lines on the pure modules (see exclusions in `vitest.config.ts`).

**No suppressions. No `--no-verify`.** If the gate fails, fix the root cause — don't bypass it.

---

## 🏛 Architecture rules

The repo is organized around ports-and-adapters:

| Layer | Location | Rule |
|---|---|---|
| **Pure logic** | `src/` (not `adapters/` or `ui/`) | No `window`, no `document`, no globals. Dependencies arrive as function arguments. |
| **Ports** | `src/ports.ts` | Tiny interfaces for browser APIs (`Synth`, `Clipboard`, `Compressor`, `Printer`). |
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

### Manual smoke test (for user-facing UI changes)

Run `npm run dev`, load `http://localhost:5173/`, and exercise:

- [ ] Flavor switcher — each of the six flavors renders its default doc without errors
- [ ] Share → modal shows URL → paste URL in new tab → read-only banner + content loads
- [ ] Typing in a read-only doc clears the banner and strips the `#d=` payload from the URL (also verify with a legacy `?d=…` link)
- [ ] Listen — progress advances, skip fwd/back work, seek-on-click works, speed change works, `Esc` stops
- [ ] Drop a `.md` file anywhere on the window → it loads into the editor
- [ ] Export: Markdown / HTML / PNG / PDF all download or print
- [ ] Theme toggle — mermaid re-renders with the matching theme
- [ ] Mobile (resize <900px) — Edit/View toggle works
- [ ] Keyboard: `Ctrl+S`, `Ctrl+E`, `Esc`, `Tab` in editor all behave

Also: run `npm run build && npx serve dist` and repeat on the built static output. Then open `dist/index.html` directly via `file://` and confirm it still works.

---

## ➕ Adding a new flavor

1. **Plugin file** — write `src/plugins/<flavor>.ts`. Export a function `(md: MarkdownIt, deps?) => void` that installs your rules. Keep it typed; use `deps` argument for anything framework-external.
2. **Compose it** — add the flavor to the `Flavor` union in `src/types.ts`, the label in `FLAVOR_LABELS` in `src/flavors.ts`, and apply the plugin inside `applyFlavorPlugins`.
3. **Write tests** — `tests/plugins/<flavor>.test.ts`. Cover every rule, every renderer, every silent-mode path. 100 % coverage is enforced.
4. **Add a showcase default** — extend `src/defaults.ts` with a demo document that *actually uses every feature of the flavor*. Remember principle #2: defaults are test content.
5. **Update the UI** — add the `<option>` in `index.html` (in `#flavor-select`).
6. **Run `npm run verify`** — if it's green, open a PR.

---

## ✅ PR checklist

Before opening a PR, confirm:

- [ ] `npm run verify` passes locally (Biome 0 warnings, tsc clean, all tests green)
- [ ] `npm run test:coverage` reports 100 % on pure modules
- [ ] Manual smoke test above passes for any UI-touching change
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
