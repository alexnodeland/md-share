import { escapeHtml } from './escapeHtml.ts';
import { SAMPLE_LABELS, type SampleKey } from './samples.ts';

/** The samples offered on the empty preview — one per distinct capability. */
export const EMPTY_STATE_SAMPLES: readonly SampleKey[] = [
  'gfm',
  'obsidian',
  'academic',
  'atlassian',
  'presentation',
];

/**
 * First-run preview: what this is for, how to start, and one-click samples.
 * On phones it's the first screen, so it carries its own way into the editor.
 */
export const renderEmptyState = (samples: readonly SampleKey[] = EMPTY_STATE_SAMPLES): string => {
  const buttons = samples
    .map(
      (key) =>
        `<button type="button" class="preview-empty-sample" data-sample="${key}">${escapeHtml(SAMPLE_LABELS[key])}</button>`,
    )
    .join('');
  return [
    '<div class="preview-empty">',
    '<p class="preview-empty-title">Paste Markdown from anywhere</p>',
    '<p>GitHub, Obsidian, Confluence, Word, Google Docs — it renders the way it was written. Or drop a <code>.md</code> or <code>.docx</code> file anywhere, or use Open.</p>',
    '<p class="mobile-only"><button type="button" class="preview-empty-start" data-start-writing>Start writing</button></p>',
    `<p class="preview-empty-samples">See what it does: ${buttons}</p>`,
    '<p class="preview-empty-note">Nothing leaves your browser. Share puts the whole document inside the link.</p>',
    '</div>',
  ].join('');
};
