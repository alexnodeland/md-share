import type MarkdownIt from 'markdown-it';

export const EMOJI_DATA: Record<string, string> = {
  smile: '😄',
  grin: '😁',
  joy: '😂',
  heart: '❤️',
  fire: '🔥',
  rocket: '🚀',
  tada: '🎉',
  check: '✅',
  x: '❌',
  thumbsup: '👍',
  thumbsdown: '👎',
  eyes: '👀',
  thinking: '🤔',
  bulb: '💡',
  warning: '⚠️',
  info: 'ℹ️',
  star: '⭐',
  sparkles: '✨',
  bomb: '💣',
  pencil: '✏️',
  book: '📖',
  key: '🔑',
  lock: '🔒',
  unlock: '🔓',
  moon: '🌙',
  sun: '☀️',
  cloud: '☁️',
  zap: '⚡',
  wave: '👋',
  coffee: '☕',
  cake: '🍰',
  clap: '👏',
  party: '🥳',
  bug: '🐛',
  hammer: '🔨',
};

const SHORTCODE_RE = /^[a-z0-9_+-]+$/i;

export const pluginEmoji = (md: MarkdownIt, data: Record<string, string>): void => {
  md.inline.ruler.after('emphasis', 'emoji', (state, silent) => {
    if (state.src[state.pos] !== ':') return false;
    const end = state.src.indexOf(':', state.pos + 1);
    if (end < 0) return false;
    const name = state.src.slice(state.pos + 1, end);
    if (name.length === 0) return false;
    if (!SHORTCODE_RE.test(name)) return false;
    const value = data[name];
    if (value === undefined) return false;
    if (!silent) {
      const token = state.push('emoji', '', 0);
      token.content = value;
      token.markup = name;
    }
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.emoji = (tokens, idx) => md.utils.escapeHtml(tokens[idx]!.content);
};
