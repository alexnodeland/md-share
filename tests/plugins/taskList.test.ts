import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginTaskList } from '../../src/plugins/taskList.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginTaskList(md);
  return md;
};

describe('pluginTaskList', () => {
  it('renders task items with interactive checkboxes carrying the source line', () => {
    const html = build().render('- [x] done\n- [ ] todo');
    expect(html).toContain(
      '<li class="task-list-item"><input type="checkbox" checked data-task-line="0">',
    );
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" data-task-line="1">');
    expect(html).not.toContain('disabled');
  });

  it('accepts uppercase X as checked', () => {
    const html = build().render('- [X] shout');
    expect(html).toContain('checked data-task-line="0"');
  });

  it('adds task-list class to the enclosing ul', () => {
    const html = build().render('- [ ] one\n- [x] two');
    expect(html).toContain('<ul class="task-list">');
  });

  it('leaves plain bullet items untouched', () => {
    const html = build().render('- plain item');
    expect(html).not.toContain('task-list-item');
    expect(html).not.toContain('class="task-list"');
  });

  it('strips the "[x] " prefix from the item text', () => {
    const html = build().render('- [x] Finish migration');
    expect(html).toContain('Finish migration');
    expect(html).not.toContain('[x] Finish');
  });

  it('omits data-task-line when source map information is unavailable', () => {
    const md = new MarkdownIt({ html: true });
    pluginTaskList(md);
    md.core.ruler.after('task_lists', 'strip_line', (state) => {
      for (const token of state.tokens) {
        if (token.type === 'list_item_open' && token.meta) token.meta.line = undefined;
      }
    });
    const html = md.render('- [x] thing');
    expect(html).toContain('<input type="checkbox" checked>');
    expect(html).not.toContain('data-task-line');
  });

  it('composes with an existing list_item_open rule', () => {
    const md = new MarkdownIt({ html: true });
    md.renderer.rules.list_item_open = (tokens, idx, opts, _env, self) =>
      `<!--prior-->${self.renderToken(tokens, idx, opts)}`;
    pluginTaskList(md);
    const html = md.render('- plain');
    expect(html).toContain('<!--prior-->');
  });
});
