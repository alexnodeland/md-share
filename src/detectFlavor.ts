import type { Flavor } from './types.ts';

/*
 * Guess which flavor a document was written for, from markers that only one
 * tool produces. Used when Markdown is pasted into an empty CommonMark editor,
 * so a note from Obsidian or Confluence renders as its author saw it.
 *
 * Kept free of imports and TypeScript-only syntax in its rules: the share-link
 * script (scripts/generate-share-link.mjs) carries a copy, and a test runs
 * both against the same documents.
 */

// A pandoc bibliography lives in a fence, so look before code is stripped.
const BIBLIOGRAPHY_FENCE = /^ {0,3}(`{3,}|~{3,})\s*bibliography\s*$/m;

const FENCED_CODE = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm;
const INLINE_CODE = /(`+)[^`\n][\s\S]*?\1/g;

const RULES: readonly (readonly [Flavor, readonly RegExp[]])[] = [
  [
    'atlassian',
    [
      /^ *\{(info|note|warning|tip|panel|expand|quote|noformat)(:[^}\n]*)?\} *$/m,
      /\{status(:[^}\n]*)?\}/,
    ],
  ],
  ['obsidian', [/^ *> *\[![\w-]+\]/m, /!?\[\[[^\]\n]+\]\]/, /%%[\s\S]+?%%/]],
  ['academic', [/\[-?@[\w:.-]+/, /\{#(fig|tbl|eq|sec):[\w-]+\}/, /\$\$[\s\S]+?\$\$/]],
  ['extended', [/^\[\^[^\]\n]+\]:/m, /^[^\s:][^\n]*\n(?: *\n)?: {1,3}\S/m]],
  ['gfm', [/^ *[-*+] \[[ xX]\] /m, /^ *\|?( *:?-+:? *\|)+( *:?-+:? *)?$/m, /~~[^~\n]+~~/]],
];

/** The flavor `text` was most likely written in, or `null` if nothing says. */
export const detectFlavor = (text: string): Flavor | null => {
  if (BIBLIOGRAPHY_FENCE.test(text)) return 'academic';
  const prose = text.replace(FENCED_CODE, '').replace(INLINE_CODE, '');
  for (const [flavor, patterns] of RULES) {
    if (patterns.some((re) => re.test(prose))) return flavor;
  }
  return null;
};
