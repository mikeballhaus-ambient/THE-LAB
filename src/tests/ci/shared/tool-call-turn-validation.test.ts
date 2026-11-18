import { describe, expect, test } from '@jest/globals';
import {
  mergeToolCallValidationFailure,
  validateToolCallsForExecution,
} from '@/shared/utils/tool-call-turn-validation';
import type { MCPToolCall } from '@/shared/types';

const MALFORMED_UI_AUTOMATION: MCPToolCall[] = [
  {
    id: '4k9fZQh8LpRvT2nX6mY7sW1eC3bA5dJ0',
    type: 'function',
    function: {
      name: 'ui_automation_element_action',
      arguments: '{"actions":[{"order":1,"target":"button[data-pc-name=pcclosebutton]',
    },
  },
];

describe('validateToolCallsForExecution', () => {
  test('rejects malformed ui_automation JSON', () => {
    const result = validateToolCallsForExecution(MALFORMED_UI_AUTOMATION);
    expect(result.executable).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.toolName).toBe('ui_automation_element_action');
    expect(result.rejected[0]?.error).toContain('JSON');
  });

  test('mergeToolCallValidationFailure marks invalid for agent retry', () => {
    const merged = mergeToolCallValidationFailure(
      { invalidToolCallExtracted: false, invalidToolCallError: '', invalidToolCallOriginalJson: '' },
      validateToolCallsForExecution(MALFORMED_UI_AUTOMATION).rejected,
    );
    expect(merged.invalidToolCallExtracted).toBe(true);
    expect(merged.invalidToolCallError).toContain('ui_automation_element_action');
    expect(merged.invalidToolCallOriginalJson).toContain('pcclosebutton');
  });
});
