import hljs from 'highlight.js/lib/common';
import { browserClipboard } from './adapters/clipboard.ts';
import { lzStringCompressor } from './adapters/compressor.ts';
import { compressImage } from './adapters/imageCompress.ts';
import { browserStorage } from './adapters/localStorage.ts';
import { browserPrinter } from './adapters/printer.ts';
import { browserSynth } from './adapters/speechSynth.ts';
import { type HeadingPosition, getCurrentHeading as pickCurrentHeading } from './currentHeading.ts';
import { clearDraft, loadDraft, saveDraft } from './draft.ts';
import { highlightMarkdownSource } from './editorHighlight.ts';
import { flavorNeedsKatex, resolveInitialFlavor } from './flavor.ts';
import { buildMD, createFlavorDeps, FLAVOR_LABELS, type FlavorDeps } from './flavors.ts';
import { parseFrontmatter, renderFrontmatter } from './frontmatter.ts';
import { insertImageAtCursor } from './imageEmbed.ts';
import { extractSpeakableChunks } from './listen/chunker.ts';
import { buildMermaidError } from './mermaidErrorBox.ts';
import { isSampleContent, SAMPLE_FLAVOR, type SampleKey, sampleFor } from './samples.ts';
import { parseShareParams } from './share.ts';
import { detectPlatform, formatShortcut } from './shortcuts.ts';
import { toggleTaskAtLine } from './taskToggle.ts';
import { isTheme, mermaidThemeName, mermaidThemeVars } from './theme.ts';
import { generateTOC } from './toc.ts';
import type { Flavor, Theme } from './types.ts';
import { applyEdit } from './ui/applyEdit.ts';
import { initClearButton } from './ui/clearButton.ts';
import { initCodeCopyButtons } from './ui/codeCopyButtons.ts';
import { initDropdowns } from './ui/dropdown.ts';
import { initDropZone } from './ui/dropZone.ts';
import { initEditor } from './ui/editor.ts';
import { initEditorToggle } from './ui/editorToggle.ts';
import { initEditorUndo } from './ui/editorUndo.ts';
import { initExportMenu } from './ui/exportMenu.ts';
import { initFindBar } from './ui/findBar.ts';
import { initFlavorSelect, setFlavorSelectValue } from './ui/flavorSelect.ts';
import { initHeadingLinks } from './ui/headingLinks.ts';
import { initHelpModal } from './ui/helpModal.ts';
import { initListenBar } from './ui/listenBar.ts';
import { initMobileToggle } from './ui/mobileToggle.ts';
import { initPaneDivider } from './ui/paneDivider.ts';
import { initPresentationMode } from './ui/presentationMode.ts';
import { initSampleSelect, setSampleSelectValue } from './ui/sampleSelect.ts';
import { initScrollSync } from './ui/scrollSync.ts';
import { initSelectionToolbar, type SelectionToolbar } from './ui/selectionToolbar.ts';
import { initShareModal } from './ui/share.ts';
import { initStats } from './ui/stats.ts';
import { initTaskToggle } from './ui/taskToggle.ts';
import { initThemeToggle } from './ui/themeToggle.ts';
import { showToast } from './ui/toast.ts';
import './styles.css';

import type MarkdownIt from 'markdown-it';

interface AppState {
  flavor: Flavor;
  theme: Theme;
  md: MarkdownIt;
  deps: FlavorDeps;
  activeSample: SampleKey | null;
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

const renderError = (message: string): HTMLElement => {
  const strong = document.createElement('strong');
  strong.textContent = 'Could not render preview';
  const pre = document.createElement('pre');
  pre.textContent = message;
  const container = document.createElement('div');
  container.className = 'render-error';
  container.append(strong, pre);
  return container;
};

const renderPreview = async (state: AppState): Promise<void> => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const preview = document.getElementById('preview');
  const scroller = document.getElementById('preview-scroll');
  if (!editor || !preview) return;
  const src = editor.value;
  const scrollTop = scroller?.scrollTop ?? 0;
  state.deps.mermaidCounter.reset();
  try {
    const { meta, body } = parseFrontmatter(src);
    const front = renderFrontmatter(meta, state.md.utils.escapeHtml);
    preview.innerHTML = front + generateTOC(body) + state.md.render(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    preview.replaceChildren(renderError(message));
    if (scroller) scroller.scrollTop = scrollTop;
    return;
  }
  if (scroller) scroller.scrollTop = scrollTop;
  const mermaidEls = preview.querySelectorAll<HTMLElement>('pre.mermaid');
  if (mermaidEls.length === 0) return;
  let mermaid: Mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (err) {
    console.warn('Mermaid load failed:', err);
    return;
  }
  for (let i = 0; i < mermaidEls.length; i++) {
    const el = mermaidEls[i] as HTMLElement;
    const container = el.closest('.mermaid-container') as HTMLElement | null;
    if (!container) continue;
    const source = el.textContent ?? '';
    const renderId = `mermaid-svg-${Date.now()}-${i}`;
    try {
      const { svg } = await mermaid.render(renderId, source);
      container.innerHTML = svg;
    } catch (err) {
      const ghost = document.getElementById(renderId);
      ghost?.remove();
      const message = err instanceof Error ? err.message : String(err);
      container.innerHTML = buildMermaidError(source, message);
    }
  }
};

const THEME_STORAGE_KEY = 'md-share:theme';
const FLAVOR_STORAGE_KEY = 'md-share:flavor';

const initialTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : 'dark';
};

const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Update ready — refresh to apply', true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
};

type LanguageModule = { default: Parameters<typeof hljs.registerLanguage>[1] };
type LanguageLoader = () => Promise<LanguageModule>;

const languageLoaders = import.meta.glob<LanguageModule>([
  '/node_modules/highlight.js/lib/languages/*.js',
  '!/node_modules/highlight.js/lib/languages/*.js.js',
  '!/node_modules/highlight.js/lib/languages/{xml,bash,c,cpp,csharp,css,markdown,diff,ruby,go,graphql,ini,java,javascript,json,kotlin,less,lua,makefile,perl,objectivec,php,php-template,plaintext,python,python-repl,r,rust,scss,shell,sql,swift,yaml,typescript,vbnet,wasm}.js',
]) as Record<string, LanguageLoader>;

const loaderFor = (lang: string): LanguageLoader | undefined =>
  languageLoaders[`/node_modules/highlight.js/lib/languages/${lang}.js`];

type Katex = typeof import('katex').default;
let katexMod: Katex | null = null;
let katexPending: Promise<Katex> | null = null;

const loadKatex = (): Promise<Katex> => {
  if (katexMod) return Promise.resolve(katexMod);
  if (!katexPending) {
    katexPending = import('katex').then((m) => {
      katexMod = m.default;
      return katexMod;
    });
  }
  return katexPending;
};

const pendingLanguages = new Set<string>();
const unknownLanguages = new Set<string>();

const createLazyHighlighter = (onReady: () => void) => (lang: string) => {
  if (hljs.getLanguage(lang) || pendingLanguages.has(lang) || unknownLanguages.has(lang)) return;
  const loader = loaderFor(lang);
  if (!loader) {
    unknownLanguages.add(lang);
    return;
  }
  pendingLanguages.add(lang);
  loader()
    .then((mod) => {
      hljs.registerLanguage(lang, mod.default);
      onReady();
    })
    .catch(() => {
      unknownLanguages.add(lang);
    })
    .finally(() => {
      pendingLanguages.delete(lang);
    });
};

const readHeadingPositions = (): HeadingPosition[] => {
  const preview = document.getElementById('preview');
  const scroller = document.getElementById('preview-scroll');
  if (!preview || !scroller) return [];
  const scrollerRect = scroller.getBoundingClientRect();
  const nodes = preview.querySelectorAll<HTMLElement>(
    'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]',
  );
  return Array.from(nodes).map((el) => ({
    id: el.id,
    top: el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop,
  }));
};

const boot = (): void => {
  const params = parseShareParams(window.location.search, lzStringCompressor, window.location.hash);
  const theme = initialTheme();
  const flavor = resolveInitialFlavor(params.flavor, browserStorage.get(FLAVOR_STORAGE_KEY));
  const ensureLanguage = createLazyHighlighter(() => {
    rerender();
  });
  const deps = createFlavorDeps(hljs, null, ensureLanguage);
  const state: AppState = { flavor, theme, md: buildMD(flavor, deps), deps, activeSample: null };

  const ensureKatexFor = (f: Flavor): void => {
    if (!flavorNeedsKatex(f) || deps.katex) return;
    void loadKatex().then((k) => {
      deps.katex = k;
      state.md = buildMD(state.flavor, deps);
      rerender();
    });
  };

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
  } else {
    const draft = loadDraft(browserStorage);
    if (draft !== null && draft !== '') {
      editor.value = draft;
      state.activeSample = isSampleContent(draft);
      showToast('Draft restored', true);
    }
  }
  setSampleSelectValue(state.activeSample);
  updatePlaceholder();

  let rerender = () => {
    void renderPreview(state);
  };

  let toolbar: SelectionToolbar | undefined;
  initEditor({
    onChange: () => {
      saveDraft(browserStorage, editor.value);
      if (state.activeSample !== null) {
        const match = isSampleContent(editor.value);
        if (match !== state.activeSample) {
          state.activeSample = match;
          setSampleSelectValue(match);
        }
      }
      rerender();
    },
    highlightSource: (s) => highlightMarkdownSource(s, hljs),
    compressImage,
    onFormatCommand: (cmd) => toolbar?.pulse(cmd),
  });
  const mirrorEl = document.getElementById('editor-mirror');
  const editorWrap = editor.parentElement;
  if (mirrorEl && editorWrap) {
    toolbar = initSelectionToolbar({ editor, mirror: mirrorEl, wrap: editorWrap });
  }
  initEditorUndo({ editor });
  initFlavorSelect({
    onChange: (next) => {
      state.flavor = next;
      state.md = buildMD(next, state.deps);
      browserStorage.set(FLAVOR_STORAGE_KEY, next);
      ensureKatexFor(next);
      updatePlaceholder();
      rerender();
    },
  });
  initSampleSelect({
    onSelect: (key) => {
      const nextFlavor = SAMPLE_FLAVOR[key];
      if (nextFlavor !== state.flavor) {
        state.flavor = nextFlavor;
        state.md = buildMD(nextFlavor, state.deps);
        browserStorage.set(FLAVOR_STORAGE_KEY, nextFlavor);
        ensureKatexFor(nextFlavor);
        setFlavorSelectValue(nextFlavor);
        updatePlaceholder();
      }
      state.activeSample = key;
      applyEdit(editor, { value: sampleFor(key), start: 0, end: 0 });
      rerender();
    },
  });
  initClearButton({
    onClear: () => {
      state.activeSample = null;
      setSampleSelectValue(null);
      clearDraft(browserStorage);
      applyEdit(editor, { value: '', start: 0, end: 0 });
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
    getCurrentHeading: () => {
      const scroller = document.getElementById('preview-scroll');
      return pickCurrentHeading(readHeadingPositions(), scroller?.scrollTop ?? 0, 40);
    },
  });
  const presentation = initPresentationMode({
    getPreviewRoot: () => document.getElementById('preview'),
    rerender: () => rerender(),
  });
  initExportMenu({
    printer: browserPrinter,
    getSource: () => editor.value,
    getPreviewHTML: () => {
      const el = document.getElementById('preview');
      if (!el) return '';
      const clone = el.cloneNode(true) as HTMLElement;
      for (const btn of clone.querySelectorAll('.copy-code')) btn.remove();
      return clone.innerHTML;
    },
    getPreviewElement: () => document.getElementById('preview'),
    onPresent: () => presentation.enter(),
  });
  initDropZone({
    onText: (text) => {
      applyEdit(editor, { value: text, start: 0, end: 0 });
      rerender();
    },
    onImageInsert: (dataUrl) => {
      const r = insertImageAtCursor(
        editor.value,
        editor.selectionStart,
        editor.selectionEnd,
        dataUrl,
      );
      applyEdit(editor, { value: r.value, start: r.cursor, end: r.cursor });
      rerender();
    },
    compressImage,
  });
  const findBar = initFindBar({
    editor,
    onEditorChange: () => {
      saveDraft(browserStorage, editor.value);
      rerender();
    },
  });
  document.getElementById('btn-find')?.addEventListener('click', () => findBar.open('find'));
  const editorToggleBtn = document.getElementById('btn-editor-toggle');
  if (editorToggleBtn instanceof HTMLButtonElement) {
    initEditorToggle({ button: editorToggleBtn });
  }
  initHelpModal();
  const previewScroll = document.getElementById('preview-scroll');
  if (previewScroll) initScrollSync({ editor, preview: previewScroll });
  const mainContainer = document.getElementById('main-container');
  const paneDivider = document.getElementById('pane-divider');
  if (mainContainer && paneDivider) {
    initPaneDivider({ container: mainContainer, divider: paneDivider, storage: browserStorage });
  }
  initHeadingLinks({
    clipboard: browserClipboard,
    compressor: lzStringCompressor,
    location: window.location,
    getSource: () => editor.value,
    getFlavor: () => state.flavor,
  });
  initTaskToggle({
    onToggle: (line) => {
      const next = toggleTaskAtLine(editor.value, line);
      if (next === editor.value) return;
      applyEdit(editor, { value: next, start: editor.selectionStart, end: editor.selectionEnd });
    },
  });
  const decorateCopyButtons = initCodeCopyButtons({ clipboard: browserClipboard });
  const updateStats = initStats({ getSource: () => editor.value });

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
    decorateCopyButtons();
    listenBar.onPreviewChange();
    updateStats();
  };

  ensureKatexFor(state.flavor);
  rerender();

  const platform = detectPlatform(navigator.platform);
  for (const el of document.querySelectorAll<HTMLElement>('[data-shortcut]')) {
    const combo = el.dataset.shortcut;
    if (!combo) continue;
    const base = el.getAttribute('title') ?? '';
    el.setAttribute(
      'title',
      base ? `${base} (${formatShortcut(combo, platform)})` : formatShortcut(combo, platform),
    );
  }

  if (params.anchor) document.getElementById(params.anchor)?.scrollIntoView({ block: 'start' });
  if (params.source === null && editor.value === '') editor.focus();
  registerServiceWorker();
};

boot();
