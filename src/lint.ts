import { contrastRatio, parseColor, type Rgb } from './contrast.ts';
import type { Flavor } from './types.ts';

export type Severity = 'warn' | 'info';

export interface Diagnostic {
  id: string;
  severity: Severity;
  message: string;
  targetId?: string;
}

export interface LintInput {
  source: string;
  preview: Element;
  flavor: Flavor;
}

const FENCE_RE = /^```/;
const BLOCK_MATH_RE = /^\s*\$\$/;
const FOOTNOTE_REF_RE = /\[\^([^\]]+)\]/g;
const FOOTNOTE_DEF_RE = /^\s*\[\^([^\]]+)\]:/gm;
const HEADING_LINK_RE = /\[[^\]]+\]\(#([^)\s]+)\)/g;

const stripFencesAndMath = (source: string): string => {
  const lines = source.split('\n');
  const out: string[] = [];
  let inFence = false;
  let inMath = false;
  for (const line of lines) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push('');
      continue;
    }
    if (BLOCK_MATH_RE.test(line)) {
      inMath = !inMath;
      continue;
    }
    if (inMath) {
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
};

const countBlockMathDelimiters = (source: string): number => {
  const lines = source.split('\n');
  let count = 0;
  let inFence = false;
  for (const line of lines) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const matches = line.match(/\$\$/g);
    if (matches) count += matches.length;
  }
  return count;
};

const collectFootnoteRefs = (source: string): Set<string> => {
  const clean = stripFencesAndMath(source);
  const refs = new Set<string>();
  for (const m of clean.matchAll(FOOTNOTE_REF_RE)) refs.add(m[1] as string);
  return refs;
};

const collectFootnoteDefs = (source: string): Set<string> => {
  const clean = stripFencesAndMath(source);
  const defs = new Set<string>();
  for (const m of clean.matchAll(FOOTNOTE_DEF_RE)) defs.add(m[1] as string);
  return defs;
};

const HEADING_WITH_ID = 'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]';

const collectHeadingIds = (preview: Element): Set<string> => {
  const ids = new Set<string>();
  for (const h of Array.from(preview.querySelectorAll(HEADING_WITH_ID))) {
    ids.add(h.getAttribute('id') as string);
  }
  return ids;
};

const lintImagesMissingAlt = (preview: Element): Diagnostic[] => {
  const imgs = Array.from(preview.querySelectorAll('img'));
  let count = 0;
  for (const img of imgs) {
    const alt = img.getAttribute('alt');
    if (alt === null || alt.trim() === '') count++;
  }
  if (count === 0) return [];
  return [
    {
      id: 'img-alt-missing',
      severity: 'warn',
      message: `${count} image${count === 1 ? '' : 's'} without alt text`,
    },
  ];
};

const lintTablesWithoutHeader = (preview: Element): Diagnostic[] => {
  const tables = Array.from(preview.querySelectorAll('table'));
  let count = 0;
  for (const table of tables) {
    if (table.querySelector('th') === null) count++;
  }
  if (count === 0) return [];
  return [
    {
      id: 'table-no-header',
      severity: 'warn',
      message: `${count} table${count === 1 ? '' : 's'} without a header row`,
    },
  ];
};

const lintDuplicateSlugs = (preview: Element): Diagnostic[] => {
  const seen = new Map<string, number>();
  for (const h of Array.from(preview.querySelectorAll(HEADING_WITH_ID))) {
    const id = h.getAttribute('id') as string;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const dupes: string[] = [];
  for (const [id, n] of seen) if (n > 1) dupes.push(id);
  if (dupes.length === 0) return [];
  return dupes.map((id) => ({
    id: 'heading-slug-dup',
    severity: 'warn' as const,
    message: `Duplicate heading id "${id}"`,
    targetId: id,
  }));
};

const lintUnbalancedBlockMath = (source: string): Diagnostic[] => {
  const count = countBlockMathDelimiters(source);
  if (count % 2 === 0) return [];
  return [
    {
      id: 'math-block-unbalanced',
      severity: 'warn',
      message: 'Unbalanced $$ math block — an opening $$ is missing its close',
    },
  ];
};

const lintMissingFootnoteDefs = (source: string): Diagnostic[] => {
  const refs = collectFootnoteRefs(source);
  const defs = collectFootnoteDefs(source);
  const missing: string[] = [];
  for (const ref of refs) if (!defs.has(ref)) missing.push(ref);
  return missing.map((label) => ({
    id: 'footnote-def-missing',
    severity: 'warn' as const,
    message: `Footnote [^${label}] has no definition`,
  }));
};

const lintBrokenHeadingRefs = (source: string, heads: Set<string>): Diagnostic[] => {
  const clean = stripFencesAndMath(source);
  const broken = new Set<string>();
  for (const m of clean.matchAll(HEADING_LINK_RE)) {
    const slug = m[1] as string;
    if (!heads.has(slug)) broken.add(slug);
  }
  if (broken.size === 0) return [];
  return Array.from(broken).map((slug) => ({
    id: 'heading-ref-broken',
    severity: 'warn' as const,
    message: `Link to #${slug} — no heading with that id`,
    targetId: slug,
  }));
};

const WCAG_AA_NORMAL = 4.5;

// Split a `style="a:b; c:d"` string into a lowercased property→value map.
// Values keep their original case so hex strings round-trip for messages.
const parseStyleDecls = (style: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (prop && value) out.set(prop, value);
  }
  return out;
};

const extractBackgroundColor = (decls: Map<string, string>): string | undefined => {
  const direct = decls.get('background-color');
  if (direct) return direct;
  const shorthand = decls.get('background');
  if (!shorthand) return undefined;
  // Pull a leading color token out of the `background` shorthand. Supports
  // #hex, rgb(...) / rgba(...), and hsl(...) — enough for Atlassian panels
  // and hand-authored inline styles.
  const fn = shorthand.match(/(rgba?|hsla?)\s*\([^)]*\)/i);
  if (fn) return fn[0];
  const hex = shorthand.match(/#[0-9a-fA-F]{3,8}\b/);
  if (hex) return hex[0];
  return undefined;
};

const lintLowContrast = (preview: Element): Diagnostic[] => {
  const diags: Diagnostic[] = [];
  // `[style]` selects only elements with an inline style attribute; closest('svg')
  // lets us skip mermaid / icon svg internals where `fill=` is not in `style`.
  for (const el of Array.from(preview.querySelectorAll('[style]'))) {
    if (el.closest('svg')) continue;
    // `[style]` selector guarantees the attribute is present and non-null.
    const style = el.getAttribute('style') as string;
    const decls = parseStyleDecls(style);
    const fg = decls.get('color');
    const bg = extractBackgroundColor(decls);
    if (!fg || !bg) continue;
    const fgRgb: Rgb | null = parseColor(fg);
    const bgRgb: Rgb | null = parseColor(bg);
    if (!fgRgb || !bgRgb) continue;
    const ratio = contrastRatio(fgRgb, bgRgb);
    if (ratio >= WCAG_AA_NORMAL) continue;
    diags.push({
      id: 'contrast-low',
      severity: 'warn',
      message: `Low contrast ${ratio.toFixed(2)}:1 — color ${fg} on background ${bg} fails WCAG AA (needs 4.5:1)`,
    });
  }
  return diags;
};

export const lint = ({ source, preview, flavor: _flavor }: LintInput): Diagnostic[] => {
  const heads = collectHeadingIds(preview);
  return [
    ...lintImagesMissingAlt(preview),
    ...lintTablesWithoutHeader(preview),
    ...lintDuplicateSlugs(preview),
    ...lintUnbalancedBlockMath(source),
    ...lintMissingFootnoteDefs(source),
    ...lintBrokenHeadingRefs(source, heads),
    ...lintLowContrast(preview),
  ];
};
