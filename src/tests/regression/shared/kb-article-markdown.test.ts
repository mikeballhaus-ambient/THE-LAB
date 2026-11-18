import { describe, expect, test } from '@jest/globals';
import {
  parseKbSectionHeading,
  renderKbArticleMarkdown,
  sanitizeKbSectionPrimeIconClasses,
  stripKbSectionIconSnippetsFromMarkdown,
  wrapKbArticleSections,
} from '@/shared/utils/kb-article-markdown';

describe('kb-article-markdown', () => {
  test('parseKbSectionHeading reads optional {{pi …}} suffix', () => {
    expect(parseKbSectionHeading('Overview{{pi pi-info-circle}}')).toEqual({
      title: 'Overview',
      iconClass: 'pi pi-info-circle',
    });
    expect(parseKbSectionHeading('Plain section')).toEqual({
      title: 'Plain section',
      iconClass: null,
    });
    expect(sanitizeKbSectionPrimeIconClasses('fa fa-star')).toBeNull();
  });

  test('wrapKbArticleSections omits icon chip when snippet is absent', () => {
    const html = '<p>Lead</p><h2>Overview</h2><p>Body</p>';
    const out = wrapKbArticleSections(html);
    expect(out).toContain('kb-article-lead');
    expect(out).toContain('lab-form-section');
    expect(out).not.toContain('lab-form-section__icon');
    expect(out).not.toContain('<h2');
    expect(out).toContain('Overview');
  });

  test('wrapKbArticleSections renders icon from heading snippet', () => {
    const html =
      '<h2>Overview{{pi pi-info-circle}}</h2><p>Body</p><h2>Tips{{pi pi-lightbulb}}</h2><p>More</p>';
    const out = wrapKbArticleSections(html);
    expect(out).toContain('lab-form-section__icon');
    expect(out).toContain('pi pi-info-circle');
    expect(out).toContain('pi pi-lightbulb');
    expect(out).not.toContain('{{pi');
  });

  test('stripKbSectionIconSnippetsFromMarkdown cleans ## lines for agents', () => {
    const md = '## Overview{{pi pi-info-circle}}\n\nText';
    expect(stripKbSectionIconSnippetsFromMarkdown(md)).toBe('## Overview\n\nText');
  });

  test('renderKbArticleMarkdown is exported for the reader (browser sanitizes via DOMPurify)', () => {
    expect(typeof renderKbArticleMarkdown).toBe('function');
  });
});
