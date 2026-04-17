import { computeScrollTarget } from '../scrollSync.ts';

const LEADER_TIMEOUT_MS = 400;

export interface ScrollSyncDeps {
  editor: HTMLElement;
  preview: HTMLElement;
}

export const initScrollSync = ({ editor, preview }: ScrollSyncDeps): (() => void) => {
  let leader: 'editor' | 'preview' | null = null;
  let leaderTimer: number | undefined;

  const refresh = () => {
    if (leaderTimer !== undefined) window.clearTimeout(leaderTimer);
    leaderTimer = window.setTimeout(() => {
      leader = null;
      leaderTimer = undefined;
    }, LEADER_TIMEOUT_MS);
  };

  const claim = (side: 'editor' | 'preview') => {
    leader = side;
    refresh();
  };

  const onEditorLead = () => claim('editor');
  const onPreviewLead = () => claim('preview');

  const onEditorScroll = () => {
    if (leader !== 'editor') return;
    refresh();
    preview.scrollTop = computeScrollTarget(
      {
        scrollTop: editor.scrollTop,
        scrollHeight: editor.scrollHeight,
        clientHeight: editor.clientHeight,
      },
      { scrollHeight: preview.scrollHeight, clientHeight: preview.clientHeight },
    );
  };

  const onPreviewScroll = () => {
    if (leader !== 'preview') return;
    refresh();
    editor.scrollTop = computeScrollTarget(
      {
        scrollTop: preview.scrollTop,
        scrollHeight: preview.scrollHeight,
        clientHeight: preview.clientHeight,
      },
      { scrollHeight: editor.scrollHeight, clientHeight: editor.clientHeight },
    );
  };

  const leadEvents = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const;
  for (const name of leadEvents) {
    editor.addEventListener(name, onEditorLead, { passive: true });
    preview.addEventListener(name, onPreviewLead, { passive: true });
  }
  editor.addEventListener('scroll', onEditorScroll, { passive: true });
  preview.addEventListener('scroll', onPreviewScroll, { passive: true });

  return () => {
    if (leaderTimer !== undefined) window.clearTimeout(leaderTimer);
    for (const name of leadEvents) {
      editor.removeEventListener(name, onEditorLead);
      preview.removeEventListener(name, onPreviewLead);
    }
    editor.removeEventListener('scroll', onEditorScroll);
    preview.removeEventListener('scroll', onPreviewScroll);
  };
};
