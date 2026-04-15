import type { Player, PlayerState } from '../listen/player.ts';
import type { SpeechChunk } from '../types.ts';
import { showToast } from './toast.ts';

const HIGHLIGHT_CLASS = 'speaking-highlight';

export interface ListenBarDeps {
  player: Player;
  getChunks: () => SpeechChunk[];
  stopOnEdit: () => void;
}

const clearHighlights = (): void => {
  for (const el of document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)) {
    el.classList.remove(HIGHLIGHT_CLASS);
  }
};

const highlightChunk = (chunk: SpeechChunk | undefined): void => {
  clearHighlights();
  if (!chunk?.el) return;
  chunk.el.classList.add(HIGHLIGHT_CLASS);
  chunk.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const updateUI = (state: PlayerState, chunks: readonly SpeechChunk[]): void => {
  const bar = document.getElementById('audio-bar');
  const mainContainer = document.getElementById('main-container');
  const listenBtn = document.getElementById('listen-btn');
  const fill = document.getElementById('audio-progress-fill');
  const label = document.getElementById('audio-label');
  const iconPlay = document.getElementById('audio-icon-play');
  const iconPause = document.getElementById('audio-icon-pause');
  if (!bar || !mainContainer || !listenBtn || !fill || !label || !iconPlay || !iconPause) return;

  bar.classList.toggle('visible', state.active);
  mainContainer.classList.toggle('has-audio-bar', state.active);
  listenBtn.classList.toggle('active-listen', state.active);

  if (!state.active) {
    clearHighlights();
    fill.style.width = '0%';
    label.innerHTML = '<strong>Ready</strong>';
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    return;
  }

  const pct = state.total > 0 ? ((state.index + 1) / state.total) * 100 : 0;
  fill.style.width = `${pct}%`;
  const chunk = chunks[state.index];
  const text = chunk?.text ?? '';
  const short = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  label.innerHTML = `<strong>${state.index + 1}/${state.total}</strong> &ensp;${short}`;
  iconPlay.style.display = state.playing ? 'none' : '';
  iconPause.style.display = state.playing ? '' : 'none';
  highlightChunk(chunk);
};

export const initListenBar = ({ player, getChunks, stopOnEdit }: ListenBarDeps): void => {
  const listenBtn = document.getElementById('listen-btn');
  const playBtn = document.getElementById('audio-play-btn');
  const stopBtn = document.getElementById('audio-stop-btn');
  const fwdBtn = document.getElementById('audio-fwd-btn');
  const backBtn = document.getElementById('audio-back-btn');
  const progress = document.getElementById('audio-progress');
  const speedSel = document.getElementById('audio-speed') as HTMLSelectElement | null;
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
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
    return;
  }

  let activeChunks: SpeechChunk[] = [];

  const refresh = () => updateUI(player.getState(), activeChunks);

  const start = () => {
    const chunks = getChunks();
    if (chunks.length === 0) {
      showToast('Nothing to read');
      return;
    }
    activeChunks = chunks;
    player.start(chunks);
    refresh();
  };

  listenBtn.addEventListener('click', () => {
    if (player.getState().active) {
      player.stop();
    } else {
      start();
    }
    refresh();
  });

  playBtn.addEventListener('click', () => {
    player.togglePlay();
    refresh();
  });
  stopBtn.addEventListener('click', () => {
    player.stop();
    refresh();
  });
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
      stopOnEdit();
      player.stop();
      refresh();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && player.getState().active) {
      player.stop();
      refresh();
    }
  });
};
