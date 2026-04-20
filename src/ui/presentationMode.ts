import { groupBetweenBreaks } from '../slides.ts';

export interface PresentationDeps {
  getPreviewRoot: () => Element | null;
  rerender: () => void;
}

export interface PresentationMode {
  enter(): void;
  exit(): void;
  next(): void;
  prev(): void;
  isActive(): boolean;
}

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, summary, details, label, [contenteditable="true"], [role="button"], [role="link"]';

export const initPresentationMode = ({
  getPreviewRoot,
  rerender,
}: PresentationDeps): PresentationMode => {
  let active = false;
  let slides: HTMLDivElement[] = [];
  let currentIndex = 0;

  const updateCurrent = () => {
    for (const [i, slide] of slides.entries()) {
      slide.classList.toggle('current', i === currentIndex);
    }
  };

  const enter = () => {
    if (active) return;
    const root = getPreviewRoot();
    if (!root) return;
    const presentable = Array.from(root.children).filter(
      (el) => !el.classList.contains('toc-container'),
    );
    const groups = groupBetweenBreaks(presentable);
    if (groups.length === 0) return;

    while (root.firstChild) root.removeChild(root.firstChild);
    slides = groups.map((group) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      for (const el of group) slide.appendChild(el);
      root.appendChild(slide);
      return slide;
    });
    currentIndex = 0;
    updateCurrent();
    document.documentElement.dataset.presenting = 'true';
    active = true;
  };

  const exit = () => {
    if (!active) return;
    delete document.documentElement.dataset.presenting;
    active = false;
    slides = [];
    currentIndex = 0;
    rerender();
  };

  const next = () => {
    if (!active) return;
    if (currentIndex >= slides.length - 1) return;
    currentIndex++;
    updateCurrent();
  };

  const prev = () => {
    if (!active) return;
    if (currentIndex <= 0) return;
    currentIndex--;
    updateCurrent();
  };

  document.addEventListener(
    'keydown',
    (e) => {
      if (!active) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        exit();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      }
    },
    { capture: true },
  );

  document.addEventListener('click', (e) => {
    if (!active) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    if (target.closest('.present-controls')) return;
    const x = e.clientX;
    const width = window.innerWidth;
    if (x < width / 2) prev();
    else next();
  });

  const exitBtn = document.getElementById('btn-present-exit');
  exitBtn?.addEventListener('click', () => exit());

  return { enter, exit, next, prev, isActive: () => active };
};
