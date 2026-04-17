import { createPlayer } from '../listen/player.ts';
import type { Synth } from '../ports.ts';
import type { SpeechChunk } from '../types.ts';
import { showToast } from './toast.ts';

export interface ListenBarDeps {
  synth: Synth;
  getChunks: () => SpeechChunk[];
}

export interface ListenBarHandle {
  onPreviewChange: () => void;
}

const MARKER_ID = 'speaking-marker';
const PAD = 4;

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

const ensureMarker = (): HTMLElement => {
  let m = document.getElementById(MARKER_ID);
  if (!m) {
    m = document.createElement('div');
    m.id = MARKER_ID;
    document.body.appendChild(m);
  }
  return m;
};

const positionMarker = (marker: HTMLElement, chunk: SpeechChunk | undefined): void => {
  if (!chunk?.el) {
    marker.style.opacity = '0';
    return;
  }
  const rect = chunk.el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    marker.style.opacity = '0';
    return;
  }
  marker.style.top = `${rect.top - PAD}px`;
  marker.style.left = `${rect.left - PAD}px`;
  marker.style.width = `${rect.width + PAD * 2}px`;
  marker.style.height = `${rect.height + PAD * 2}px`;
  marker.style.opacity = '1';
  chunk.el.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
};

const updateUI = (
  marker: HTMLElement,
  active: boolean,
  playing: boolean,
  index: number,
  total: number,
  chunks: readonly SpeechChunk[],
): void => {
  const bar = document.getElementById('audio-bar');
  const mainContainer = document.getElementById('main-container');
  const listenBtn = document.getElementById('listen-btn');
  const fill = document.getElementById('audio-progress-fill');
  const label = document.getElementById('audio-label');
  const iconPlay = document.getElementById('audio-icon-play');
  const iconPause = document.getElementById('audio-icon-pause');
  if (!bar || !mainContainer || !listenBtn || !fill || !label || !iconPlay || !iconPause) return;

  bar.classList.toggle('visible', active);
  mainContainer.classList.toggle('has-audio-bar', active);
  listenBtn.classList.toggle('active-listen', active);

  if (!active) {
    marker.style.opacity = '0';
    fill.style.width = '0%';
    label.innerHTML = '<strong>Ready</strong>';
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    return;
  }

  const pct = total > 0 ? ((index + 1) / total) * 100 : 0;
  fill.style.width = `${pct}%`;
  const chunk = chunks[index];
  const text = chunk?.text ?? '';
  const short = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  label.innerHTML = `<strong>${index + 1}/${total}</strong> &ensp;${short}`;
  iconPlay.style.display = playing ? 'none' : '';
  iconPause.style.display = playing ? '' : 'none';
  positionMarker(marker, chunk);
};

export const initListenBar = ({ synth, getChunks }: ListenBarDeps): ListenBarHandle => {
  const listenBtn = document.getElementById('listen-btn');
  const playBtn = document.getElementById('audio-play-btn');
  const stopBtn = document.getElementById('audio-stop-btn');
  const fwdBtn = document.getElementById('audio-fwd-btn');
  const backBtn = document.getElementById('audio-back-btn');
  const progress = document.getElementById('audio-progress');
  const speedSel = document.getElementById('audio-speed') as HTMLSelectElement | null;
  const voiceSel = document.getElementById('audio-voice') as HTMLSelectElement | null;
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  const previewPane = document.getElementById('preview-pane');

  const noop: ListenBarHandle = { onPreviewChange: () => {} };

  if (
    !listenBtn ||
    !playBtn ||
    !stopBtn ||
    !fwdBtn ||
    !backBtn ||
    !progress ||
    !speedSel ||
    !voiceSel ||
    !editor
  ) {
    return noop;
  }

  const marker = ensureMarker();
  let activeChunks: SpeechChunk[] = [];
  let currentEl: Element | null = null;
  let dragging = false;

  const refresh = () => {
    if (dragging) return;
    const s = player.getState();
    updateUI(marker, s.active, s.playing, s.index, s.total, activeChunks);
    currentEl = activeChunks[s.index]?.el ?? null;
  };

  const player = createPlayer({ synth, onStateChange: refresh });

  const repositionMarker = () => {
    if (!currentEl) return;
    const rect = currentEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      marker.style.opacity = '0';
      return;
    }
    marker.style.top = `${rect.top - PAD}px`;
    marker.style.left = `${rect.left - PAD}px`;
    marker.style.width = `${rect.width + PAD * 2}px`;
    marker.style.height = `${rect.height + PAD * 2}px`;
    marker.style.opacity = '1';
  };

  let resizeObserver: ResizeObserver | null = null;

  const attachScrollListeners = () => {
    window.addEventListener('scroll', repositionMarker, { capture: true, passive: true });
    window.addEventListener('resize', repositionMarker, { passive: true });
    if (previewPane && !resizeObserver) {
      resizeObserver = new ResizeObserver(repositionMarker);
      resizeObserver.observe(previewPane);
    }
  };

  const detachScrollListeners = () => {
    window.removeEventListener('scroll', repositionMarker, true);
    window.removeEventListener('resize', repositionMarker);
    resizeObserver?.disconnect();
    resizeObserver = null;
  };

  const rebindChunks = () => {
    if (!player.getState().active) return;
    const idx = player.getState().index;
    activeChunks = getChunks();
    const chunk = activeChunks[idx];
    currentEl = chunk?.el ?? null;
    repositionMarker();
  };

  const start = () => {
    if (!synth.isSupported()) {
      showToast('Listen mode is unsupported in this browser');
      return;
    }
    const chunks = getChunks();
    if (chunks.length === 0) {
      showToast('Nothing to read');
      return;
    }
    activeChunks = chunks;
    attachScrollListeners();
    player.start(chunks);
    refresh();
  };

  const stopAll = () => {
    player.stop();
    detachScrollListeners();
    currentEl = null;
    refresh();
  };

  listenBtn.addEventListener('click', () => {
    if (player.getState().active) {
      stopAll();
    } else {
      start();
    }
  });

  playBtn.addEventListener('click', () => {
    player.togglePlay();
    refresh();
  });
  stopBtn.addEventListener('click', stopAll);
  fwdBtn.addEventListener('click', () => {
    player.skipForward();
    refresh();
  });
  backBtn.addEventListener('click', () => {
    player.skipBack();
    refresh();
  });

  speedSel.addEventListener('change', () => {
    player.setSpeed(Number.parseFloat(speedSel.value));
    refresh();
  });

  const populateVoices = () => {
    const voices = synth.getVoices();
    const previous = voiceSel.value;
    voiceSel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Default voice';
    voiceSel.appendChild(auto);
    for (const v of voices) {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSel.appendChild(opt);
    }
    if (previous && voices.some((v) => v.voiceURI === previous)) {
      voiceSel.value = previous;
    }
  };

  populateVoices();
  synth.onVoicesChanged(populateVoices);

  voiceSel.addEventListener('change', () => {
    player.setVoice(voiceSel.value || null);
    refresh();
  });

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const ratioFromEvent = (e: PointerEvent): number => {
    const rect = progress.getBoundingClientRect();
    return clamp01((e.clientX - rect.left) / rect.width);
  };

  const previewAt = (ratio: number): void => {
    if (activeChunks.length === 0) return;
    const idx = Math.min(
      Math.max(Math.floor(ratio * activeChunks.length), 0),
      activeChunks.length - 1,
    );
    const chunk = activeChunks[idx];
    if (!chunk) return;
    const fill = document.getElementById('audio-progress-fill');
    if (fill) fill.style.width = `${((idx + 1) / activeChunks.length) * 100}%`;
    const label = document.getElementById('audio-label');
    if (label) {
      const short = chunk.text.length > 80 ? `${chunk.text.slice(0, 80)}…` : chunk.text;
      label.innerHTML = `<strong>${idx + 1}/${activeChunks.length}</strong> &ensp;${short}`;
    }
    if (chunk.el) {
      const rect = chunk.el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        marker.style.top = `${rect.top - PAD}px`;
        marker.style.left = `${rect.left - PAD}px`;
        marker.style.width = `${rect.width + PAD * 2}px`;
        marker.style.height = `${rect.height + PAD * 2}px`;
        marker.style.opacity = '1';
        chunk.el.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      }
    }
    currentEl = chunk.el;
  };

  progress.addEventListener('pointerdown', (e) => {
    if (!player.getState().active) return;
    dragging = true;
    progress.setPointerCapture(e.pointerId);
    previewAt(ratioFromEvent(e));
  });

  progress.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    previewAt(ratioFromEvent(e));
  });

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (progress.hasPointerCapture(e.pointerId)) progress.releasePointerCapture(e.pointerId);
    player.seek(ratioFromEvent(e));
    refresh();
  };
  progress.addEventListener('pointerup', endDrag);
  progress.addEventListener('pointercancel', endDrag);

  if (previewPane) {
    previewPane.addEventListener('click', (e) => {
      if (!player.getState().active || dragging) return;
      let el: Element | null = e.target as Element | null;
      while (el && el !== previewPane) {
        const idx = activeChunks.findIndex((c) => c.el === el);
        if (idx !== -1) {
          player.seekToIndex(idx);
          return;
        }
        el = el.parentElement;
      }
    });
  }

  editor.addEventListener('input', () => {
    if (player.getState().active) {
      stopAll();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!player.getState().active) return;
    if (e.key === 'Escape') {
      stopAll();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      player.skipForward();
      refresh();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      player.skipBack();
      refresh();
    }
  });

  return { onPreviewChange: rebindChunks };
};
