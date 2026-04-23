import { describe, expect, it } from 'vitest';
import type { SpeechVoice } from '../src/ports.ts';
import { pickVoice, pickVoiceForLang } from '../src/voicePreference.ts';

const voice = (overrides: Partial<SpeechVoice>): SpeechVoice => ({
  voiceURI: 'generic',
  name: 'Generic',
  lang: 'en-US',
  default: false,
  ...overrides,
});

describe('pickVoice', () => {
  it('returns null when no voices are available', () => {
    expect(pickVoice([], null)).toBeNull();
    expect(pickVoice([], 'anything', 'en')).toBeNull();
  });

  it('returns the voice matching the saved URI', () => {
    const voices = [
      voice({ voiceURI: 'a' }),
      voice({ voiceURI: 'b', name: 'Beta' }),
      voice({ voiceURI: 'c' }),
    ];
    expect(pickVoice(voices, 'b')).toEqual(voice({ voiceURI: 'b', name: 'Beta' }));
  });

  it('falls through to the language hint when the saved URI is unknown', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'de-DE' }),
      voice({ voiceURI: 'b', lang: 'fr-FR' }),
    ];
    expect(pickVoice(voices, 'missing', 'fr')).toEqual(voices[1]);
  });

  it('uses the language hint when no saved URI is provided', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'en-US' }),
      voice({ voiceURI: 'b', lang: 'ja-JP' }),
    ];
    expect(pickVoice(voices, null, 'ja')).toEqual(voices[1]);
  });

  it('matches the language hint case-insensitively', () => {
    const voices = [voice({ voiceURI: 'a', lang: 'PT-BR' })];
    expect(pickVoice(voices, null, 'pt')).toEqual(voices[0]);
  });

  it('prefers the browser default when neither saved URI nor hint match', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'en-US' }),
      voice({ voiceURI: 'b', lang: 'en-GB', default: true }),
    ];
    expect(pickVoice(voices, null, 'fr')).toEqual(voices[1]);
    expect(pickVoice(voices, null)).toEqual(voices[1]);
  });

  it('falls back to the first voice when there is no default', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'en-US' }),
      voice({ voiceURI: 'b', lang: 'en-GB' }),
    ];
    expect(pickVoice(voices, null)).toEqual(voices[0]);
  });

  it('ignores an empty saved URI (treats null/empty-string identically)', () => {
    const voices = [voice({ voiceURI: 'a', default: true }), voice({ voiceURI: 'b' })];
    expect(pickVoice(voices, '')).toEqual(voices[0]);
  });
});

describe('pickVoiceForLang', () => {
  it('returns null when no voices are available', () => {
    expect(pickVoiceForLang([], 'en')).toBeNull();
  });

  it('returns null when no voice matches the language prefix', () => {
    const voices = [voice({ voiceURI: 'a', lang: 'en-US' })];
    expect(pickVoiceForLang(voices, 'fr')).toBeNull();
  });

  it('returns the first voice whose lang starts with the prefix', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'en-US' }),
      voice({ voiceURI: 'b', lang: 'fr-FR' }),
      voice({ voiceURI: 'c', lang: 'fr-CA' }),
    ];
    expect(pickVoiceForLang(voices, 'fr')).toEqual(voices[1]);
  });

  it('matches full locale tags as well (fr-CA given "fr-CA")', () => {
    const voices = [
      voice({ voiceURI: 'a', lang: 'fr-FR' }),
      voice({ voiceURI: 'b', lang: 'fr-CA' }),
    ];
    expect(pickVoiceForLang(voices, 'fr-CA')).toEqual(voices[1]);
  });

  it('is case-insensitive', () => {
    const voices = [voice({ voiceURI: 'a', lang: 'PT-BR' })];
    expect(pickVoiceForLang(voices, 'pt')).toEqual(voices[0]);
  });

  it('returns null for an empty language string', () => {
    const voices = [voice({ voiceURI: 'a', lang: 'en-US' })];
    expect(pickVoiceForLang(voices, '')).toBeNull();
  });
});
