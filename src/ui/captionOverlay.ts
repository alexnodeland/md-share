import { formatCaption } from '../listen/caption.ts';

export interface CaptionOverlayHandle {
  show(text: string, lang?: string): void;
  hide(): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

const OVERLAY_ID = 'caption-overlay';

const ensureOverlay = (): HTMLElement => {
  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.className = 'caption-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
};

/**
 * Creates the karaoke caption strip at the bottom of the viewport. The overlay
 * is only shown while `setEnabled(true)` is active and `show(text)` has been
 * called with non-empty content. Hidden state is the default.
 */
export const initCaptionOverlay = (initialEnabled: boolean): CaptionOverlayHandle => {
  const el = ensureOverlay();
  let enabled = initialEnabled;
  let currentText = '';
  let currentLang: string | undefined;

  const render = (): void => {
    if (!enabled || currentText.length === 0) {
      el.classList.remove('visible');
      el.textContent = '';
      el.removeAttribute('lang');
      return;
    }
    el.textContent = currentText;
    if (currentLang) el.setAttribute('lang', currentLang);
    else el.removeAttribute('lang');
    el.classList.add('visible');
  };

  return {
    show(text, lang) {
      currentText = formatCaption(text);
      currentLang = lang;
      render();
    },
    hide() {
      currentText = '';
      currentLang = undefined;
      render();
    },
    setEnabled(next) {
      enabled = next;
      render();
    },
    isEnabled() {
      return enabled;
    },
  };
};
