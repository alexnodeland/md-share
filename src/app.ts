import hljs from 'highlight.js';
import katex from 'katex';
import mermaid from 'mermaid';
import { browserClipboard } from './adapters/clipboard.ts';
import { lzStringCompressor } from './adapters/compressor.ts';
import { browserPrinter } from './adapters/printer.ts';
import { browserSynth } from './adapters/speechSynth.ts';
import { defaultFor } from './defaults.ts';
import { buildMD, createFlavorDeps, type FlavorDeps } from './flavors.ts';
import { extractSpeakableChunks } from './listen/chunker.ts';
import { parseShareParams } from './share.ts';
import { isTheme, mermaidThemeName, mermaidThemeVars } from './theme.ts';
import { generateTOC } from './toc.ts';
import type { Flavor, Theme } from './types.ts';
import { initDropdowns } from './ui/dropdown.ts';
import { initDropZone } from './ui/dropZone.ts';
import { initEditor } from './ui/editor.ts';
import { initEditorToggle } from './ui/editorToggle.ts';
import { initExportMenu } from './ui/exportMenu.ts';
import { initFlavorSelect, setFlavorSelectValue } from './ui/flavorSelect.ts';
import { initListenBar } from './ui/listenBar.ts';
import { initMobileToggle } from './ui/mobileToggle.ts';
import { initShareModal } from './ui/share.ts';
import { initThemeToggle } from './ui/themeToggle.ts';
import './styles.css';

import type MarkdownIt from 'markdown-it';

interface AppState {
  flavor: Flavor;
  theme: Theme;
  md: MarkdownIt;
  deps: FlavorDeps;
}

const initMermaid = (theme: Theme): void => {
  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidThemeName(theme),
    themeVariables: mermaidThemeVars(theme),
    fontFamily: 'JetBrains Mono,monospace',
    fontSize: 13,
    flowchart: { curve: 'monotoneX' },
  });
};

const renderPreview = async (state: AppState): Promise<void> => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const preview = document.getElementById('preview');
  if (!editor || !preview) return;
  const src = editor.value;
  state.deps.mermaidCounter.reset();
  preview.innerHTML = generateTOC(src) + state.md.render(src);
  try {
    await mermaid.run({ querySelector: '.mermaid' });
  } catch {
    /* mermaid syntax errors are shown in-place; ignore */
  }
};

const initialTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : 'dark';
};

const boot = (): void => {
  const params = parseShareParams(window.location.search, lzStringCompressor);
  const theme = initialTheme();
  const flavor: Flavor = params.flavor ?? 'gfm';
  const deps = createFlavorDeps(hljs, katex);
  const state: AppState = { flavor, theme, md: buildMD(flavor, deps), deps };

  initMermaid(state.theme);
  setFlavorSelectValue(state.flavor);

  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const banner = document.getElementById('readonly-banner');
  if (!editor) return;

  if (params.source !== null) {
    editor.value = params.source;
    banner?.classList.add('visible');
    const clearBanner = () => {
      banner?.classList.remove('visible');
      window.history.replaceState(null, '', window.location.pathname);
      editor.removeEventListener('input', clearBanner);
    };
    editor.addEventListener('input', clearBanner);
  } else {
    editor.value = defaultFor(state.flavor);
  }

  const rerender = () => {
    void renderPreview(state);
  };

  initEditor({ onChange: rerender });
  initFlavorSelect({
    getCurrentFlavor: () => state.flavor,
    onChange: (next) => {
      state.flavor = next;
      state.md = buildMD(next, state.deps);
      rerender();
    },
  });
  initThemeToggle({
    onChange: (next) => {
      state.theme = next;
      initMermaid(next);
      rerender();
    },
  });
  initMobileToggle({ onShowPreview: rerender });
  initDropdowns();
  initShareModal({
    compressor: lzStringCompressor,
    clipboard: browserClipboard,
    location: window.location,
    getSource: () => editor.value,
    getFlavor: () => state.flavor,
  });
  initExportMenu({
    printer: browserPrinter,
    getSource: () => editor.value,
    getPreviewHTML: () => document.getElementById('preview')?.innerHTML ?? '',
    getPreviewElement: () => document.getElementById('preview'),
  });
  initDropZone({
    onText: (text) => {
      editor.value = text;
      rerender();
    },
  });
  initEditorToggle();

  initListenBar({
    synth: browserSynth,
    getChunks: () => {
      const preview = document.getElementById('preview');
      return preview ? extractSpeakableChunks(preview) : [];
    },
  });

  rerender();
};

boot();
