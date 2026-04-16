# CLAUDE.md

Orientation for AI assistants working in this repo. Humans should start with [README.md](./README.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## Read first

- **[PHILOSOPHY.md](./PHILOSOPHY.md)** — product north star. Consult before proposing any user-facing feature. Every new feature must answer the 7-question check at the bottom.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — setup, quality gate, architecture rules, adding-a-flavor recipe, manual smoke-test checklist.

If a request conflicts with PHILOSOPHY.md, surface the conflict before implementing.

## What this is

md-share: a zero-backend Markdown viewer/editor. The document *is* the URL (lz-string-compressed into `?d=`). Ships as static `index.html` + `assets/*.js`. No accounts, no server, no storage.

Six flavors: CommonMark, Extended, Academic (KaTeX), GitHub (`gfm`), Obsidian, Atlassian.

## Architecture (ports-and-adapters)

| Layer | Location | Rule |
|---|---|---|
| Pure logic | `src/*.ts`, `src/plugins/`, `src/listen/` | No `window`, `document`, or globals. Deps arrive as function args. |
| Ports | `src/ports.ts` | Interfaces for browser APIs (`Synth`, `Clipboard`, `Compressor`, `Printer`). |
| Adapters | `src/adapters/` | Bind ports to real browser APIs. One file per port. |
| UI wiring | `src/ui/` | `initX(deps)` functions attaching event listeners. |
| Composition | `src/app.ts` | The only file that imports adapters + UI and wires them. |

Pure modules are tested with **100% statements/branches/functions/lines** (enforced in `vitest.config.ts`). `app.ts`, `adapters/**`, `ui/**`, `types.ts`, `ports.ts`, `defaults.ts` are deliberately excluded — correctness verified by the manual smoke test in CONTRIBUTING.md.

Touching a new browser API? Add a port in `src/ports.ts`, an adapter in `src/adapters/`, wire it in `app.ts`. The pure module takes the port as an argument.

## Quality gate

Single command: `npm run verify` → Biome (0 warnings) + `tsc --noEmit` + Vitest.

Coverage: `npm run test:coverage` — 100% on pure modules, no asterisks.

**Never** bypass with `--no-verify`, `biome-ignore`, or `@ts-ignore` without an explicit justification the user has approved. Fix the root cause.

## Conventions

- `tests/` mirrors `src/` exactly (including subdirs).
- Plugin tests use a real `markdown-it` instance and assert on rendered HTML — no mocks.
- Don't test that a dependency's API was called (e.g. `addEventListener`). Test *your* logic.
- Defaults are test content: `src/defaults.ts` is the first rendering most users see — beware smart-quote / en-dash corruption (principle from PHILOSOPHY §7).
- TypeScript strict, including `noUncheckedIndexedAccess`.

## Commit style

`<Area>: <imperative summary>` (e.g. `plugins/katex: handle empty $$ block`), ≤70 chars. Body explains *why*, not *what*. See `git log` for the existing cadence.

## Out of scope by default

Anything requiring server state (accounts, persistence, collaboration) unless expressible as URL or local-storage semantics. When in doubt, ask.
