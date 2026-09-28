import type { NativeShare } from '../ports.ts';

export const browserNativeShare: NativeShare = {
  isAvailable: () => typeof navigator.share === 'function',
  share: (data) => navigator.share(data),
  canShareFiles: (files) =>
    typeof navigator.canShare === 'function' && navigator.canShare({ files }),
  shareFiles: (data) => navigator.share(data),
};
