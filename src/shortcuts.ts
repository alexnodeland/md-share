export type Platform = 'mac' | 'other';

export const detectPlatform = (platformString: string): Platform =>
  /Mac|iP(ad|od|hone)/.test(platformString) ? 'mac' : 'other';

const MAC_GLYPHS: Record<string, string> = {
  Mod: '\u2318',
  Ctrl: '\u2303',
  Alt: '\u2325',
  Shift: '\u21E7',
  Enter: '\u21A9',
};

const OTHER_NAMES: Record<string, string> = {
  Mod: 'Ctrl',
};

export const formatShortcut = (combo: string, platform: Platform): string => {
  const tokens = combo.split('+').map((t) => t.trim());
  if (platform === 'mac') {
    return tokens.map((t) => MAC_GLYPHS[t] ?? (t.length === 1 ? t.toUpperCase() : t)).join('');
  }
  return tokens.map((t) => OTHER_NAMES[t] ?? (t.length === 1 ? t.toUpperCase() : t)).join('+');
};
