import type { SpeechVoice } from './ports.ts';

/**
 * Pick a voice from the available list using the saved preference first, then
 * a system language hint, then the browser's own `default` flag, and finally
 * the first voice as a last resort. Returns `null` when no voices exist.
 */
export const pickVoice = (
  voices: readonly SpeechVoice[],
  savedUri: string | null,
  systemLangHint?: string,
): SpeechVoice | null => {
  if (voices.length === 0) return null;
  if (savedUri) {
    const saved = voices.find((v) => v.voiceURI === savedUri);
    if (saved) return saved;
  }
  if (systemLangHint) {
    const hint = systemLangHint.toLowerCase();
    const byLang = voices.find((v) => v.lang.toLowerCase().startsWith(hint));
    if (byLang) return byLang;
  }
  const preferred = voices.find((v) => v.default);
  if (preferred) return preferred;
  // `voices.length === 0` was handled above, so `voices[0]` is always defined.
  return voices[0] as SpeechVoice;
};

/**
 * Pick a voice whose `lang` matches the provided tag prefix (case-insensitive).
 * Returns `null` when no voice matches, so the caller can fall back to the
 * user-chosen preference.
 */
export const pickVoiceForLang = (
  voices: readonly SpeechVoice[],
  lang: string,
): SpeechVoice | null => {
  if (voices.length === 0 || !lang) return null;
  const prefix = lang.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
};
