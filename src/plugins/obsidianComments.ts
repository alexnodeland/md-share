import type MarkdownIt from 'markdown-it';

const COMMENT_RE = /%%[\s\S]*?%%/g;

export const pluginObsidianComments = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'strip_comments', (state) => {
    state.src = state.src.replace(COMMENT_RE, '');
  });
};
