import type { Flavor } from './types.ts';

const gfm = `# md-share

A lightweight markdown renderer — share via URL, no backend.

## Features

|Feature                     |Status|
|----------------------------|------|
|6 Markdown flavors          |✓     |
|Mermaid diagrams            |✓     |
|Syntax highlighting         |✓     |
|Listen mode (TTS)           |✓     |
|Share via compressed URL    |✓     |
|Export MD / HTML / PNG / PDF|✓     |
|Light & dark themes         |✓     |
|Drag & drop .md files       |✓     |

## How it works

Write markdown on the left. The preview updates live. Hit **Share** to generate a URL with the entire document compressed into the query string — no server needed.

> Try the **Listen** button to hear this document read aloud. Tables are read row-by-row, diagrams are announced, and code blocks are summarized.

## Mermaid

\`\`\`mermaid
graph TD
A[Write Markdown] --> B{Pick Flavor}
B -->|GitHub| C[Tables + Tasks]
B -->|Obsidian| D[Callouts + Wikilinks]
B -->|Atlassian| E[Panels + Status]
B -->|Academic| F[LaTeX Math]
C & D & E & F --> G[Share or Listen]
\`\`\`

## Code

\`\`\`rust
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
\`\`\`

## Task list

- [x] Multiple markdown flavors
- [x] Mermaid + syntax highlighting
- [x] Listen mode with smart TTS
- [ ] World domination

## Shortcuts

|Key     |Action                    |
|--------|--------------------------|
|\`Ctrl+S\`|Share dialog              |
|\`Ctrl+E\`|Toggle editor             |
|\`Esc\`   |Close dialogs / stop audio|

-----

*Switch flavors above. Try **Obsidian** for callouts or **Atlassian** for status badges.*
`;

const commonmark = `# CommonMark Sample

This sample uses only features in the [CommonMark spec](https://spec.commonmark.org/) --- the portable baseline every Markdown engine agrees on.

## Emphasis and strong

*Italic*, **bold**, and ***both***. Use backticks for \`inline code\`.

## Links and images

[Visit CommonMark](https://commonmark.org/) or use an auto-link: <https://commonmark.org/>

![Placeholder image](https://placehold.co/120x40/a78bfa/0c0c0e?text=CommonMark)

## Blockquotes

> CommonMark is a strongly defined, highly compatible specification of Markdown.
>
> > Nested blockquotes work too.

## Lists

Ordered:

1. First item
2. Second item
   1. Nested item
   2. Another nested item
3. Third item

Unordered:

- Apples
- Oranges
  - Blood orange
  - Navel orange
- Bananas

## Code block

\`\`\`
No language hint --- just a plain fenced block.
CommonMark does not require syntax highlighting.
\`\`\`

## Thematic break

---

## Hard line breaks

This line has two trailing spaces
so it breaks here.

## What CommonMark does *not* include

Tables, task lists, footnotes, definition lists, strikethrough, and math are **not** part of the CommonMark spec. Switch to another flavor to use those features.
`;

const extended = `# Extended Flavor Demo

Extended adds **footnotes**, **definition lists**, and **typographer** on top of CommonMark --- plus tables and task lists from GitHub. Ship it :rocket: with a :smile:.

## Footnotes

The Markdown ecosystem is fragmented[^1], which is why md-share supports six flavors[^2].

[^1]: See [Babelmark](https://babelmark.github.io/) to compare how different parsers handle the same input.
[^2]: GitHub, CommonMark, Extended, Academic, Obsidian, and Atlassian.

## Definition lists

Markdown
:   A lightweight markup language created by John Gruber in 2004.

CommonMark
:   A strongly specified variant of Markdown, aiming for unambiguous parsing.

Extended flavor
:   CommonMark plus footnotes, definition lists, typographer, tables, and task lists.

## Typographer

The typographer converts ASCII punctuation into proper Unicode glyphs:

- Straight quotes become "smart quotes"
- Double hyphens become en-dashes -- like this
- Triple hyphens become em-dashes --- like this
- Three dots become an ellipsis...
- \`(c)\` becomes (c), \`(tm)\` becomes (tm)

## Tables

| Feature         | CommonMark | Extended |
|-----------------|:----------:|:--------:|
| Footnotes       |     ---    |    ✓     |
| Definition lists|     ---    |    ✓     |
| Typographer     |     ---    |    ✓     |
| Tables          |     ---    |    ✓     |
| Task lists      |     ---    |    ✓     |

## Task list

- [x] Footnotes
- [x] Definition lists
- [x] Typographer quotes
- [ ] KaTeX math (use Academic flavor)
- [ ] Callouts (use Obsidian flavor)

\`\`\`mermaid
graph LR
A[CommonMark] --> B[+ Footnotes]
B --> C[+ Def Lists]
C --> D[+ Typographer]
D --> E[Extended]
\`\`\`

## Vega-Lite chart

Inline Vega-Lite JSON renders as an SVG chart — remote data URLs are rejected.

\`\`\`vega-lite
{
  "data": {"values": [{"x": "A", "y": 28}, {"x": "B", "y": 55}, {"x": "C", "y": 43}]},
  "mark": "bar",
  "encoding": {"x": {"field": "x", "type": "nominal"}, "y": {"field": "y", "type": "quantitative"}}
}
\`\`\`

## ABC music notation

An \`abc\` fence renders [ABC notation](https://abcnotation.com/) as staff music.

\`\`\`abc
X:1
T:Simple Scale
M:4/4
L:1/4
K:C
C D E F | G A B c |
\`\`\`

## Graphviz

A \`graphviz\` (or \`dot\`) fence renders [Graphviz DOT](https://graphviz.org/doc/info/lang.html) as an SVG graph.

\`\`\`graphviz
digraph G {
  A -> B;
  B -> C;
  A -> C;
}
\`\`\`
`;

const academic = `# Academic Flavor Demo

The Academic flavor adds **LaTeX math** to the Extended feature set --- ideal for technical writing, papers, and lecture notes.

## Inline math

The quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ solves $ax^2 + bx + c = 0$.

Euler's identity $e^{i\\pi} + 1 = 0$ connects five fundamental constants[^euler].

[^euler]: Often called "the most beautiful equation in mathematics."

## Display math

The Gaussian integral:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

Maxwell's equations in differential form:

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0} \\qquad \\nabla \\cdot \\mathbf{B} = 0
$$

$$
\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t} \\qquad \\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}
$$

## Glossary

Eigenvalue
:   A scalar $\\lambda$ such that $A\\mathbf{v} = \\lambda\\mathbf{v}$ for some nonzero vector $\\mathbf{v}$.

Fourier transform
:   $\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x)\\,e^{-2\\pi i x \\xi}\\,dx$

## Comparison

| Feature    | Extended | Academic |
|------------|:--------:|:--------:|
| Footnotes  |    ✓     |    ✓     |
| Def. lists |    ✓     |    ✓     |
| Typographer|    ✓     |    ✓     |
| KaTeX math |   ---    |    ✓     |

## Code

\`\`\`python
import numpy as np

def gaussian(x, mu=0, sigma=1):
    return np.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * np.sqrt(2 * np.pi))
\`\`\`

\`\`\`mermaid
graph TD
A[Raw Markdown] --> B[Extended plugins]
B --> C[KaTeX renderer]
C --> D[Rendered paper]
\`\`\`

## Chess position

Given a [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation) or PGN, a \`chess\` fence renders a static board. Below: the starting position.

\`\`\`chess
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
\`\`\`
`;

const obsidian = `---
dir: auto
---

# Obsidian Flavor Demo

## Callouts

> [!note] This is a note
> Notes are great for supplementary information.

> [!tip] Pro tip
> Try the Listen button --- callouts are read as "Tip: content" naturally.

> [!warning] Watch out
> This is a warning callout.

> [!danger] Critical
> Something really important here.

> [!question] FAQ
> What flavors are supported? All six of them.

## Wikilinks

Link to other notes: [[My Other Note]] or with alias: [[My Other Note|click here]].

## Highlights

This is ==highlighted text== in your document.

## Tags

Organize with tags: #project/md-share #documentation #tools

## Math

Inline: $E = mc^2$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## Comments

This is visible. %%This comment won't render.%% This is also visible.

## RTL (auto-detected)

With \`dir: auto\` in the frontmatter, browsers render Hebrew and Arabic paragraphs right-to-left automatically:

> שלום עולם — זהו משפט בעברית שמודגם בכיוון הנכון.

\`\`\`mermaid
graph LR
A[Obsidian Vault] --> B[md-share]
B --> C[Shared URL]
\`\`\`
`;

const atlassian = `# Atlassian Flavor Demo

## Panels

{info}
This is an info panel for general information.
{info}

{note}
A note panel --- draws attention.
{note}

{warning}
Warning panel for critical information.
{warning}

{tip}
Tips provide helpful suggestions.
{tip}

{info:title=Release Notes}
Version 2.0 includes six markdown flavors and listen mode.
{info}

## Status Badges

Project: {status:color=Green|title=ON TRACK} Review: {status:color=Yellow|title=IN PROGRESS} Blocker: {status:color=Red|title=BLOCKED}

## Mentions

Assigned to @john.smith and reviewed by @jane.doe.

## Expandable Sections

{expand:Implementation Details}

- Step 1: Configure the parser
- Step 2: Add the plugins
- Step 3: Profit
{expand}

## Code

{code:python}
def process():
    return "done"
{code}

\`\`\`mermaid
graph LR
A[Jira Ticket] --> B[Dev] --> C[Review] --> D[Deploy]
\`\`\`
`;

const notion = `# Notion Flavor Demo

A Notion-style page, in plain Markdown. @alex wrote this; review with /comment.

## Toggles

Toggles open with \`?> summary\` and wrap the next blockquote as their body:

?> Roadmap (click to expand)
> - Ship the Notion flavor
> - Gather feedback from @team
> - Iterate on callouts & toggles

?> Hidden trivia
> The toggle body is just a regular blockquote --- every Markdown feature still works inside.

## Colored callouts

Callouts use a \`{callout:color}\` fence. Nine colors are available.

{callout:blue}
**Heads up** --- blue is for informational notes. Ping @alex if unclear.
{callout}

{callout:green}
**Success** --- the build passed. Run /deploy to ship it.
{callout}

{callout:yellow}
**Watch out** --- unsaved work is lost on close. @jane.doe, please confirm.
{callout}

{callout:red}
**Stop** --- do not run /rm-rf without a backup.
{callout}

## Mentions and slash commands

Page owner: @alex. Reviewers: @jane.doe, @bob-smith.

Keyboard-style hints render as code spans: /todo, /heading1, /toggle, /callout.

## A list

1. Write the doc.
2. Share it via URL.
3. No server required --- the document *is* the URL.

## A little code

\`\`\`ts
const share = (doc: string) => \`#d=\${compress(doc)}\`;
\`\`\`

## Typography

"Smart quotes", en--dashes, and em---dashes pass through the base parser untouched.
`;

const presentation = `# Presentation demo

A slideshow built from plain Markdown.

Press **⌘⌥P** (or **Ctrl+Alt+P** on Windows/Linux, or use the export menu → **Present slides**) to begin.

Use **→** / **←** to navigate. **Esc** or click to exit.

---

## 1 · Slides split on \`---\`

Each thematic break (\`---\`) in your document becomes a new slide while presenting.

Outside presentation mode it renders as a normal horizontal rule, so the document stays portable.

---

## 2 · Anything Markdown works

- Lists, quotes, images, and code blocks
- Tables and task lists
- Mermaid diagrams (Extended flavor)
- KaTeX math (Academic flavor)

> Lean text scales best — keep it short and let the reader pause.

---

## 3 · A little code

\`\`\`ts
const greet = (name: string) => 'Hello, ' + name;
console.log(greet('presenter'));
\`\`\`

---

## 4 · Print to PDF

While presenting, open the browser print dialog (**⌘P** / **Ctrl+P**) to export one slide per page — no editor chrome.

---

## That's it

Press **Esc** to exit. \`---\` becomes a plain horizontal rule again — your document is unchanged.
`;

export type SampleKey = Flavor | 'presentation';

export const SAMPLES: Record<SampleKey, string> = {
  commonmark,
  extended,
  academic,
  gfm,
  obsidian,
  atlassian,
  notion,
  presentation,
};

export const SAMPLE_LABELS: Record<SampleKey, string> = {
  commonmark: 'CommonMark',
  extended: 'Extended',
  academic: 'Academic',
  gfm: 'GitHub',
  obsidian: 'Obsidian',
  atlassian: 'Atlassian',
  notion: 'Notion',
  presentation: 'Presentation',
};

export const SAMPLE_FLAVOR: Record<SampleKey, Flavor> = {
  commonmark: 'commonmark',
  extended: 'extended',
  academic: 'academic',
  gfm: 'gfm',
  obsidian: 'obsidian',
  atlassian: 'atlassian',
  notion: 'notion',
  presentation: 'commonmark',
};

export const isSampleKey = (s: string): s is SampleKey => s in SAMPLES;

export const sampleFor = (key: SampleKey): string => SAMPLES[key];

export const isSampleContent = (text: string): SampleKey | null => {
  const trimmed = text.trim();
  for (const key of Object.keys(SAMPLES) as SampleKey[]) {
    if (SAMPLES[key].trim() === trimmed) return key;
  }
  return null;
};
