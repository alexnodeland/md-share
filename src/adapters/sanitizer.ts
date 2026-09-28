import DOMPurify from 'dompurify';
import type { Sanitizer } from '../ports.ts';

const HEADING_RE = /^H[1-6]$/;

// DOMPurify drops ids that shadow `document` properties (clobbering defense).
// That would strip anchors from headings like "## Links" or "## Title". Heading
// elements are never exposed as named properties on `document`, so their ids
// are safe to keep.
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'id' && HEADING_RE.test(node.nodeName)) data.forceKeepAttr = true;
});

export const browserSanitizer: Sanitizer = {
  // `target` is added by the safeLinks plugin (always paired with rel=noopener).
  sanitize: (html) => DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }),
};
