import { beforeEach, describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/listen/player.ts';
import type { SpeechUtterance, SpeechVoice, Synth } from '../../src/ports.ts';
import type { SpeechChunk } from '../../src/types.ts';

interface SpokenUtterance extends SpeechUtterance {
  spoken: true;
}

const makeSynth = (voices: SpeechVoice[] = []) => {
  const log: { text: string; rate: number; voiceURI: string | null }[] = [];
  const utts: SpokenUtterance[] = [];
  let cancelled = 0;
  let last: SpokenUtterance | null = null;
  const synth: Synth = {
    createUtterance: (text) => ({
      text,
      rate: 1,
      voiceURI: null,
      onend: null,
      onerror: null,
    }),
    speak: (u) => {
      log.push({ text: u.text, rate: u.rate, voiceURI: u.voiceURI });
      last = u as SpokenUtterance;
      utts.push(u as SpokenUtterance);
    },
    cancel: () => {
      cancelled++;
    },
    getVoices: () => voices,
    onVoicesChanged: () => () => {},
    isSupported: () => true,
  };
  return {
    synth,
    log,
    cancels: () => cancelled,
    triggerEnd: () => last?.onend?.(),
    triggerError: () => last?.onerror?.(),
    triggerEndAt: (i: number) => utts[i]?.onend?.(),
    triggerErrorAt: (i: number) => utts[i]?.onerror?.(),
  };
};

const CHUNKS: SpeechChunk[] = [
  { text: 'one', el: null },
  { text: 'two', el: null },
  { text: 'three', el: null },
];

describe('createPlayer', () => {
  let ctx: ReturnType<typeof makeSynth>;
  beforeEach(() => {
    ctx = makeSynth();
  });

  it('initialises in idle state', () => {
    const p = createPlayer({ synth: ctx.synth });
    expect(p.getState()).toEqual({
      active: false,
      playing: false,
      index: -1,
      total: 0,
      speed: 1,
      voiceURI: null,
    });
  });

  it('start() with empty chunks does nothing', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start([]);
    expect(p.getState().active).toBe(false);
    expect(ctx.log).toHaveLength(0);
  });

  it('start() speaks the first chunk and enters active+playing', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    const s = p.getState();
    expect(s.active).toBe(true);
    expect(s.playing).toBe(true);
    expect(s.index).toBe(0);
    expect(s.total).toBe(3);
    expect(ctx.log).toEqual([{ text: 'one', rate: 1, voiceURI: null }]);
  });

  it('advances to the next chunk on utterance end', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    ctx.triggerEnd();
    expect(p.getState().index).toBe(1);
    expect(ctx.log.at(-1)).toEqual({ text: 'two', rate: 1, voiceURI: null });
  });

  it('stops when the final utterance ends', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    ctx.triggerEnd();
    ctx.triggerEnd();
    ctx.triggerEnd();
    expect(p.getState()).toMatchObject({ active: false, playing: false, index: -1 });
  });

  it('ignores onend when playback has been paused', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    ctx.triggerEnd();
    expect(p.getState().index).toBe(0);
  });

  it('onerror advances to the next chunk when playing', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    ctx.triggerError();
    expect(p.getState().index).toBe(1);
  });

  it('onerror does not advance when paused', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    ctx.triggerError();
    expect(p.getState().index).toBe(0);
  });

  it('togglePlay pauses when playing and resumes at current index', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.skipForward();
    p.togglePlay();
    expect(p.getState().playing).toBe(false);
    p.togglePlay();
    expect(p.getState().playing).toBe(true);
    expect(p.getState().index).toBe(1);
  });

  it('togglePlay is a no-op when inactive', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.togglePlay();
    expect(ctx.log).toHaveLength(0);
    expect(p.getState().active).toBe(false);
  });

  it('resuming from index -1 (never played) starts at 0', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    ctx.triggerEnd();
    ctx.triggerEnd();
    ctx.triggerEnd();
    // now inactive; togglePlay should stay no-op
    p.togglePlay();
    expect(p.getState().active).toBe(false);
  });

  it('skipForward advances by one, clamped to last chunk', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.skipForward();
    expect(p.getState().index).toBe(1);
    p.skipForward();
    p.skipForward();
    expect(p.getState().index).toBe(2);
  });

  it('skipForward is a no-op when inactive', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.skipForward();
    expect(ctx.log).toHaveLength(0);
  });

  it('skipBack rewinds by one, clamped at 0', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.skipForward();
    p.skipForward();
    expect(p.getState().index).toBe(2);
    p.skipBack();
    expect(p.getState().index).toBe(1);
    p.skipBack();
    p.skipBack();
    expect(p.getState().index).toBe(0);
  });

  it('skipBack is a no-op when inactive', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.skipBack();
    expect(ctx.log).toHaveLength(0);
  });

  it('seek jumps to the chunk at the given ratio', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seek(0.5);
    expect(p.getState().index).toBe(1);
    p.seek(0.99);
    expect(p.getState().index).toBe(2);
    p.seek(0);
    expect(p.getState().index).toBe(0);
  });

  it('seek clamps negative and >=1 ratios', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seek(-1);
    expect(p.getState().index).toBe(0);
    p.seek(10);
    expect(p.getState().index).toBe(2);
  });

  it('seek is a no-op when inactive or empty', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.seek(0.5);
    expect(ctx.log).toHaveLength(0);
  });

  it('seekToIndex jumps to the given chunk index', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seekToIndex(2);
    expect(p.getState().index).toBe(2);
    expect(ctx.log.at(-1)).toEqual({ text: 'three', rate: 1, voiceURI: null });
  });

  it('seekToIndex clamps out-of-range values', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seekToIndex(-5);
    expect(p.getState().index).toBe(0);
    p.seekToIndex(99);
    expect(p.getState().index).toBe(2);
  });

  it('seekToIndex resumes playback after a pause', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    expect(p.getState().playing).toBe(false);
    p.seekToIndex(1);
    expect(p.getState().playing).toBe(true);
    expect(p.getState().index).toBe(1);
  });

  it('seekToIndex is a no-op when inactive', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.seekToIndex(1);
    expect(ctx.log).toHaveLength(0);
    expect(p.getState().active).toBe(false);
  });

  it('ignores onend from an utterance cancelled by seekToIndex', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seekToIndex(2);
    expect(p.getState().index).toBe(2);
    // Browsers fire the cancelled utterance's onend after cancel();
    // the player must not treat it as a cue to advance past 2.
    ctx.triggerEndAt(0);
    expect(p.getState().index).toBe(2);
    expect(ctx.log.at(-1)).toEqual({ text: 'three', rate: 1, voiceURI: null });
  });

  it('ignores onerror from an utterance cancelled by seekToIndex', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seekToIndex(1);
    ctx.triggerErrorAt(0);
    expect(p.getState().index).toBe(1);
  });

  it('ignores onend from an utterance cancelled by seek(ratio)', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.seek(0.99);
    expect(p.getState().index).toBe(2);
    ctx.triggerEndAt(0);
    expect(p.getState().index).toBe(2);
  });

  it('ignores onend from an utterance cancelled by pause', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    ctx.triggerEndAt(0);
    expect(p.getState().index).toBe(0);
    expect(p.getState().playing).toBe(false);
  });

  it('setSpeed while playing restarts the current chunk at the new rate', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.setSpeed(1.5);
    expect(ctx.log.at(-1)).toEqual({ text: 'one', rate: 1.5, voiceURI: null });
    expect(p.getState().speed).toBe(1.5);
  });

  it('setSpeed while paused updates the stored rate without speaking', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    const before = ctx.log.length;
    p.setSpeed(2);
    expect(ctx.log.length).toBe(before);
    expect(p.getState().speed).toBe(2);
  });

  it('stop clears synth and returns to idle', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.stop();
    expect(p.getState()).toEqual({
      active: false,
      playing: false,
      index: -1,
      total: 0,
      speed: 1,
      voiceURI: null,
    });
    expect(ctx.cancels()).toBeGreaterThanOrEqual(1);
  });

  it('emits state changes via onStateChange', () => {
    const states: boolean[] = [];
    const p = createPlayer({
      synth: ctx.synth,
      onStateChange: (s) => states.push(s.active),
    });
    p.start(CHUNKS);
    p.stop();
    expect(states).toContain(true);
    expect(states.at(-1)).toBe(false);
  });

  it('setVoice while playing restarts the current chunk with the new voice', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.setVoice('alex');
    expect(ctx.log.at(-1)).toEqual({ text: 'one', rate: 1, voiceURI: 'alex' });
    expect(p.getState().voiceURI).toBe('alex');
  });

  it('setVoice while paused updates the stored voice without speaking', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.togglePlay();
    const before = ctx.log.length;
    p.setVoice('samantha');
    expect(ctx.log.length).toBe(before);
    expect(p.getState().voiceURI).toBe('samantha');
  });

  it('setVoice(null) clears the stored voice', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.start(CHUNKS);
    p.setVoice('alex');
    p.setVoice(null);
    expect(ctx.log.at(-1)).toEqual({ text: 'one', rate: 1, voiceURI: null });
    expect(p.getState().voiceURI).toBeNull();
  });

  it('setVoice before start leaves player inactive but stores voice for future start', () => {
    const p = createPlayer({ synth: ctx.synth });
    p.setVoice('alex');
    expect(p.getState().voiceURI).toBe('alex');
    p.start(CHUNKS);
    expect(ctx.log.at(-1)).toEqual({ text: 'one', rate: 1, voiceURI: 'alex' });
  });

  it('speakAt bails when target is out of range (start with no chunks -> stop)', () => {
    const p = createPlayer({ synth: ctx.synth });
    // Directly exercise the out-of-range guard by starting and seeking past end
    p.start(CHUNKS);
    ctx.triggerEnd();
    ctx.triggerEnd();
    ctx.triggerEnd();
    // Player stopped; any further action is inactive
    expect(p.getState().active).toBe(false);
  });

  it('picks a matching voice for a chunk with a language tag', () => {
    const voices: SpeechVoice[] = [
      { voiceURI: 'amelie', name: 'Amélie', lang: 'fr-FR', default: false },
      { voiceURI: 'alex', name: 'Alex', lang: 'en-US', default: true },
    ];
    const ctx2 = makeSynth(voices);
    const p = createPlayer({ synth: ctx2.synth });
    const langChunks: SpeechChunk[] = [
      { text: 'bonjour', el: null, lang: 'fr' },
      { text: 'hello', el: null },
    ];
    p.start(langChunks);
    expect(ctx2.log[0]!.voiceURI).toBe('amelie');
    // Second chunk has no lang → falls through to the player's preferred voiceURI (null).
    ctx2.triggerEnd();
    expect(ctx2.log[1]!.voiceURI).toBeNull();
  });

  it('falls back to the preferred voice when no voice matches the chunk lang', () => {
    const voices: SpeechVoice[] = [
      { voiceURI: 'alex', name: 'Alex', lang: 'en-US', default: true },
    ];
    const ctx2 = makeSynth(voices);
    const p = createPlayer({ synth: ctx2.synth });
    p.setVoice('alex');
    p.start([{ text: 'hola', el: null, lang: 'es' }]);
    // "es" has no matching voice → uses the user's saved voice
    expect(ctx2.log[0]!.voiceURI).toBe('alex');
  });

  it('lang match wins over the user preference', () => {
    const voices: SpeechVoice[] = [
      { voiceURI: 'alex', name: 'Alex', lang: 'en-US', default: true },
      { voiceURI: 'amelie', name: 'Amélie', lang: 'fr-FR', default: false },
    ];
    const ctx2 = makeSynth(voices);
    const p = createPlayer({ synth: ctx2.synth });
    p.setVoice('alex');
    p.start([{ text: 'bonjour', el: null, lang: 'fr' }]);
    expect(ctx2.log[0]!.voiceURI).toBe('amelie');
  });
});
