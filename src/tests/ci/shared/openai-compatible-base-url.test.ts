import { describe, expect, test } from '@jest/globals';
import {
  normalizeOpenAiCompatibleBaseUrl,
  sanitizeLmStudioBaseUrl,
} from '@/shared/utils/openai-compatible-base-url';

describe('normalizeOpenAiCompatibleBaseUrl', () => {
  test('uses configured URL as-is (no /v1 injection)', () => {
    expect(normalizeOpenAiCompatibleBaseUrl('http://10.0.0.216:1234')).toBe('http://10.0.0.216:1234');
    expect(normalizeOpenAiCompatibleBaseUrl('http://10.0.0.216:1234/v1')).toBe('http://10.0.0.216:1234/v1');
    expect(normalizeOpenAiCompatibleBaseUrl('http://127.0.0.1:1234/v1/')).toBe('http://127.0.0.1:1234/v1');
  });

  test('defaults empty to OpenAI cloud seed URL', () => {
    expect(normalizeOpenAiCompatibleBaseUrl('')).toBe('https://api.openai.com/v1');
  });
});

describe('sanitizeLmStudioBaseUrl', () => {
  test('keeps LM Studio server root without /v1', () => {
    expect(sanitizeLmStudioBaseUrl('http://10.0.0.216:1234')).toBe('http://10.0.0.216:1234');
    expect(sanitizeLmStudioBaseUrl('http://10.0.0.216:1234/')).toBe('http://10.0.0.216:1234');
  });

  test('strips mistaken /v1 suffix from stored URL', () => {
    expect(sanitizeLmStudioBaseUrl('http://10.0.0.216:1234/v1')).toBe('http://10.0.0.216:1234');
  });
});
