import hljs from 'highlight.js/lib/core';
import markdownGrammar from 'highlight.js/lib/languages/markdown';
import { browserClipboard } from './adapters/clipboard.ts';
import { browserCompressor } from './adapters/compressor.ts';
import { browserDocxReader } from './adapters/docxReader.ts';
import { browserDocxWriter } from './adapters/docxWriter.ts';
import { browserHtmlToMarkdown } from './adapters/htmlToMarkdown.ts';
import { compressImage } from './adapters/imageCompress.ts';
import { browserStorage } from './adapters/localStorage.ts';
import { browserNativeShare } from './adapters/nativeShare.ts';
import { browserPrinter } from './adapters/printer.ts';
import { browserRasterizer } from './adapters/rasterizer.ts';
import { browserSanitizer } from './adapters/sanitizer.ts';
import { browserSynth } from './adapters/speechSynth.ts';
import { type HeadingPosition, getCurrentHeading as pickCurrentHeading } from './currentHeading.ts';
import { buildDocModel } from './docModel.ts';
import { clearDraft, loadDraft, saveDraft } from './draft.ts';
import { recordSnapshot } from './draftHistory.ts';
import { lineBounds } from './editorCommands.ts';
import { highlightMarkdownSource } from './editorHighlight.ts';
import { renderEmptyState } from './emptyState.ts';
import { flavorForDocxImport } from './fileKind.ts';
import { documentTitle, pageTitle } from './filename.ts';
import { flavorHasFootnotes, flavorNeedsKatex, resolveInitialFlavor } from './flavor.ts';
import { buildMD, createFlavorDeps, FLAVOR_LABELS, type FlavorDeps } from './flavors.ts';
import { bodyLineOffset, parseFrontmatter, renderFrontmatter } from './frontmatter.ts';
import { languageFile } from './hljsAliases.ts';
import { insertImageAtCursor } from './imageEmbed.ts';
import { type Diagnostic, lintDocument } from './lint.ts';
import { extractSpeakableChunks } from './listen/chunker.ts';
import { buildMermaidError } from './mermaidErrorBox.ts';
import {
  isSampleContent,
  isSampleKey,
  SAMPLE_FLAVOR,
  type SampleKey,
  sampleFor,
} from './samples.ts';
import { hasSharePayload, parseShareParams, shareTargetDocument } from './share.ts';
import { detectPlatform, formatShortcut } from './shortcuts.ts';
import { toggleTaskAtLine } from './taskToggle.ts';
import { isTheme, mermaidThemeName, mermaidThemeVars } from './theme.ts';
import { renderTOC } from './toc.ts';
import type { DocHeading, Flavor, RenderEnv, ShareParams, Theme } from './types.ts';
import { applyEdit } from './ui/applyEdit.ts';
import { initAutocomplete } from './ui/autocomplete.ts';
import { initClearButton } from './ui/clearButton.ts';
import { initCodeCopyButtons } from './ui/codeCopyButtons.ts';
import { initDropdowns } from './ui/dropdown.ts';
import { initDropZone } from './ui/dropZone.ts';
import { initEditor } from './ui/editor.ts';
import { initEditorToggle } from './ui/editorToggle.ts';
import { initEditorUndo } from './ui/editorUndo.ts';
import { initEmbedMode } from './ui/embedMode.ts';
import { initPrintExpansion } from './ui/expandDetails.ts';
import { initExportMenu } from './ui/exportMenu.ts';
import { createFileImporter, initOpenFile } from './ui/fileImport.ts';
import { initFindBar } from './ui/findBar.ts';
import { initFlavorSelect, setFlavorSelectValue } from './ui/flavorSelect.ts';
import { initHeadingLinks } from './ui/headingLinks.ts';
import { initHelpModal } from './ui/helpModal.ts';
import { initHistoryMenu } from './ui/historyMenu.ts';
import { initLintPanel } from './ui/lintPanel.ts';
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
  reportDiagnostics: (diagnostics: Diagnostic[]) => void;
  /** Outline of the latest render, for heading-link autocomplete. */
  headings: DocHeading[];
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
  document.title = pageTitle(src);
  if (!src.trim()) {
    preview.innerHTML = renderEmptyState();
    state.reportDiagnostics([]);
    return;
  }
  try {
    const { meta, body } = parseFrontmatter(src);
    const front = renderFrontmatter(meta, state.md.utils.escapeHtml);
    const lineOffset = bodyLineOffset(src, body);
    const env: RenderEnv = { lineOffset };
    // Parse once: the same tokens feed the preview and the document checks.
    const tokens = state.md.parse(body, env);
    const html = state.md.renderer.render(tokens, state.md.options, env);
    const headings = env.headings ?? [];
    state.headings = headings;
    preview.innerHTML = browserSanitizer.sanitize(front + renderTOC(headings) + html);
    state.reportDiagnostics(
      lintDocument(tokens, {
        body,
        lineOffset,
        headings,
        footnotes: flavorHasFootnotes(state.flavor),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    preview.replaceChildren(renderError(message));
    state.reportDiagnostics([]);
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
  '!/node_modules/highlight.js/lib/languages/markdown.js',
]) as Record<string, LanguageLoader>;

// Only the editor's own grammar ships in the entry chunk; every fence
// language loads on first use (~1-20 kB each) instead of a 190-grammar bundle.
hljs.registerLanguage('markdown', markdownGrammar);

const loaderFor = (lang: string): LanguageLoader | undefined =>
  languageLoaders[`/node_modules/highlight.js/lib/languages/${languageFile(lang)}.js`];

type Katex = typeof import('katex').default;
let katexMod: Katex | null = null;
let katexPending: Promise<Katex> | null = null;

const loadKatex = (): Promise<Katex> => {
  if (katexMod) return Promise.resolve(katexMod);
  if (!katexPending) {
    // Bundled (not CDN) so the service worker can cache it and math renders offline.
    katexPending = Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(
      ([m]) => {
        katexMod = m.default;
        return katexMod;
      },
    );
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
      hljs.registerLanguage(languageFile(lang), mod.default);
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

const snapshot = (text: string): void => recordSnapshot(browserStorage, text, Date.now());

const stripUrlPayload = (): void => {
  window.history.replaceState(null, '', window.location.pathname);
};

/** Android "Share → md-share" (Web Share Target): the shared text becomes the document. */
const loadShareTarget = (editor: HTMLTextAreaElement): boolean => {
  const shared = shareTargetDocument(window.location.search);
  if (shared === null) return false;
  const draft = loadDraft(browserStorage);
  if (draft) snapshot(draft);
  editor.value = shared;
  stripUrlPayload();
  showToast('Added from share — your previous draft is in Recent versions', true);
  return true;
};

/** Fill the editor from a shared link, else from the saved draft. */
const loadInitialDocument = (
  params: ShareParams,
  editor: HTMLTextAreaElement,
  banner: HTMLElement | null,
): void => {
  if (params.source !== null) {
    editor.value = params.source;
    // An embed is a read-only view on someone else's site: no drafts, no banner.
    if (params.embed) return;
    // The first edit forks the shared doc into the draft slot; keep the old draft.
    const draft = loadDraft(browserStorage);
    if (draft && draft !== params.source) snapshot(draft);
    banner?.classList.add('visible');
    const clearBanner = () => {
      banner?.classList.remove('visible');
      stripUrlPayload();
      editor.removeEventListener('input', clearBanner);
    };
    editor.addEventListener('input', clearBanner);
    return;
  }
  if (loadShareTarget(editor)) return;
  const unreadableLink = hasSharePayload(window.location.hash, window.location.search);
  if (unreadableLink) stripUrlPayload();
  const draft = loadDraft(browserStorage);
  if (draft) editor.value = draft;
  if (unreadableLink) showToast('Could not read that shared link — it may be truncated');
  else if (draft) showToast('Draft restored', true);
};

const boot = async (): Promise<void> => {
  const params = await parseShareParams(
    window.location.search,
    browserCompressor,
    window.location.hash,
  );
  const theme = initialTheme();
  const flavor = resolveInitialFlavor(params.flavor, browserStorage.get(FLAVOR_STORAGE_KEY));
  const ensureLanguage = createLazyHighlighter(() => {
    rerender();
    // The editor's own fence highlighting uses the same grammars.
    const mirror = document.getElementById('editor-mirror');
    const source = document.getElementById('editor') as HTMLTextAreaElement | null;
    if (mirror && source) mirror.innerHTML = highlightMarkdownSource(source.value, hljs);
  });
  const deps = createFlavorDeps(hljs, null, ensureLanguage);
  const state: AppState = {
    flavor,
    theme,
    md: buildMD(flavor, deps),
    deps,
    activeSample: null,
    reportDiagnostics: () => {},
    headings: [],
  };

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

  const platform = detectPlatform(navigator.platform);
  const pasteHint = formatShortcut('Mod+V', platform);
  const updatePlaceholder = () => {
    editor.placeholder = `${pasteHint} to paste ${FLAVOR_LABELS[state.flavor]} markdown…`;
  };

  loadInitialDocument(params, editor, banner);
  if (params.embed) initEmbedMode(editor);
  state.activeSample = editor.value ? isSampleContent(editor.value) : null;
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
    htmlToMarkdown: browserHtmlToMarkdown,
    onFormatCommand: (cmd) => toolbar?.pulse(cmd),
  });
  const mirrorEl = document.getElementById('editor-mirror');
  const editorWrap = editor.parentElement;
  if (mirrorEl && editorWrap) {
    toolbar = initSelectionToolbar({ editor, mirror: mirrorEl, wrap: editorWrap });
    initAutocomplete({
      editor,
      mirror: mirrorEl,
      wrap: editorWrap,
      getHeadings: () => state.headings,
    });
  }
  initEditorUndo({ editor });
  const switchFlavor = (next: Flavor): void => {
    if (next === state.flavor) return;
    state.flavor = next;
    state.md = buildMD(next, state.deps);
    browserStorage.set(FLAVOR_STORAGE_KEY, next);
    ensureKatexFor(next);
    setFlavorSelectValue(next);
    updatePlaceholder();
  };
  initFlavorSelect({
    onChange: (next) => {
      switchFlavor(next);
      rerender();
    },
  });
  const loadSample = (key: SampleKey): void => {
    switchFlavor(SAMPLE_FLAVOR[key]);
    // An untouched sample isn't worth a snapshot; anything else is.
    if (isSampleContent(editor.value) === null) snapshot(editor.value);
    state.activeSample = key;
    applyEdit(editor, { value: sampleFor(key), start: 0, end: 0 });
    setSampleSelectValue(key);
    rerender();
  };
  initSampleSelect({ onSelect: loadSample });
  document.getElementById('preview')?.addEventListener('click', (e) => {
    const key = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-sample]')?.dataset
      .sample;
    if (key && isSampleKey(key)) loadSample(key);
  });
  initClearButton({
    onClear: () => {
      if (!editor.value) return;
      snapshot(editor.value);
      showToast('Cleared — earlier text is in Recent versions');
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
  initHistoryMenu({
    storage: browserStorage,
    now: () => Date.now(),
    onRestore: (text) => {
      snapshot(editor.value);
      state.activeSample = isSampleContent(text);
      setSampleSelectValue(state.activeSample);
      applyEdit(editor, { value: text, start: 0, end: 0 });
      rerender();
      showToast('Restored — the replaced text is in Recent versions', true);
    },
  });
  state.reportDiagnostics = initLintPanel({
    onJump: (line) => {
      // Phones show one pane at a time; the fix happens in the editor.
      const editView = document.getElementById('btn-edit-view');
      if (editView?.offsetParent) editView.click();
      const { start, end } = lineBounds(editor.value, line);
      // Blur first: focusing scrolls the textarea to its selection.
      editor.blur();
      editor.setSelectionRange(start, end);
      editor.focus();
    },
  });
  initDropdowns();
  initShareModal({
    compressor: browserCompressor,
    clipboard: browserClipboard,
    nativeShare: browserNativeShare,
    getTitle: () => documentTitle(editor.value),
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
    clipboard: browserClipboard,
    getTheme: () => state.theme,
    getKatexVersion: () => state.deps.katex?.version ?? null,
    docxWriter: browserDocxWriter,
    rasterizer: browserRasterizer,
    getDocModel: () => buildDocModel(state.md.parse(parseFrontmatter(editor.value).body, {})),
    getSource: () => editor.value,
    getPreviewHTML: () => {
      const el = document.getElementById('preview');
      if (!el) return '';
      const clone = el.cloneNode(true) as HTMLElement;
      for (const chrome of clone.querySelectorAll('.copy-code, .heading-anchor, .preview-empty')) {
        chrome.remove();
      }
      return clone.innerHTML;
    },
    getPreviewElement: () => document.getElementById('preview'),
    onPresent: () => presentation.enter(),
  });
  initPrintExpansion(() => document.getElementById('preview'));
  const importFile = createFileImporter({
    docxReader: browserDocxReader,
    htmlToMarkdown: browserHtmlToMarkdown,
    compressImage,
    onText: (text, fromDocx) => {
      if (fromDocx) switchFlavor(flavorForDocxImport(state.flavor));
      snapshot(editor.value);
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
  });
  if (!params.embed) initDropZone(importFile);
  initOpenFile(importFile);
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
    compressor: browserCompressor,
    location: window.location,
    getSource: () => editor.value,
    getFlavor: () => state.flavor,
  });
  initTaskToggle({
    onToggle: (line) => {
      if (editor.readOnly) return;
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

  for (const el of document.querySelectorAll<HTMLElement>('[data-shortcut]')) {
    const combo = el.dataset.shortcut;
    if (!combo) continue;
    const base = el.getAttribute('title') ?? '';
    el.setAttribute(
      'title',
      base ? `${base} (${formatShortcut(combo, platform)})` : formatShortcut(combo, platform),
    );
  }

  // Pasting a new share link into this tab only changes the fragment, which
  // never triggers a navigation. Reload so the incoming document boots cleanly.
  window.addEventListener('hashchange', () => {
    if (hasSharePayload(window.location.hash)) window.location.reload();
  });

  if (params.anchor) document.getElementById(params.anchor)?.scrollIntoView({ block: 'start' });
  if (params.source === null && editor.value === '') editor.focus();
  registerServiceWorker();
};

void boot();
