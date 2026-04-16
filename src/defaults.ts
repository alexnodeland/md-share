import { sampleFor } from './samples.ts';
import type { Flavor } from './types.ts';

export const defaultFor = (flavor: Flavor): string => sampleFor(flavor);
