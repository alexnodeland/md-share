import { type Flavor, isFlavor } from './types.ts';

export const resolveInitialFlavor = (shared: Flavor | null, stored: string | null): Flavor => {
  if (shared) return shared;
  if (isFlavor(stored)) return stored;
  return 'commonmark';
};

export const flavorNeedsKatex = (flavor: Flavor): boolean =>
  flavor === 'academic' || flavor === 'obsidian';
