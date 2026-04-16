import type { SpeechUtterance, Synth } from '../ports.ts';
import type { SpeechChunk } from '../types.ts';

export interface PlayerState {
  readonly active: boolean;
  readonly playing: boolean;
  readonly index: number;
  readonly total: number;
  readonly speed: number;
}

export interface Player {
  start(chunks: readonly SpeechChunk[]): void;
  stop(): void;
  togglePlay(): void;
  skipForward(): void;
  skipBack(): void;
  seek(ratio: number): void;
  seekToIndex(index: number): void;
  setSpeed(speed: number): void;
  getState(): PlayerState;
}

export interface PlayerDeps {
  synth: Synth;
  onStateChange?: (state: PlayerState) => void;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const createPlayer = ({ synth, onStateChange }: PlayerDeps): Player => {
  let chunks: readonly SpeechChunk[] = [];
  let active = false;
  let playing = false;
  let index = -1;
  let speed = 1;
  let liveUtterance: SpeechUtterance | null = null;

  const state = (): PlayerState => ({
    active,
    playing,
    index,
    total: chunks.length,
    speed,
  });

  const emit = () => onStateChange?.(state());

  const speakAt = (i: number): void => {
    index = i;
    const chunk = chunks[i]!;
    const utterance = synth.createUtterance(chunk.text);
    utterance.rate = speed;
    utterance.onend = () => {
      if (!playing || utterance !== liveUtterance) return;
      if (index >= chunks.length - 1) stop();
      else speakAt(index + 1);
    };
    utterance.onerror = () => {
      if (playing && utterance === liveUtterance) speakAt(index + 1);
    };
    liveUtterance = utterance;
    synth.speak(utterance);
    emit();
  };

  const start = (newChunks: readonly SpeechChunk[]): void => {
    synth.cancel();
    chunks = newChunks;
    if (chunks.length === 0) return;
    active = true;
    playing = true;
    speakAt(0);
  };

  const stop = (): void => {
    synth.cancel();
    chunks = [];
    active = false;
    playing = false;
    index = -1;
    liveUtterance = null;
    emit();
  };

  const togglePlay = (): void => {
    if (!active) return;
    if (playing) {
      synth.cancel();
      playing = false;
      liveUtterance = null;
      emit();
    } else {
      playing = true;
      speakAt(index);
    }
  };

  const skipForward = (): void => {
    if (!active) return;
    synth.cancel();
    playing = true;
    speakAt(Math.min(index + 1, chunks.length - 1));
  };

  const skipBack = (): void => {
    if (!active) return;
    synth.cancel();
    playing = true;
    speakAt(Math.max(index - 1, 0));
  };

  const seek = (ratio: number): void => {
    if (!active || chunks.length === 0) return;
    const target = clamp(Math.floor(ratio * chunks.length), 0, chunks.length - 1);
    synth.cancel();
    playing = true;
    speakAt(target);
  };

  const seekToIndex = (i: number): void => {
    if (!active || chunks.length === 0) return;
    const target = clamp(i, 0, chunks.length - 1);
    synth.cancel();
    playing = true;
    speakAt(target);
  };

  const setSpeed = (newSpeed: number): void => {
    speed = newSpeed;
    if (playing) {
      synth.cancel();
      speakAt(index);
    } else {
      emit();
    }
  };

  return {
    start,
    stop,
    togglePlay,
    skipForward,
    skipBack,
    seek,
    seekToIndex,
    setSpeed,
    getState: state,
  };
};
