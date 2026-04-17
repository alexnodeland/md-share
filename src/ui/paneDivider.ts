import {
  computeSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  nudgeRatio,
  parseStoredRatio,
} from '../paneSplit.ts';
import type { Storage } from '../ports.ts';

export interface PaneDividerDeps {
  container: HTMLElement;
  divider: HTMLElement;
  storage: Storage;
}

const RATIO_KEY = 'mdshare:split-ratio';
const KEYBOARD_STEP = 0.02;
const KEYBOARD_STEP_LARGE = 0.1;

const formatRatio = (ratio: number): string => ratio.toFixed(4);
const ariaValue = (ratio: number): string => String(Math.round(ratio * 100));

export const initPaneDivider = ({ container, divider, storage }: PaneDividerDeps): (() => void) => {
  let ratio = parseStoredRatio(storage.get(RATIO_KEY)) ?? DEFAULT_SPLIT_RATIO;
  let pointerId: number | null = null;

  const apply = (next: number): void => {
    ratio = next;
    container.style.setProperty('--editor-ratio', String(next));
    divider.setAttribute('aria-valuenow', ariaValue(next));
  };

  const persist = (): void => {
    storage.set(RATIO_KEY, formatRatio(ratio));
  };

  apply(ratio);

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerId = e.pointerId;
    try {
      divider.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported — fall back to bubbled events */
    }
    document.body.classList.add('is-resizing-panes');
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const rect = container.getBoundingClientRect();
    apply(computeSplitRatio(e.clientX, rect.left, rect.width));
  };

  const endDrag = (e: PointerEvent): void => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    try {
      divider.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    pointerId = null;
    document.body.classList.remove('is-resizing-panes');
    persist();
  };

  const onDblClick = (): void => {
    apply(DEFAULT_SPLIT_RATIO);
    persist();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = nudgeRatio(ratio, -step);
    else if (e.key === 'ArrowRight') next = nudgeRatio(ratio, step);
    else if (e.key === 'Home') next = MIN_SPLIT_RATIO;
    else if (e.key === 'End') next = MAX_SPLIT_RATIO;
    if (next === null) return;
    e.preventDefault();
    apply(next);
    persist();
  };

  divider.addEventListener('pointerdown', onPointerDown);
  divider.addEventListener('pointermove', onPointerMove);
  divider.addEventListener('pointerup', endDrag);
  divider.addEventListener('pointercancel', endDrag);
  divider.addEventListener('dblclick', onDblClick);
  divider.addEventListener('keydown', onKeyDown);

  return () => {
    divider.removeEventListener('pointerdown', onPointerDown);
    divider.removeEventListener('pointermove', onPointerMove);
    divider.removeEventListener('pointerup', endDrag);
    divider.removeEventListener('pointercancel', endDrag);
    divider.removeEventListener('dblclick', onDblClick);
    divider.removeEventListener('keydown', onKeyDown);
    if (pointerId !== null) {
      try {
        divider.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      pointerId = null;
    }
    document.body.classList.remove('is-resizing-panes');
  };
};
