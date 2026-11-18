import DOMPurify from 'dompurify';

/** Sanitize agent/tool HTML before `v-html` (Phase 1.9 / 1.29). */
export function sanitizeLabHtml(html: string): string {
  if (!html) {
    return '';
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['class', 'id', 'target', 'rel', 'colspan', 'rowspan'],
  });
}
