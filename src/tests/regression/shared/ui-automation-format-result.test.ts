import { describe, expect, test } from '@jest/globals';
import { formatUiAutomationToolResult } from '@/shared/composables/mcp/utils/ui-automation-format-result';
import type { MCPToolCall, MCPToolResponse } from '@/shared/types';

const classes = 'tool-result';

describe('formatUiAutomationToolResult', () => {
  test('formats ui_automation_discover_elements without legacy operation field', () => {
    const toolCall: MCPToolCall = {
      id: 'tc-1',
      type: 'function',
      function: {
        name: 'ui_automation_discover_elements',
        arguments: JSON.stringify({
          sessionId: 's1',
          persona: 'Chat',
          contextArea: 'app-list-container',
        }),
      },
    };
    const toolResult: MCPToolResponse = {
      type: 'tool_result',
      tool_call_id: 'tc-1',
      function: 'ui_automation_discover_elements',
      success: true,
      content:
        'Discovered 1 interactive UI elements. Full element data with selector components:\n[{"tag":"button","isInteractive":true,"isVisible":true,"target":"button[data-appname=\\"CRM\\"]"}]',
    };
    const html = formatUiAutomationToolResult(classes, toolCall, toolResult);
    expect(html).toContain('discoverElements');
    expect(html).toContain('app-list-container');
    expect(html).not.toContain('Invalid tool call');
  });

  test('falls back to default formatter for unknown ui automation shape', () => {
    const toolCall: MCPToolCall = {
      id: 'tc-2',
      type: 'function',
      function: { name: 'ui_automation_legacy', arguments: '{}' },
    };
    const toolResult: MCPToolResponse = {
      type: 'tool_result',
      tool_call_id: 'tc-2',
      function: 'ui_automation_legacy',
      success: false,
      content: 'Socket not ready',
    };
    const html = formatUiAutomationToolResult(classes, toolCall, toolResult);
    expect(html).toContain('Socket not ready');
    expect(html).not.toContain('Invalid tool call');
  });
});
