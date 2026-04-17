import type hljs from 'highlight.js';
import type katexNs from 'katex';
import MarkdownIt from 'markdown-it';
import mdDeflist from 'markdown-it-deflist';
import mdFootnote from 'markdown-it-footnote';

import { addHeadingAnchors } from './plugins/anchors.ts';
import { pluginAtlassianBlocks } from './plugins/atlassianBlocks.ts';
import { pluginAtlassianInline } from './plugins/atlassianInline.ts';
import { addCodeLangLabels } from './plugins/codeLang.ts';
import { applyHighlighting } from './plugins/highlighting.ts';
import { pluginKaTeX } from './plugins/katex.ts';
import { createMermaidCounter, type MermaidCounter, wrapMermaidFences } from './plugins/mermaid.ts';
import { pluginObsidianCallouts } from './plugins/obsidianCallouts.ts';
import { pluginObsidianComments } from './plugins/obsidianComments.ts';
import { pluginObsidianInline } from './plugins/obsidianInline.ts';
import { applySafeLinks } from './plugins/safeLinks.ts';
import { pluginTaskList } from './plugins/taskList.ts';
import type { Flavor } from './types.ts';

export interface FlavorDeps {
  highlighter: typeof hljs;
  katex: typeof katexNs | null;
  mermaidCounter: MermaidCounter;
  onUnknownLanguage?: (lang: string) => void;
}

export const FLAVOR_LABELS: Record<Flavor, string> = {
  commonmark: 'CommonMark',
  extended: 'Extended',
  academic: 'Academic',
  gfm: 'GitHub',
  obsidian: 'Obsidian',
  atlassian: 'Atlassian',
};

const createBase = (flavor: Flavor): MarkdownIt => {
  if (flavor === 'commonmark') return new MarkdownIt('commonmark');
  if (flavor === 'gfm' || flavor === 'atlassian') {
    return new MarkdownIt({ html: true, linkify: true });
  }
  return new MarkdownIt({ html: true, linkify: true, typographer: true });
};

const applyFlavorPlugins = (md: MarkdownIt, flavor: Flavor, deps: FlavorDeps): void => {
  if (flavor === 'commonmark') return;

  if (flavor === 'extended' || flavor === 'academic' || flavor === 'obsidian') {
    md.use(mdFootnote);
    md.use(mdDeflist);
  }

  pluginTaskList(md);

  if ((flavor === 'academic' || flavor === 'obsidian') && deps.katex) {
    pluginKaTeX(md, deps.katex);
  }

  if (flavor === 'obsidian') {
    pluginObsidianComments(md);
    pluginObsidianCallouts(md);
    pluginObsidianInline(md);
  }

  if (flavor === 'atlassian') {
    pluginAtlassianBlocks(md);
    pluginAtlassianInline(md);
  }
};

export const buildMD = (flavor: Flavor, deps: FlavorDeps): MarkdownIt => {
  const md = createBase(flavor);
  applyFlavorPlugins(md, flavor, deps);
  applyHighlighting(md, deps.highlighter, deps.onUnknownLanguage);
  wrapMermaidFences(md, deps.mermaidCounter);
  addCodeLangLabels(md);
  addHeadingAnchors(md);
  applySafeLinks(md);
  return md;
};

export const createFlavorDeps = (
  highlighter: typeof hljs,
  katex: typeof katexNs | null,
  onUnknownLanguage?: (lang: string) => void,
): FlavorDeps => ({
  highlighter,
  katex,
  mermaidCounter: createMermaidCounter(),
  onUnknownLanguage,
});
