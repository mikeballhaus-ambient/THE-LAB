import { describe, expect, test } from '@jest/globals';
import {
  hasVueBoundClickHandler,
  isLikelyPassiveLayoutShell,
  isUiAutomationDiscoverCandidate,
  pruneNestedDiscoverMatches,
  refineDiscoverMatchesByUiRole,
} from '@/shared/utils/ui-automation-discover-candidates';

function mockEl(partial: Record<string, unknown>): HTMLElement {
  return partial as unknown as HTMLElement;
}

describe('ui-automation-discover-candidates', () => {
  test('rejects tabindex-only list shells', () => {
    const div = mockEl({
      tagName: 'DIV',
      classList: {
        contains: (c: string) => c === 'lab-workflows-list' || c === 'p-tabpanel',
      },
      matches: () => false,
      getAttribute: (name: string) => (name === 'tabindex' ? '0' : null),
      textContent: 'My workflows '.repeat(40),
      querySelector: () => ({}),
      onclick: null,
      hasAttribute: () => false,
    });
    expect(isLikelyPassiveLayoutShell(div)).toBe(true);
    expect(isUiAutomationDiscoverCandidate(div)).toBe(false);
  });

  test('accepts div with Vue onClick invoker', () => {
    const div = mockEl({
      tagName: 'DIV',
      classList: { contains: () => false },
      matches: () => false,
      getAttribute: () => null,
      textContent: 'Open form',
      querySelector: () => null,
      onclick: null,
      hasAttribute: () => false,
      _vei: { onClick: () => undefined },
    });
    expect(hasVueBoundClickHandler(div)).toBe(true);
    expect(isUiAutomationDiscoverCandidate(div)).toBe(true);
  });

  test('accepts cursor-pointer div when not a passive shell', () => {
    const div = mockEl({
      tagName: 'DIV',
      classList: { contains: (c: string) => c === 'cursor-pointer' },
      matches: () => false,
      getAttribute: () => null,
      textContent: 'Form alpha',
      querySelector: () => null,
      onclick: null,
      hasAttribute: () => false,
    });
    expect(isUiAutomationDiscoverCandidate(div)).toBe(true);
  });

  test('accepts buttons and record-action controls', () => {
    const button = mockEl({
      tagName: 'BUTTON',
      classList: { contains: () => false },
      matches: () => false,
      getAttribute: (name: string) =>
        (name === 'data-lab-record-action' ? 'edit' : name === 'data-lab-record-id' ? '1' : null),
      hasAttribute: () => false,
    });
    expect(isUiAutomationDiscoverCandidate(button)).toBe(true);
  });

  test('refineDiscoverMatchesByUiRole keeps record actions only', () => {
    const shell = mockEl({
      tagName: 'DIV',
      classList: { contains: () => false },
      matches: () => false,
      getAttribute: () => null,
      hasAttribute: () => false,
    });
    const edit = mockEl({
      tagName: 'BUTTON',
      classList: { contains: () => false },
      matches: () => false,
      getAttribute: (name: string) =>
        (name === 'data-lab-record-action' ? 'edit' : name === 'data-lab-record-id' ? '1' : null),
      hasAttribute: () => false,
    });
    expect(refineDiscoverMatchesByUiRole([shell, edit])).toEqual([edit]);
  });

  test('pruneNestedDiscoverMatches drops ancestor', () => {
    const child = mockEl({ contains: () => false });
    const parent = mockEl({
      contains: (other: unknown) => other === child,
    });
    expect(pruneNestedDiscoverMatches([parent, child])).toEqual([child]);
  });
});
