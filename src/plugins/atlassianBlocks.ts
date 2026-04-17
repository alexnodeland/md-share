import type MarkdownIt from 'markdown-it';

const PANEL_TYPES = ['info', 'note', 'warning', 'tip', 'error'] as const;

const renderPanel = (
  md: MarkdownIt,
  type: string,
  title: string | undefined,
  body: string,
): string => {
  const safeTitle = md.utils.escapeHtml(title && title.length > 0 ? title : type);
  return `\n<div class="atl-panel atl-panel-${type}"><div class="atl-panel-title">${safeTitle}</div>\n\n${body.trim()}\n\n</div>\n`;
};

const renderExpand = (md: MarkdownIt, title: string | undefined, body: string): string => {
  const safeTitle = md.utils.escapeHtml(title && title.length > 0 ? title : 'Click to expand');
  return `\n<details class="atl-expand"><summary>${safeTitle}</summary><div class="expand-body">\n\n${body.trim()}\n\n</div></details>\n`;
};

const renderCodeFence = (lang: string | undefined, code: string): string =>
  `\n\`\`\`${lang ?? ''}\n${code.trim()}\n\`\`\`\n`;

export const pluginAtlassianBlocks = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'atl_blocks', (state) => {
    let src = state.src;

    for (const type of PANEL_TYPES) {
      const re = new RegExp(`\\{${type}(?::title=([^}]*))?\\}([\\s\\S]*?)\\{${type}\\}`, 'gi');
      src = src.replace(re, (_match, title: string | undefined, body: string) =>
        renderPanel(md, type, title, body),
      );
    }

    src = src.replace(
      /\{expand(?::([^}]*))?\}([\s\S]*?)\{expand\}/gi,
      (_match, title: string | undefined, body: string) => renderExpand(md, title, body),
    );

    src = src.replace(
      /\{code(?::(\w+))?\}([\s\S]*?)\{code\}/gi,
      (_match, lang: string | undefined, code: string) => renderCodeFence(lang, code),
    );

    state.src = src;
  });
};
