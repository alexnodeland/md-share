import type { Printer } from '../ports.ts';

export const browserPrinter: Printer = {
  print: () => window.print(),
};
