import type { Flavor } from './types.ts';

const base = `# md-share

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
B -->|GFM| C[Tables + Tasks]
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

const obsidian = `# Obsidian Flavor Demo

## Callouts

> [!note] This is a note
> Notes are great for supplementary information.

> [!tip] Pro tip
> Try the Listen button — callouts are read as "Tip: content" naturally.

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
A note panel — draws attention.
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

export const DEFAULTS: Record<Flavor | '_base', string> = {
  _base: base,
  gfm: base,
  commonmark: base,
  extended: base,
  academic: base,
  obsidian,
  atlassian,
};

export const defaultFor = (flavor: Flavor): string => DEFAULTS[flavor];
