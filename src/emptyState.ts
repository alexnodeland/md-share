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

/** First-run preview: what this is, how to start, and one-click samples. */
export const renderEmptyState = (samples: readonly SampleKey[] = EMPTY_STATE_SAMPLES): string => {
  const buttons = samples
    .map(
      (key) =>
        `<button type="button" class="preview-empty-sample" data-sample="${key}">${escapeHtml(SAMPLE_LABELS[key])}</button>`,
    )
    .join('');
  return [
    '<div class="preview-empty">',
    '<p class="preview-empty-title">Nothing to preview yet</p>',
    '<p>Type or paste in the editor, drop a <code>.md</code> or Word <code>.docx</code> file anywhere, or use Open.</p>',
    `<p class="preview-empty-samples">Or start from a sample: ${buttons}</p>`,
    '<p class="preview-empty-note">Nothing leaves your browser. Share puts the whole document inside the link.</p>',
    '</div>',
  ].join('');
};
