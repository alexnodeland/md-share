import type { NativeShare } from '../ports.ts';

export const browserNativeShare: NativeShare = {
  isAvailable: () => typeof navigator.share === 'function',
  share: (data) => navigator.share(data),
};
