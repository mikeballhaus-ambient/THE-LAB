import { describe, expect, test } from '@jest/globals';
import {
  buildLabRecordActionTargetSelector,
  elementMatchesUiAutomationSearchPattern,
  isLabRecordActionControl,
  labRecordActionButtonPt,
  labRecordActionRootAttrs,
  readLabRecordActionDiscoverMeta,
} from '@/shared/constants/lab-record-automation';

describe('lab-record-automation', () => {
  test('labRecordActionRootAttrs carries id, action, and name', () => {
    const attrs = labRecordActionRootAttrs('edit', 'wf-1', 'Notify on task');
    expect(attrs['data-lab-record-action']).toBe('edit');
    expect(attrs['data-lab-record-id']).toBe('wf-1');
    expect(attrs['data-lab-record-name']).toBe('Notify on task');
    expect(attrs['aria-label']).toContain('Notify on task');
  });

  test('labRecordActionButtonPt merges id and data attrs', () => {
    const pt = labRecordActionButtonPt((p) => `ui-${p}`, 'polls', 'edit', 9, 'Favourite colour?');
    expect(pt.root.attrs.id).toBe('ui-polls-edit-9');
    expect(pt.root.attrs['data-lab-record-id']).toBe('9');
    expect(pt.root.attrs['data-lab-record-name']).toBe('Favourite colour?');
  });

  test('buildLabRecordActionTargetSelector is stable for agents', () => {
    expect(buildLabRecordActionTargetSelector('button', '42', 'delete')).toBe(
      'button[data-lab-record-id="42"][data-lab-record-action="delete"]',
    );
  });

  test('elementMatchesUiAutomationSearchPattern matches catalog app id and aria-label', () => {
    const attrs: Record<string, string> = {
      'data-app-id': 'app-lab-workflow-studio',
      'aria-label': 'Launch Workflow Studio',
    };
    const el = {
      id: '',
      className: '',
      dataset: {} as DOMStringMap,
      getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;
    expect(
      elementMatchesUiAutomationSearchPattern(el, /workflow studio/i, () => 'Launch'),
    ).toBe(true);
    expect(
      elementMatchesUiAutomationSearchPattern(el, /app-lab-workflow-studio/i, () => undefined),
    ).toBe(true);
  });

  test('readLabRecordActionDiscoverMeta and isLabRecordActionControl', () => {
    const attrs: Record<string, string> = {
      'data-lab-record-id': 'wf-1',
      'data-lab-record-name': 'Demo: webhook',
      'data-lab-record-action': 'edit',
    };
    const el = {
      getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;
    expect(isLabRecordActionControl(el)).toBe(true);
    expect(readLabRecordActionDiscoverMeta(el)).toEqual({
      recordId: 'wf-1',
      recordName: 'Demo: webhook',
      action: 'edit',
    });
  });

  test('elementMatchesUiAutomationSearchPattern matches record name attribute', () => {
    const attrs: Record<string, string> = {
      'data-lab-record-name': 'CRM lead sync',
      'data-lab-record-action': 'edit',
    };
    const el = {
      id: '',
      className: '',
      dataset: {} as DOMStringMap,
      getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;
    const regex = /lead sync/i;
    expect(
      elementMatchesUiAutomationSearchPattern(el, regex, () => undefined),
    ).toBe(true);
  });
});
