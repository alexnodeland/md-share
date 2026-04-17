import type { SpeechUtterance, SpeechVoice, Synth } from '../ports.ts';

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

const toBrowserUtterance = (s: SpeechSynthesis, u: SpeechUtterance): SpeechSynthesisUtterance => {
  const browser = new SpeechSynthesisUtterance(u.text);
  browser.rate = u.rate;
  if (u.voiceURI) {
    const match = s.getVoices().find((v) => v.voiceURI === u.voiceURI);
    if (match) browser.voice = match;
  }
  browser.onend = () => u.onend?.();
  browser.onerror = () => u.onerror?.();
  return browser;
};

export const browserSynth: Synth = {
  createUtterance: (text) => ({ text, rate: 1, voiceURI: null, onend: null, onerror: null }),
  speak: (u) => {
    const s = synth();
    if (!s) {
      setTimeout(() => u.onerror?.(), 0);
      return;
    }
    s.speak(toBrowserUtterance(s, u));
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
