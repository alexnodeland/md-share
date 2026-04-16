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
  chunk.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    !editor
  ) {
    return noop;
  }

  const marker = ensureMarker();
  let activeChunks: SpeechChunk[] = [];
  let currentEl: Element | null = null;

  const refresh = () => {
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

  const attachScrollListeners = () => {
    window.addEventListener('scroll', repositionMarker, { capture: true, passive: true });
    window.addEventListener('resize', repositionMarker, { passive: true });
  };

  const detachScrollListeners = () => {
    window.removeEventListener('scroll', repositionMarker, true);
    window.removeEventListener('resize', repositionMarker);
  };

  if (previewPane) {
    new ResizeObserver(repositionMarker).observe(previewPane);
  }

  const rebindChunks = () => {
    if (!player.getState().active) return;
    const idx = player.getState().index;
    activeChunks = getChunks();
    const chunk = activeChunks[idx];
    currentEl = chunk?.el ?? null;
    repositionMarker();
  };

  const start = () => {
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

  progress.addEventListener('click', (e) => {
    const rect = progress.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / progress.offsetWidth;
    player.seek(ratio);
    refresh();
  });

  editor.addEventListener('input', () => {
    if (player.getState().active) {
      stopAll();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && player.getState().active) {
      stopAll();
    }
  });

  return { onPreviewChange: rebindChunks };
};
