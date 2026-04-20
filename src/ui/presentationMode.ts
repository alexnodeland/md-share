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

  return { enter, exit, next, prev, isActive: () => active };
};
