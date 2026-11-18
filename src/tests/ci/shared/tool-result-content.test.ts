import { describe, expect, test } from '@jest/globals';
import {
  htmlResponseToPlainText,
  truncateToolResultContent,
} from '@/shared/utils/tool-result-content';

describe('tool-result-content', () => {
  test('truncateToolResultContent appends notice when over limit', () => {
    const raw = 'x'.repeat(100);
    const out = truncateToolResultContent(raw, 50);
    expect(out.length).toBeLessThanOrEqual(50 + 200);
    expect(out).toContain('[Tool result truncated');
  });

  test('htmlResponseToPlainText removes tags', () => {
    const text = htmlResponseToPlainText(
      '<!doctype html><html><head><title>Example</title></head><body><p>Hello</p></body></html>',
    );
    expect(text).toContain('Example');
    expect(text).toContain('Hello');
    expect(text).not.toContain('<p>');
  });
});
