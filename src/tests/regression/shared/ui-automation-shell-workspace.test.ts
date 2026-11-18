import { describe, expect, test } from '@jest/globals';
import {
  buildLabShellActionTargetSelector,
  labShellCloseAppIconAttrs,
  readLabShellActionDiscoverMeta,
  resolveShellActionUiRole,
} from '@/shared/constants/lab-shell-workspace-automation';
import { compileUiAutomationSearchPattern } from '@/shared/utils/ui-automation-search-pattern';
import { matchesUiAutomationDiscoverSearchPattern } from '@/shared/utils/ui-automation-record-row-search';
import { isCatalogLaunchControl } from '@/shared/utils/ui-automation-catalog-discover';

describe('lab shell workspace automation', () => {
  test('close tab attrs match discover searchPattern close', () => {
    const attrs = labShellCloseAppIconAttrs('app-lab-workflow-studio', 'Workflow Studio');
    const el = {
      dataset: {},
      getAttribute: (name: string) => attrs[name] ?? null,
      closest: () => null,
    } as unknown as HTMLElement;
    const compiled = compileUiAutomationSearchPattern('close cancel back exit');
    expect(matchesUiAutomationDiscoverSearchPattern(el, compiled, () => undefined)).toBe(true);
    expect(readLabShellActionDiscoverMeta(el)?.action).toBe('close-app');
    expect(resolveShellActionUiRole('close-app')).toBe('workspace-tab');
    expect(buildLabShellActionTargetSelector('i', 'close-app', 'app-lab-workflow-studio')).toBe(
      'i[data-lab-shell-action="close-app"][data-lab-target-app-id="app-lab-workflow-studio"]',
    );
  });

  test('catalog close-tab rows count as catalog launch role funnel', () => {
    const el = {
      getAttribute: (name: string) => {
        if (name === 'data-lab-catalog-action') return 'close-tab';
        if (name === 'data-app-id') return 'app-lab-crm';
        return null;
      },
      classList: { contains: (c: string) => c === 'lab-catalog-launch' },
    } as unknown as HTMLElement;
    expect(isCatalogLaunchControl(el)).toBe(true);
  });
});
