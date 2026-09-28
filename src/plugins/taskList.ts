import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { RenderEnv } from '../types.ts';

const TASK_RE = /^\[([ xX])\]\s/;

interface TaskMeta {
  checked: boolean;
  /** Source line of the item in the editor (frontmatter included). */
  line: number;
}

const isTaskMeta = (meta: unknown): meta is TaskMeta =>
  typeof (meta as TaskMeta | null)?.checked === 'boolean';

export const pluginTaskList = (md: MarkdownIt): void => {
  md.core.ruler.after('inline', 'task_lists', (state) => {
    const offset = (state.env as RenderEnv).lineOffset ?? 0;
    const tokens = state.tokens;
    const lists: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open')
        lists.push(token);
      if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') lists.pop();
      // Only the first paragraph of a list item can carry the task marker.
      if (
        token.type !== 'inline' ||
        tokens[i - 1]?.type !== 'paragraph_open' ||
        tokens[i - 2]?.type !== 'list_item_open' ||
        !TASK_RE.test(token.content)
      ) {
        continue;
      }
      const item = tokens[i - 2]!;
      const checked = token.content[1] !== ' ';
      token.content = token.content.slice(4);
      // parseInline always returns a single wrapper token with a children array
      token.children = md.parseInline(token.content, state.env)[0]!.children;
      item.meta = { checked, line: item.map![0] + offset } satisfies TaskMeta;
      lists.at(-1)!.attrSet('class', 'task-list');
    }
  });

  const origRule = md.renderer.rules.list_item_open;
  md.renderer.rules.list_item_open = (tokens, idx, opts, env, self) => {
    const meta: unknown = tokens[idx]!.meta;
    if (isTaskMeta(meta)) {
      const checkedAttr = meta.checked ? ' checked' : '';
      return `<li class="task-list-item"><input type="checkbox"${checkedAttr} data-task-line="${meta.line}"> `;
    }
    return origRule ? origRule(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
};
