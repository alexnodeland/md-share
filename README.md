<div align="center">

# 📝 md.render

### ✨ Render, share, and export Markdown — no server required ✨

_The document **is** the URL._

<p>
  <a href="https://github.com/alexnodeland/md-share/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/alexnodeland/md-share/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white">
  <img alt="Biome" src="https://img.shields.io/badge/Biome-2-60A5FA?logo=biome&logoColor=white">
  <br>
  <img alt="Tests" src="https://img.shields.io/badge/tests-190%20passing-34d399">
  <img alt="Coverage" src="https://img.shields.io/badge/coverage-100%25-34d399">
  <img alt="Warnings" src="https://img.shields.io/badge/warnings-0-34d399">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-a78bfa">
</p>

<br>

**Write → Share → Escape.** A lightweight markdown renderer that speaks six dialects, reads itself aloud, and compresses your whole document into a shareable URL. No backend. No account. No "session expired."

[**🌐 Live demo**](https://alexnodeland.github.io/md-share/) · [**Philosophy**](./PHILOSOPHY.md) · [**Contributing**](./CONTRIBUTING.md) · [**License**](./LICENSE)

</div>

---

## 🎯 Features

<table>
<tr>
<td width="50%" valign="top">

### 🪄 Six Markdown flavors
Paste from the tool you already use — it just renders.
- **GFM** · the default
- **CommonMark** · strict
- **Extended** · footnotes, deflists, typographer
- **Academic** · Extended + KaTeX math
- **Obsidian** · callouts, wikilinks, `==highlights==`, `#tags`
- **Atlassian** · `{info}` panels, `{status}`, `{expand}`, `@mentions`

</td>
<td width="50%" valign="top">

### 🔗 Shareable by URL
Your whole document compressed into `?d=…`. Copy the link — the content travels with it. A shared link works offline, forever, as long as someone has the HTML.

### 🎧 Semantic Listen mode
Not `speak(innerText)`. A DOM walker narrates structure:
- Tables read row-by-row with column pairs
- Code blocks announce their language (no source)
- Math and diagrams get described, not read
- Skip forward/back, seek, 0.75×–2× speed

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📤 First-class exports
Users should always be able to leave:
- ⬇️ **Markdown** (`.md`) — the source
- ⬇️ **HTML** snippet — paste anywhere
- 🖼️ **PNG** — for chat, slides, screenshots
- 🖨️ **PDF** — via print CSS, properly themed

</td>
<td width="50%" valign="top">

### ⚡ Weightless editing
- Split pane, 180ms debounced render
- Drag & drop `.md` / `.markdown` / `.txt` anywhere
- `Ctrl+S` · share dialog &nbsp; `Ctrl+E` · toggle editor &nbsp; `Esc` · close / stop
- Tab inserts two spaces, doesn't leave the textarea
- Mobile: Edit/View toggle instead of cramped split

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 Opinionated aesthetics
JetBrains Mono for UI, Source Serif 4 for prose, violet accent (`#a78bfa`). Mermaid themed for dark *and* light. Print CSS re-colors for paper. Design isn't decoration.

</td>
<td width="50%" valign="top">

### 🧪 Testable by construction
Pure logic takes its dependencies as arguments. **100 %** coverage across statements, branches, functions, and lines — enforced. Browser APIs sit behind explicit ports. Adding a flavor is a ~30-line plugin plus tests.

</td>
</tr>
</table>

---

## 🚀 Quick start

```bash
# clone
git clone https://github.com/YOUR_USERNAME/md-share.git
cd md-share

# install
npm install

# dev server with hot reload
npm run dev

# run the full gate (Biome + tsc + Vitest)
npm run verify

# build a static site
npm run build
# → dist/ is deployable to any static host, or openable via file://
```

---

## 🧱 Architecture

```
src/
├── app.ts                  ← composition root (the only impure file)
├── styles.css              ← extracted from single-file original
├── ports.ts                ← Synth · Clipboard · Compressor · Printer
├── types.ts                ← Flavor · Chunk · ShareParams · Theme
├── flavors.ts              ← buildMD(flavor, deps)
├── share.ts                ← encodeDoc · decodeDoc · buildShareURL
├── toc.ts                  ← generateTOC(src)
├── theme.ts                ← mermaidThemeVars · mermaidThemeName
├── defaults.ts             ← per-flavor default docs
├── plugins/                ← 10 markdown-it plugins (one file each)
├── listen/
│   ├── chunker.ts          ← DOM → semantic speech chunks
│   └── player.ts           ← pure state machine, Synth port injected
├── adapters/               ← bind ports to browser APIs
└── ui/                     ← DOM event wiring (excluded from coverage)
```

**Hexagonal / ports-and-adapters.** Pure functions + injected dependencies. The only file that touches `window`, `navigator`, or `document` at the module boundary is `src/app.ts`. Everything else is unit-testable with zero mocks.

---

## 📋 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc --noEmit` + Vite static build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest + v8 coverage (enforces 100 %) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome lint |
| `npm run format` | Biome format (write) |
| `npm run check` | Biome lint + format (write) |
| `npm run verify` | The single gate: Biome (zero-warning) + tsc + Vitest |

The `verify` script is what the pre-commit hook runs. If it fails, the commit is blocked — no suppressions, no `--no-verify` escape hatches.

---

## 🧠 Philosophy

> A Markdown document should be trivially shareable, readable in any flavor, listenable, exportable, and owned by nobody but its author.

See [**PHILOSOPHY.md**](./PHILOSOPHY.md) for the seven guiding principles and the 7-question checklist that gates new features.

---

## 🤝 Contributing

Pull requests welcome. Please read [**CONTRIBUTING.md**](./CONTRIBUTING.md) for the dev workflow, testing conventions, and the non-negotiable quality gate.

Every PR must:
- Pass `npm run verify` (Biome, tsc, Vitest — zero warnings)
- Keep **100 %** coverage on the pure modules
- Answer the 7-question philosophy check for any user-facing change

---

## 📄 License

[MIT](./LICENSE) — do what you want, just keep the notice.

<div align="center">

<sub>Built with ❤️ for writers who paste notes from six different tools and want them all to render.</sub>

</div>
