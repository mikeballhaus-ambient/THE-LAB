import { describe, expect, test } from '@jest/globals';
import { compileUiAutomationSearchPattern } from '@/shared/utils/ui-automation-search-pattern';
import {
  buildUiAutomationSearchHaystack,
  matchesUiAutomationDiscoverSearchPattern,
  rankUiAutomationDiscoverElement,
  tokenizeRecordRowSearchPattern,
} from '@/shared/utils/ui-automation-record-row-search';

function mockButton(attrs: Record<string, string>, rowText?: string): HTMLElement {
  const tr = rowText
    ? ({
        textContent: rowText,
      } as HTMLTableRowElement)
    : null;

  const el = {
    id: attrs.id ?? '',
    className: '',
    dataset: {} as DOMStringMap,
    getAttribute: (name: string) => attrs[name] ?? null,
    closest: (sel: string) => (sel === 'tr' && tr ? tr : null),
  } as unknown as HTMLElement;

  return el;
}

describe('ui-automation-record-row-search', () => {
  test('tokenize strips edit/button noise words', () => {
    expect(tokenizeRecordRowSearchPattern('edit button for webhook loop workflow')).toEqual([
      'webhook',
      'loop',
    ]);
  });

  test('multi-token match on record attrs and row text', () => {
    const el = mockButton(
      {
        'data-lab-record-id': 'wf-1',
        'data-lab-record-action': 'edit',
        'data-lab-record-name': 'Demo: webhook loop with counter',
        'aria-label': 'edit Demo: webhook loop with counter',
      },
      'Demo: webhook loop with counter Yes 60',
    );
    const compiled = compileUiAutomationSearchPattern('webhook loop');
    expect(matchesUiAutomationDiscoverSearchPattern(el, compiled, () => undefined)).toBe(true);
  });

  test('fuzzy token matches loop when user types llop', () => {
    const el = mockButton(
      {
        'data-lab-record-name': 'Demo: webhook loop with counter',
        'data-lab-record-action': 'edit',
        'data-lab-record-id': 'wf-1',
      },
      'Demo: webhook loop with counter',
    );
    const compiled = compileUiAutomationSearchPattern('webhook llop');
    expect(matchesUiAutomationDiscoverSearchPattern(el, compiled, () => undefined)).toBe(true);
  });

  test('ranks record-action edit above unrelated buttons', () => {
    const edit = mockButton({
      'data-lab-record-id': 'wf-1',
      'data-lab-record-action': 'edit',
      'data-lab-record-name': 'Demo: webhook loop with counter',
    });
    const other = mockButton({ id: 'lab-workflows-create' });
    const compiled = compileUiAutomationSearchPattern('webhook loop');
    const getText = () => undefined;
    expect(rankUiAutomationDiscoverElement(edit, compiled, getText)).toBeGreaterThan(
      rankUiAutomationDiscoverElement(other, compiled, getText),
    );
  });

  test('haystack includes table row text for icon-only controls', () => {
    const el = mockButton({}, 'Demo: webhook loop with counter');
    const haystack = buildUiAutomationSearchHaystack(el, () => '');
    expect(haystack).toContain('webhook loop');
  });

  test('multi-token synonym pattern matches when any token hits (Cancel toolbar)', () => {
    const el = mockButton(
      { id: 'lab-workflows-cancel-top', 'aria-label': 'Cancel' },
    );
    const getText = () => 'Cancel';
    const compiled = compileUiAutomationSearchPattern(
      'cancel back exit close header toolbar button icon X close',
    );
    expect(matchesUiAutomationDiscoverSearchPattern(el, compiled, getText)).toBe(true);
  });

  test('strips layout noise words but keeps cancel/back/exit/close synonyms', () => {
    expect(
      tokenizeRecordRowSearchPattern(
        'header toolbar button icon X close cancel back exit',
      ),
    ).toEqual(expect.arrayContaining(['cancel', 'back', 'exit', 'close', 'x']));
    expect(
      tokenizeRecordRowSearchPattern('header toolbar button icon X close cancel back exit'),
    ).not.toEqual(expect.arrayContaining(['header', 'toolbar', 'button', 'icon']));
  });
});
