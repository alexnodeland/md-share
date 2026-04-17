import hljs from 'highlight.js';
import katex from 'katex';
import { browserClipboard } from './adapters/clipboard.ts';
import { lzStringCompressor } from './adapters/compressor.ts';
import { browserStorage } from './adapters/localStorage.ts';
import { browserPrinter } from './adapters/printer.ts';
import { browserSynth } from './adapters/speechSynth.ts';
import { buildMD, createFlavorDeps, FLAVOR_LABELS, type FlavorDeps } from './flavors.ts';
import { extractSpeakableChunks } from './listen/chunker.ts';
import { isSampleContent, sampleFor } from './samples.ts';
import { parseShareParams } from './share.ts';
import { isTheme, mermaidThemeName, mermaidThemeVars } from './theme.ts';
import { generateTOC } from './toc.ts';
import type { Flavor, Theme } from './types.ts';
import { initClearButton } from './ui/clearButton.ts';
import { initDropdowns } from './ui/dropdown.ts';
import { initDropZone } from './ui/dropZone.ts';
import { initEditor } from './ui/editor.ts';
import { initEditorToggle } from './ui/editorToggle.ts';
import { initExportMenu } from './ui/exportMenu.ts';
import { initFlavorSelect, setFlavorSelectValue } from './ui/flavorSelect.ts';
import { initHelpModal } from './ui/helpModal.ts';
import { initListenBar } from './ui/listenBar.ts';
import { initMobileToggle } from './ui/mobileToggle.ts';
import { initSampleSelect, setSampleSelectValue } from './ui/sampleSelect.ts';
import { initShareModal } from './ui/share.ts';
import { initThemeToggle } from './ui/themeToggle.ts';
import './styles.css';

import type MarkdownIt from 'markdown-it';

interface AppState {
  flavor: Flavor;
  theme: Theme;
  md: MarkdownIt;
  deps: FlavorDeps;
  activeSample: Flavor | null;
}

type Mermaid = typeof import('mermaid').default;

const mermaidConfig = (theme: Theme) =>
  ({
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: mermaidThemeName(theme),
    themeVariables: mermaidThemeVars(theme),
    fontFamily: 'JetBrains Mono,monospace',
    fontSize: 13,
    flowchart: { curve: 'monotoneX' as const },
  }) satisfies Parameters<Mermaid['initialize']>[0];

let mermaidMod: Mermaid | null = null;
let mermaidPending: Promise<Mermaid> | null = null;
let mermaidTheme: Theme = 'dark';

const setMermaidTheme = (theme: Theme): void => {
  mermaidTheme = theme;
  if (mermaidMod) mermaidMod.initialize(mermaidConfig(theme));
};

const loadMermaid = (): Promise<Mermaid> => {
  if (mermaidMod) return Promise.resolve(mermaidMod);
  if (!mermaidPending) {
    mermaidPending = import('mermaid').then((m) => {
      mermaidMod = m.default;
      mermaidMod.initialize(mermaidConfig(mermaidTheme));
      return mermaidMod;
    });
  }
  return mermaidPending;
};

const renderPreview = async (state: AppState): Promise<void> => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const preview = document.getElementById('preview');
  if (!editor || !preview) return;
  const src = editor.value;
  state.deps.mermaidCounter.reset();
  preview.innerHTML = generateTOC(src) + state.md.render(src);
  if (!preview.querySelector('.mermaid')) return;
  try {
    const m = await loadMermaid();
    await m.run({ querySelector: '.mermaid' });
  } catch (err) {
    console.warn('Mermaid render error:', err);
  }
};

const THEME_STORAGE_KEY = 'md-share:theme';

const initialTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : 'dark';
};

const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
};

const boot = (): void => {
  const params = parseShareParams(window.location.search, lzStringCompressor);
  const theme = initialTheme();
  const flavor: Flavor = params.flavor ?? 'commonmark';
  const deps = createFlavorDeps(hljs, katex);
  const state: AppState = { flavor, theme, md: buildMD(flavor, deps), deps, activeSample: null };

  setMermaidTheme(state.theme);
  setFlavorSelectValue(state.flavor);

  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const banner = document.getElementById('readonly-banner');
  if (!editor) return;

  const updatePlaceholder = () => {
    editor.placeholder = `⌘V to paste ${FLAVOR_LABELS[state.flavor]} markdown…`;
  };

  if (params.source !== null) {
    editor.value = params.source;
    state.activeSample = isSampleContent(params.source);
    banner?.classList.add('visible');
    const clearBanner = () => {
      banner?.classList.remove('visible');
      window.history.replaceState(null, '', window.location.pathname);
      editor.removeEventListener('input', clearBanner);
    };
    editor.addEventListener('input', clearBanner);
  }
  setSampleSelectValue(state.activeSample);
  updatePlaceholder();

  let rerender = () => {
    void renderPreview(state);
  };

  initEditor({
    onChange: () => {
      if (state.activeSample !== null) {
        const match = isSampleContent(editor.value);
        if (match !== state.activeSample) {
          state.activeSample = match;
          setSampleSelectValue(match);
        }
      }
      rerender();
    },
  });
  initFlavorSelect({
    onChange: (next) => {
      state.flavor = next;
      state.md = buildMD(next, state.deps);
      updatePlaceholder();
      rerender();
    },
  });
  initSampleSelect({
    onSelect: (key) => {
      state.activeSample = key;
      editor.value = sampleFor(key);
      rerender();
    },
  });
  initClearButton({
    onClear: () => {
      editor.value = '';
      state.activeSample = null;
      setSampleSelectValue(null);
      editor.dispatchEvent(new Event('input'));
      rerender();
    },
  });
  initThemeToggle({
    onChange: (next) => {
      state.theme = next;
      browserStorage.set(THEME_STORAGE_KEY, next);
      setMermaidTheme(next);
      rerender();
    },
  });
  initMobileToggle({
    onShowPreview: () => rerender(),
    initialView: params.source !== null ? 'preview' : undefined,
  });
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
  initHelpModal();

  const listenBar = initListenBar({
    synth: browserSynth,
    getChunks: () => {
      const preview = document.getElementById('preview');
      return preview ? extractSpeakableChunks(preview) : [];
    },
  });

  const origRerender = rerender;
  rerender = () => {
    origRerender();
    listenBar.onPreviewChange();
  };

  rerender();
  registerServiceWorker();
};

boot();
