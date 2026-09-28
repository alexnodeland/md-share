import { escapeHtml } from './escapeHtml.ts';

export const buildMermaidError = (source: string, message: string): string => {
  const cleanMsg = message.replace(/^Error:\s*/i, '').trim();
  const msg = escapeHtml(cleanMsg || 'Diagram could not be rendered');
  const src = escapeHtml(source.trim());
  return `<div class="render-error"><strong>Mermaid render failed</strong><pre>${msg}</pre>${src ? `<pre class="render-error-src">${src}</pre>` : ''}</div>`;
};
