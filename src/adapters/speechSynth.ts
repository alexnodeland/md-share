import type { SpeechUtterance, Synth } from '../ports.ts';

// Adapter: map our minimal SpeechUtterance port onto the browser's
// SpeechSynthesisUtterance. We translate the (event-parameterized) browser
// callbacks into the port's zero-arg callbacks.
const toBrowserUtterance = (u: SpeechUtterance): SpeechSynthesisUtterance => {
  const browser = new SpeechSynthesisUtterance(u.text);
  browser.rate = u.rate;
  browser.onend = () => u.onend?.();
  browser.onerror = () => u.onerror?.();
  return browser;
};

export const browserSynth: Synth = {
  createUtterance: (text) => ({ text, rate: 1, onend: null, onerror: null }),
  speak: (u) => window.speechSynthesis.speak(toBrowserUtterance(u)),
  cancel: () => window.speechSynthesis.cancel(),
};
