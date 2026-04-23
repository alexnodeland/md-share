export interface StandaloneHtmlOptions {
  title: string;
  body: string;
  css: string;
  theme?: 'dark' | 'light';
  lang?: string;
}

const CSP = "default-src 'self' 'unsafe-inline' data:; script-src 'none'; object-src 'none';";

const escapeHtmlAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildStandaloneHtml = (opts: StandaloneHtmlOptions): string => {
  const theme = opts.theme ?? 'dark';
  const lang = opts.lang ?? 'en';
  const safeTitle = escapeHtmlAttr(opts.title);
  return `<!DOCTYPE html>
<html lang="${escapeHtmlAttr(lang)}" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${safeTitle}</title>
<style>${opts.css}</style>
</head>
<body>
<article class="rendered">
${opts.body}
</article>
</body>
</html>
`;
};
