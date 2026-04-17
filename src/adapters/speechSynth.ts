import { splitUtterance } from '../listen/utterance.ts';
import type { SpeechUtterance, SpeechVoice, Synth } from '../ports.ts';

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

const resolveVoice = (s: SpeechSynthesis, voiceURI: string | null): SpeechSynthesisVoice | null => {
  if (!voiceURI) return null;
  return s.getVoices().find((v) => v.voiceURI === voiceURI) ?? null;
};

const speakPieces = (s: SpeechSynthesis, u: SpeechUtterance, pieces: string[]): void => {
  let i = 0;
  const speakNext = () => {
    if (i >= pieces.length) {
      u.onend?.();
      return;
    }
    const text = pieces[i++]!;
    const browser = new SpeechSynthesisUtterance(text);
    browser.rate = u.rate;
    const voice = resolveVoice(s, u.voiceURI);
    if (voice) browser.voice = voice;
    browser.onend = () => speakNext();
    browser.onerror = () => u.onerror?.();
    s.speak(browser);
  };
  speakNext();
};

export const browserSynth: Synth = {
  createUtterance: (text) => ({ text, rate: 1, voiceURI: null, onend: null, onerror: null }),
  speak: (u) => {
    const s = synth();
    if (!s) {
      setTimeout(() => u.onerror?.(), 0);
      return;
    }
    const pieces = splitUtterance(u.text);
    if (pieces.length === 0) {
      setTimeout(() => u.onend?.(), 0);
      return;
    }
    speakPieces(s, u, pieces);
  },
  cancel: () => synth()?.cancel(),
  getVoices: (): SpeechVoice[] => {
    const s = synth();
    if (!s) return [];
    return s.getVoices().map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      default: v.default,
    }));
  },
  onVoicesChanged: (cb) => {
    const s = synth();
    if (!s) return () => {};
    s.addEventListener('voiceschanged', cb);
    return () => s.removeEventListener('voiceschanged', cb);
  },
  isSupported: () => synth() !== null,
};
