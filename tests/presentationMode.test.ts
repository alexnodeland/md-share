// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { initPresentationMode } from '../src/ui/presentationMode.ts';

const mount = (editorVisible: boolean, previewVisible: boolean): HTMLElement => {
  document.body.innerHTML = `
    <section id="editor-pane" class="editor-pane${editorVisible ? ' mobile-visible' : ''}"></section>
    <section id="preview-pane" class="preview-pane${previewVisible ? ' mobile-visible' : ''}">
      <div id="preview">
        <h1>Slide one</h1>
        <hr />
        <h2>Slide two</h2>
      </div>
    </section>
    <button id="btn-present-exit" type="button">×</button>
  `;
  return document.getElementById('preview') as HTMLElement;
};

describe('initPresentationMode', () => {
  it('forces preview visible on enter and restores prior mobile view on exit', () => {
    const previewRoot = mount(true, false);
    const rerender = vi.fn();
    const presentation = initPresentationMode({
      getPreviewRoot: () => previewRoot,
      rerender,
    });

    const editorPane = document.getElementById('editor-pane');
    const previewPane = document.getElementById('preview-pane');
    if (!editorPane || !previewPane) throw new Error('expected panes');

    presentation.enter();

    expect(document.documentElement.dataset.presenting).toBe('true');
    expect(editorPane.classList.contains('mobile-visible')).toBe(false);
    expect(previewPane.classList.contains('mobile-visible')).toBe(true);

    presentation.exit();

    expect(document.documentElement.dataset.presenting).toBeUndefined();
    expect(editorPane.classList.contains('mobile-visible')).toBe(true);
    expect(previewPane.classList.contains('mobile-visible')).toBe(false);
    expect(rerender).toHaveBeenCalledTimes(1);
  });
});
