import { afterEach, describe, expect, test } from '@jest/globals';
import { getMcpToolUiDelayMs } from '@/shared/config/lab-mcp-tool-ui-delay';

describe('lab-mcp-tool-ui-delay (2.27)', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  test('defaults to 100ms', () => {
    delete process.env.LAB_MCP_TOOL_UI_DELAY_MS;
    expect(getMcpToolUiDelayMs()).toBe(100);
  });

  test('reads LAB_MCP_TOOL_UI_DELAY_MS', () => {
    process.env.LAB_MCP_TOOL_UI_DELAY_MS = '250';
    expect(getMcpToolUiDelayMs()).toBe(250);
  });
});
