import { describe, test, expect } from '@jest/globals';
import { evaluateExternalMcpEnvGaps } from '@/shared/config/lab-external-mcp-env-health.node';

describe('lab-external-mcp-env-health', () => {
  test('reports context7 gap when unset', () => {
    const gaps = evaluateExternalMcpEnvGaps({});
    expect(gaps.some((g) => g.id === 'context7')).toBe(true);
  });

  test('no gaps when optional integrations configured', () => {
    const gaps = evaluateExternalMcpEnvGaps({
      VITE_CONTEXT7_KEY: 'k',
      VITE_WEB_QUERY_BASEURL: 'https://example.com',
      VITE_WEB_QUERY_API_KEY: 'k2',
    });
    expect(gaps).toHaveLength(0);
  });
});
