#!/usr/bin/env node

import { deflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

const USAGE = `Usage:
  node scripts/generate-share-link.mjs <file.md|file.txt> [--base=<url>] [--flavor=<name>]

Without --flavor, the flavor is guessed from the document (Obsidian callouts,
GitHub tables, Confluence panels, …), falling back to CommonMark.

Examples:
  node scripts/generate-share-link.mjs notes.md
  node scripts/generate-share-link.mjs notes.txt --flavor=gfm
  node scripts/generate-share-link.mjs notes.md --base=https://md.alexnodeland.com/
`;

const ALLOWED_EXTS = new Set(['.md', '.markdown', '.txt']);
const ALLOWED_FLAVORS = new Set([
  'commonmark',
  'extended',
  'academic',
  'gfm',
  'obsidian',
  'atlassian',
]);
const DEFAULT_BASE = 'https://md.alexnodeland.com/';

// A copy of src/detectFlavor.ts: this script is downloaded on its own, so it
// can't import it. tests/detectFlavor.test.ts checks the two agree.
const BIBLIOGRAPHY_FENCE = /^ {0,3}(`{3,}|~{3,})\s*bibliography\s*$/m;
const FENCED_CODE = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm;
const INLINE_CODE = /(`+)[^`\n][\s\S]*?\1/g;
const RULES = [
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
  [
    'gfm',
    [
      /^ *[-*+] \[[ xX]\] /m,
      /^ *\|?( *:?-+:? *\|)+( *:?-+:? *)?$/m,
      /~~[^~\n]+~~/,
    ],
  ],
];
const detectFlavor = (text) => {
  if (BIBLIOGRAPHY_FENCE.test(text)) return 'academic';
  const prose = text.replace(FENCED_CODE, '').replace(INLINE_CODE, '');
  for (const [flavor, patterns] of RULES) {
    if (patterns.some((re) => re.test(prose))) return flavor;
  }
  return null;
};

const normalizeSource = (text) => {
  const withoutBom = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const unifiedEol = withoutBom.replace(/\r\n?/g, '\n');
  return unifiedEol.replace(/[ \t\n]+$/, '');
};

const bytesToBase64Url = (bytes) =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// deflate-raw (`df1.`) is the one stream format every modern browser can decode.
const encodeDoc = (text) => `df1.${bytesToBase64Url(deflateRawSync(Buffer.from(text, 'utf8')))}`;

const parseOption = (args, key) => {
  const prefix = `--${key}=`;
  const valueArg = args.find((arg) => arg.startsWith(prefix));
  return valueArg ? valueArg.slice(prefix.length) : null;
};

const fail = (message) => {
  console.error(message);
  console.error();
  console.error(USAGE);
  process.exit(1);
};

const [fileArg, ...options] = process.argv.slice(2);
if (!fileArg || fileArg.startsWith('-')) {
  fail('Missing input file.');
}

const ext = extname(fileArg).toLowerCase();
if (!ALLOWED_EXTS.has(ext)) {
  fail(`Unsupported file type for "${basename(fileArg)}". Use .md, .markdown, or .txt.`);
}

const unknownOption = options.find(
  (opt) => !opt.startsWith('--base=') && !opt.startsWith('--flavor='),
);
if (unknownOption) {
  fail(`Unknown option "${unknownOption}".`);
}

const baseRaw = parseOption(options, 'base') ?? DEFAULT_BASE;
const flavorOption = parseOption(options, 'flavor');

if (flavorOption !== null && !ALLOWED_FLAVORS.has(flavorOption)) {
  fail(`Unsupported flavor "${flavorOption}".`);
}

let baseUrl;
try {
  baseUrl = new URL(baseRaw);
} catch {
  fail(`Invalid base URL "${baseRaw}".`);
}

const source = normalizeSource(readFileSync(resolve(fileArg), 'utf8'));
const noHashBase = `${baseUrl.origin}${baseUrl.pathname}`;

if (!source) {
  console.log(noHashBase);
  process.exit(0);
}

const encoded = encodeDoc(source);
const flavor = flavorOption ?? detectFlavor(source) ?? 'commonmark';
const flavorQuery = flavor === 'commonmark' ? '' : `&f=${encodeURIComponent(flavor)}`;
console.log(`${noHashBase}#d=${encoded}${flavorQuery}`);
