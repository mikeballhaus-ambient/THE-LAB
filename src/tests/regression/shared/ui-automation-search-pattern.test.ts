import { describe, expect, test } from '@jest/globals';
import {
  compileUiAutomationSearchPattern,
  extractSearchTermFromCssLikePattern,
} from '@/shared/utils/ui-automation-search-pattern';
import { elementMatchesUiAutomationSearchPattern } from '@/shared/constants/lab-record-automation';

describe('ui-automation-search-pattern', () => {
  test('literal substring escapes regex metacharacters', () => {
    const { regex, mode } = compileUiAutomationSearchPattern('drag & drop');
    expect(mode).toBe('literal');
    expect(regex.test('drag & drop (examples)')).toBe(true);
    expect(regex.test('prefix drag & drop suffix')).toBe(true);
    expect(regex.test('other')).toBe(false);
  });

  test('extracts quoted value from CSS-like pattern', () => {
    expect(
      extractSearchTermFromCssLikePattern('[data-appname="Workflow Studio"]'),
    ).toBe('Workflow Studio');
    const { regex, mode, effectiveTerm } = compileUiAutomationSearchPattern(
      'button[data-app-id="app-lab-workflow-studio"]',
    );
    expect(mode).toBe('css-extracted');
    expect(effectiveTerm).toBe('app-lab-workflow-studio');
    expect(regex.test('app-lab-workflow-studio')).toBe(true);
  });

  test('regex: prefix uses explicit regex', () => {
    const { regex } = compileUiAutomationSearchPattern('regex:/^Launch .+/i');
    expect(regex.test('Launch Workflow Studio')).toBe(true);
    expect(regex.test('Launch')).toBe(false);
  });

  test('matches data-app-id on mock element', () => {
    const attrs: Record<string, string> = {
      'data-app-id': 'app-lab-workflow-studio',
      'aria-label': 'Launch Workflow Studio',
    };
    const el = {
      id: '',
      className: '',
      attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
      dataset: {} as DOMStringMap,
      getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;
    const { regex } = compileUiAutomationSearchPattern('workflow studio');
    expect(
      elementMatchesUiAutomationSearchPattern(el, regex, () => 'Launch'),
    ).toBe(true);
    const idRegex = compileUiAutomationSearchPattern('app-lab-workflow-studio').regex;
    expect(
      elementMatchesUiAutomationSearchPattern(el, idRegex, () => undefined),
    ).toBe(true);
  });
});
