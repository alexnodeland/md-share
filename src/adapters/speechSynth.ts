import type { SpeechUtterance, SpeechVoice, Synth } from '../ports.ts';

const toBrowserUtterance = (u: SpeechUtterance): SpeechSynthesisUtterance => {
  const browser = new SpeechSynthesisUtterance(u.text);
  browser.rate = u.rate;
  if (u.voiceURI) {
    const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === u.voiceURI);
    if (match) browser.voice = match;
  }
  browser.onend = () => u.onend?.();
  browser.onerror = () => u.onerror?.();
  return browser;
};

export const browserSynth: Synth = {
  createUtterance: (text) => ({ text, rate: 1, voiceURI: null, onend: null, onerror: null }),
  speak: (u) => window.speechSynthesis.speak(toBrowserUtterance(u)),
  cancel: () => window.speechSynthesis.cancel(),
  getVoices: (): SpeechVoice[] =>
    window.speechSynthesis.getVoices().map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      default: v.default,
    })),
  onVoicesChanged: (cb) => {
    window.speechSynthesis.addEventListener('voiceschanged', cb);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
  },
};
