import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

export const CALLOUT_ICONS: Record<string, string> = {
  note: 'ℹ',
  tip: '💡',
  hint: '💡',
  warning: '⚠',
  caution: '⚠',
  attention: '⚠',
  danger: '⛔',
  error: '⛔',
  bug: '🐛',
  failure: '❌',
  fail: '❌',
  missing: '❌',
  info: 'ℹ',
  todo: '📋',
  abstract: '📄',
  summary: '📄',
  tldr: '📄',
  example: '📌',
  quote: '💬',
  cite: '💬',
  success: '✅',
  check: '✅',
  done: '✅',
  question: '❓',
  help: '❓',
  faq: '❓',
};

const CALLOUT_HEADER_RE = /^\[!([\w-]+)\][ \t]*(.*)/;
const CALLOUT_STRIP_RE = /^\[!([\w-]+)\][ \t]*.*\n?/;

interface CalloutMeta {
  callout: true;
  type: string;
  title: string;
}

const hasCalloutMeta = (token: Token): token is Token & { meta: CalloutMeta } =>
  token.meta !== null &&
  typeof token.meta === 'object' &&
  (token.meta as Partial<CalloutMeta>).callout === true;

const findInlineTokenIndex = (tokens: readonly Token[], start: number, level: number): number => {
  for (let j = start; j < tokens.length; j++) {
    const token = tokens[j]!;
    if (token.type === 'blockquote_close' && token.level === level) break;
    if (token.type === 'inline') return j;
  }
  return -1;
};

const parseCalloutHeader = (content: string): { type: string; title: string } | null => {
  const match = content.match(CALLOUT_HEADER_RE);
  if (!match) return null;
  const type = match[1]!.toLowerCase();
  const rawTitle = match[2]!.trim();
  const title = rawTitle.length > 0 ? rawTitle : type.charAt(0).toUpperCase() + type.slice(1);
  return { type, title };
};

export const pluginObsidianCallouts = (md: MarkdownIt): void => {
  md.core.ruler.before('inline', 'obsidian_callouts', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!;
      if (open.type !== 'blockquote_open') continue;

      const inlineIdx = findInlineTokenIndex(tokens, i + 1, open.level);
      if (inlineIdx < 0) continue;

      const inline = tokens[inlineIdx]!;
      const parsed = parseCalloutHeader(inline.content);
      if (!parsed) continue;

      inline.content = inline.content.replace(CALLOUT_STRIP_RE, '');
      open.meta = { callout: true, ...parsed } satisfies CalloutMeta;
    }
  });

  const origOpen = md.renderer.rules.blockquote_open;
  const origClose = md.renderer.rules.blockquote_close;

  md.renderer.rules.blockquote_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]!;
    if (hasCalloutMeta(token)) {
      const { type, title } = token.meta;
      const icon = CALLOUT_ICONS[type] ?? 'ℹ';
      return `<div class="callout callout-${type}"><div class="callout-title"><span class="callout-icon">${icon}</span> ${md.utils.escapeHtml(title)}</div><div class="callout-body">`;
    }
    return origOpen ? origOpen(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };

  md.renderer.rules.blockquote_close = (tokens, idx, opts, env, self) => {
    const closeLevel = tokens[idx]!.level;
    for (let j = idx - 1; j >= 0; j--) {
      const token = tokens[j]!;
      if (token.type === 'blockquote_open' && token.level === closeLevel) {
        if (hasCalloutMeta(token)) return '</div></div>';
        break;
      }
    }
    return origClose
      ? origClose(tokens, idx, opts, env, self)
      : self.renderToken(tokens, idx, opts);
  };
};
