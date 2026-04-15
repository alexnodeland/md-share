import type MarkdownIt from 'markdown-it';

const PANEL_TYPES = ['info', 'note', 'warning', 'tip', 'error'] as const;

const renderPanel = (type: string, title: string | undefined, body: string): string =>
  `\n<div class="atl-panel atl-panel-${type}"><div class="atl-panel-title">${title || type}</div>\n\n${body.trim()}\n\n</div>\n`;

const renderExpand = (title: string | undefined, body: string): string =>
  `\n<details class="atl-expand"><summary>${title || 'Click to expand'}</summary><div class="expand-body">\n\n${body.trim()}\n\n</div></details>\n`;

const renderCodeFence = (lang: string | undefined, code: string): string =>
  `\n\`\`\`${lang ?? ''}\n${code.trim()}\n\`\`\`\n`;

export const pluginAtlassianBlocks = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'atl_blocks', (state) => {
    let src = state.src;

    for (const type of PANEL_TYPES) {
      const re = new RegExp(`\\{${type}(?::title=([^}]*))?\\}([\\s\\S]*?)\\{${type}\\}`, 'gi');
      src = src.replace(re, (_match, title: string | undefined, body: string) =>
        renderPanel(type, title, body),
      );
    }

    src = src.replace(
      /\{expand(?::([^}]*))?\}([\s\S]*?)\{expand\}/gi,
      (_match, title: string | undefined, body: string) => renderExpand(title, body),
    );

    src = src.replace(
      /\{code(?::(\w+))?\}([\s\S]*?)\{code\}/gi,
      (_match, lang: string | undefined, code: string) => renderCodeFence(lang, code),
    );

    state.src = src;
  });
};
