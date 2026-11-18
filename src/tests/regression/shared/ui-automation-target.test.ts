import { describe, expect, test } from '@jest/globals';
import { elementActionSchemaFields } from '@/shared/types/schemas/ui-automation-schema';
import { buildUiAutomationDiscoveryTarget } from '@/shared/utils/ui-automation-target';
import {
  LAB_CATALOG_LAUNCH_ACTION_ATTR,
  LAB_CATALOG_LAUNCH_ACTION_VALUE,
} from '@/shared/constants/lab-shell-ui-automation';

function mockButton(attrs: Record<string, string>): HTMLElement {
  return {
    tagName: 'BUTTON',
    id: attrs.id ?? '',
    classList: [] as unknown as DOMTokenList,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    getAttribute: (name: string) => attrs[name] ?? null,
  } as unknown as HTMLElement;
}

describe('ui-automation-target schema', () => {
  test('element_action accepts elementRef without target', () => {
    const parsed = elementActionSchemaFields.safeParse({
      sessionId: 's1',
      persona: 'Chat',
      actions: [{ order: 1, elementRef: 'ui-abc', action: 'click' }],
    });
    expect(parsed.success).toBe(true);
  });

  test('element_action rejects missing target and elementRef', () => {
    const parsed = elementActionSchemaFields.safeParse({
      sessionId: 's1',
      persona: 'Chat',
      actions: [{ order: 1, action: 'click' }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('buildUiAutomationDiscoveryTarget', () => {
  test('catalog launch uses stable data-app-id selector', () => {
    const el = mockButton({
      'data-app-id': 'app-lab-workflow-studio',
      [LAB_CATALOG_LAUNCH_ACTION_ATTR]: LAB_CATALOG_LAUNCH_ACTION_VALUE,
    });
    expect(buildUiAutomationDiscoveryTarget(el)).toBe(
      'button[data-app-id="app-lab-workflow-studio"][data-lab-catalog-action="launch"]',
    );
  });
});
