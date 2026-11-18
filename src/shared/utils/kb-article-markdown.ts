import { renderLabMarkdown, type RenderLabMarkdownOptions } from '@/shared/utils/render-lab-markdown';

/** Optional icon on `##` headings: `## Title{{pi pi-info-circle}}` (snippet stripped from visible title). */
const KB_SECTION_ICON_SNIPPET_SUFFIX = /\s*\{\{([^}]+)\}\}\s*$/;

/** Allow PrimeIcons class lists only (`pi pi-info-circle`). */
export function sanitizeKbSectionPrimeIconClasses(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    if (token !== 'pi' && !/^pi-[a-z0-9-]+$/i.test(token)) {
      return null;
    }
  }
  if (!tokens.some((token) => token.startsWith('pi-'))) {
    return null;
  }
  return tokens.join(' ');
}

/** Remove `{{pi …}}` suffixes from markdown `##` lines (for agents / plain-text consumers). */
export function stripKbSectionIconSnippetsFromMarkdown(markdown: string): string {
  return markdown.replace(/^(##\s+)(.+)$/gm, (_line, prefix: string, heading: string) => {
    const { title } = parseKbSectionHeading(heading.trim());
    return `${prefix}${title}`;
  });
}

export function parseKbSectionHeading(plainTitle: string): {
  title: string;
  iconClass: string | null;
} {
  const match = plainTitle.match(KB_SECTION_ICON_SNIPPET_SUFFIX);
  if (!match) {
    return { title: plainTitle.trim(), iconClass: null };
  }
  const iconClass = sanitizeKbSectionPrimeIconClasses(match[1]);
  const title = plainTitle.slice(0, match.index).trim();
  return { title, iconClass };
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function stripIconSnippetFromHtml(titleHtml: string): string {
  return titleHtml.replace(/\s*\{\{[^}]+\}\}\s*$/i, '').trim();
}

function sectionIconMarkup(iconClass: string | null): string {
  if (!iconClass) {
    return '';
  }
  return `<span class="lab-form-section__icon" aria-hidden="true"><i class="${iconClass}"></i></span>`;
}

/**
 * Wrap each rendered `<h2>` block in canonical `lab-form-section` cards (AGENTS §13, no numerals).
 * Section icons come from an optional `{{pi pi-*}}` suffix on the markdown heading only.
 */
export function wrapKbArticleSections(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return '';
  }

  const parts = trimmed.split(/(?=<h2[\s>])/i);
  let leadHtml = '';
  const sectionHtml: string[] = [];

  for (const part of parts) {
    if (!part.trim()) {
      continue;
    }
    const headingMatch = part.match(/^<h2([^>]*)>([\s\S]*?)<\/h2>/i);
    if (!headingMatch) {
      leadHtml += part;
      continue;
    }

    const titleHtml = headingMatch[2];
    const plainTitle = stripHtmlTags(titleHtml);
    const { iconClass } = parseKbSectionHeading(plainTitle);
    const displayTitleHtml = iconClass ? stripIconSnippetFromHtml(titleHtml) : titleHtml;
    const bodyHtml = part.slice(headingMatch[0].length).trim();

    sectionHtml.push(
      `<section class="lab-form-section lab-form-section--nested kb-article-section mb-0">` +
        `<h4 class="lab-form-section__title">` +
        sectionIconMarkup(iconClass) +
        `${displayTitleHtml}</h4>` +
        `<div class="kb-article-section__body">${bodyHtml}</div>` +
        `</section>`,
    );
  }

  const leadBlock =
    leadHtml.trim().length > 0
      ? `<div class="kb-article-lead text-sm text-lab-general-text-muted leading-relaxed">${leadHtml}</div>`
      : '';

  return `<div class="kb-article-layout">${leadBlock}${sectionHtml.join('')}</div>`;
}

export function renderKbArticleMarkdown(
  markdown: string,
  options: RenderLabMarkdownOptions = {},
): string {
  const html = renderLabMarkdown(markdown, { breaks: false, ...options });
  return wrapKbArticleSections(html);
}
