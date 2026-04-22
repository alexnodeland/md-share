#!/usr/bin/env node

import { brotliCompressSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

const USAGE = `Usage:
  node scripts/generate-share-link.mjs <file.md|file.txt> [--base=<url>] [--flavor=<name>]

Examples:
  node scripts/generate-share-link.mjs notes.md
  node scripts/generate-share-link.mjs notes.txt --flavor=gfm
  node scripts/generate-share-link.mjs notes.md --base=https://alexnodeland.github.io/md-share/
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
const DEFAULT_BASE = 'https://alexnodeland.github.io/md-share/';

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

const encodeDoc = (text) => `br1.${bytesToBase64Url(brotliCompressSync(Buffer.from(text, 'utf8')))}`;

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
const flavor = parseOption(options, 'flavor') ?? 'commonmark';

if (!ALLOWED_FLAVORS.has(flavor)) {
  fail(`Unsupported flavor "${flavor}".`);
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
const flavorQuery = flavor === 'commonmark' ? '' : `&f=${encodeURIComponent(flavor)}`;
console.log(`${noHashBase}#d=${encoded}${flavorQuery}`);
