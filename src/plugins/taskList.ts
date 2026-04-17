import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

const TASK_RE = /^\[([ xX])\]\s/;

export const pluginTaskList = (md: MarkdownIt): void => {
  md.core.ruler.after('inline', 'task_lists', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (!token || token.type !== 'inline') continue;
      const content = token.content;
      if (!TASK_RE.test(content)) continue;

      const checked = content[1] !== ' ';
      token.content = content.slice(4);
      const parsed = md.parseInline(token.content, state.env);
      // parseInline always returns a single wrapper token with a children array
      token.children = parsed[0]!.children;

      for (let j = i - 1; j >= 0; j--) {
        const prev = state.tokens[j];
        if (prev?.type === 'list_item_open') {
          prev.meta = { checked, line: prev.map?.[0] };
          break;
        }
      }
      for (let j = i - 1; j >= 0; j--) {
        const prev = state.tokens[j];
        if (prev?.type === 'bullet_list_open') {
          prev.attrSet('class', 'task-list');
          break;
        }
      }
    }
  });

  const origRule = md.renderer.rules.list_item_open;
  md.renderer.rules.list_item_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx] as Token | undefined;
    const meta = token?.meta as { checked?: boolean; line?: number } | undefined;
    if (meta?.checked !== undefined) {
      const checkedAttr = meta.checked ? ' checked' : '';
      const lineAttr = typeof meta.line === 'number' ? ` data-task-line="${meta.line}"` : '';
      return `<li class="task-list-item"><input type="checkbox"${checkedAttr}${lineAttr}> `;
    }
    return origRule ? origRule(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
};
