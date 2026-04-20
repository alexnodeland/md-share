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

const SWIPE_MIN_DISTANCE = 40;
const SWIPE_MAX_DURATION_MS = 600;

export const initPresentationMode = ({
  getPreviewRoot,
  rerender,
}: PresentationDeps): PresentationMode => {
  let active = false;
  let slides: HTMLDivElement[] = [];
  let currentIndex = 0;

  const prevBtn = document.getElementById('btn-present-prev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('btn-present-next') as HTMLButtonElement | null;

  const updateCurrent = () => {
    for (const [i, slide] of slides.entries()) {
      slide.classList.toggle('current', i === currentIndex);
    }
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= slides.length - 1;
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

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let touchTracking = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (!active || e.touches.length !== 1) {
        touchTracking = false;
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
      touchTracking = true;
    },
    { passive: true },
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (!active || !touchTracking) return;
      touchTracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      if (Date.now() - touchStartTime > SWIPE_MAX_DURATION_MS) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < SWIPE_MIN_DISTANCE || absDx <= absDy) return;
      if (dx < 0) next();
      else prev();
    },
    { passive: true },
  );

  const exitBtn = document.getElementById('btn-present-exit');
  exitBtn?.addEventListener('click', () => exit());
  prevBtn?.addEventListener('click', () => prev());
  nextBtn?.addEventListener('click', () => next());

  return { enter, exit, next, prev, isActive: () => active };
};
