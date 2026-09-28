<div align="center">

# 📝 md-share

### ✨ Render, share, and export Markdown — no server required ✨

_The document **is** the URL._

<p>
  <a href="https://github.com/alexnodeland/md-share/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/alexnodeland/md-share/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white">
  <img alt="Biome" src="https://img.shields.io/badge/Biome-2-60A5FA?logo=biome&logoColor=white">
  <br>
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
- **CommonMark** · the default, strict
- **Extended** · footnotes, deflists, typographer
- **Academic** · Extended + KaTeX math
- **GitHub** · tables, task lists, strikethrough
- **Obsidian** · callouts, wikilinks, `==highlights==`, `#tags`
- **Atlassian** · `{info}` panels, `{status}`, `{expand}`, `@mentions`

</td>
<td width="50%" valign="top">

### 🔗 Shareable by URL
Your whole document compressed into the URL fragment `#d=…`. Copy the link, hand it to your phone's share sheet, or scan the QR code to open it on another device — the content travels with it, and because it rides in the fragment, it never reaches a server. A shared link works offline, forever, as long as someone has the HTML.

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
- ⬇️ **HTML page** — one self-contained file, styled like the preview
- 📋 **Copy formatted** — paste into Docs, email, or Notion with formatting intact
- 🖼️ **PNG** — for chat, slides, screenshots
- 🖨️ **PDF** — via print CSS, properly themed; folded sections print expanded

</td>
<td width="50%" valign="top">

### ⚡ Weightless editing
- Split pane, 180ms debounced render
- Paste from Google Docs, Word, Notion, or a web page — it arrives as Markdown (add `Shift` to paste plain text)
- Drag & drop `.md` / `.markdown` / `.txt` anywhere
- Recent versions: loading a sample, clearing, dropping a file, or opening someone's link keeps your previous text one click away
- `Ctrl+S` · share dialog &nbsp; `Ctrl+E` · toggle editor &nbsp; `Esc` · close / stop
- `Tab` / `Shift+Tab` indent and outdent the selected lines; `Esc` then `Tab` moves focus out of the editor
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
git clone https://github.com/YOUR_USERNAME/md-share.git
cd md-share
npm install
npm run dev       # http://localhost:5173
npm run build     # → dist/ (static, deployable anywhere, openable via file://)
```

Full dev loop, scripts, architecture rules, and testing conventions live in [**CONTRIBUTING.md**](./CONTRIBUTING.md).

### Generate a share link from a local file

You can generate an md-share URL from a local `.md`, `.markdown`, or `.txt` file with a curl-friendly script:

```bash
# download the script
curl -fsSL https://raw.githubusercontent.com/alexnodeland/md-share/main/scripts/generate-share-link.mjs -o generate-share-link.mjs

# run it against a local file
node generate-share-link.mjs ./notes.md
```

Or run the version in this repo directly:

```bash
npm run share:link -- ./notes.md
```

---

## 🧠 Philosophy

> A Markdown document should be trivially shareable, readable in any flavor, listenable, exportable, and owned by nobody but its author.

See [**PHILOSOPHY.md**](./PHILOSOPHY.md) for the seven principles and the 7-question checklist that gates new features.

---

## 🤝 Contributing

Pull requests welcome — see [**CONTRIBUTING.md**](./CONTRIBUTING.md) for the workflow and quality gate.

---

## 📄 License

[MIT](./LICENSE) — do what you want, just keep the notice.

<div align="center">

<sub>Built with ❤️ for writers who paste notes from six different tools and want them all to render.</sub>

</div>
