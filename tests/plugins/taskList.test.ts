import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginTaskList } from '../../src/plugins/taskList.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginTaskList(md);
  return md;
};

describe('pluginTaskList', () => {
  it('renders checked task items with checked+disabled input', () => {
    const html = build().render('- [x] done\n- [ ] todo');
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" checked disabled>');
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled>');
  });

  it('accepts uppercase X as checked', () => {
    const html = build().render('- [X] shout');
    expect(html).toContain('checked disabled');
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
});
