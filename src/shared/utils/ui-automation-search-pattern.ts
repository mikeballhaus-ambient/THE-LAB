/**
 * UI automation `searchPattern` — agents supply a **search term**, not a CSS selector.
 * Default: case-insensitive substring (regex metacharacters escaped).
 * Advanced: `regex:/pattern/flags` or `regex:pattern` when a persona explicitly needs regex.
 */

export type UiAutomationSearchPatternMode = 'literal' | 'regex' | 'css-extracted';

export interface CompiledUiAutomationSearchPattern {
  regex: RegExp;
  mode: UiAutomationSearchPatternMode;
  /** Term actually matched after normalizing quotes / CSS fragments */
  effectiveTerm: string;
}

function escapeRegexLiteral(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pull a human search term out of common mistaken CSS selector strings from agents. */
export function extractSearchTermFromCssLikePattern(pattern: string): string | null {
  const trimmed = pattern.trim();
  const attrQuoted = trimmed.match(/\[data-[\w-]+=["']([^"']+)["']\]/);
  if (attrQuoted?.[1]) return attrQuoted[1];
  const attrBare = trimmed.match(/data-[\w-]+=["']([^"']+)["']/);
  if (attrBare?.[1]) return attrBare[1];
  if (trimmed.startsWith('#') && trimmed.length > 1) {
    return trimmed.slice(1);
  }
  return null;
}

export function compileUiAutomationSearchPattern(pattern: string): CompiledUiAutomationSearchPattern {
  let raw = pattern.trim();
  if (!raw) {
    return {
      regex: /(?!)/,
      mode: 'literal',
      effectiveTerm: '',
    };
  }

  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  if (raw.toLowerCase().startsWith('regex:')) {
    const body = raw.slice(6).trim();
    const slashForm = body.match(/^\/(.+)\/([gimsuy]*)$/);
    const regex = slashForm
      ? new RegExp(slashForm[1], slashForm[2] || 'i')
      : new RegExp(body, 'i');
    return { regex, mode: 'regex', effectiveTerm: body };
  }

  const cssTerm = extractSearchTermFromCssLikePattern(raw);
  if (cssTerm) {
    return {
      regex: new RegExp(escapeRegexLiteral(cssTerm), 'i'),
      mode: 'css-extracted',
      effectiveTerm: cssTerm,
    };
  }

  return {
    regex: new RegExp(escapeRegexLiteral(raw), 'i'),
    mode: 'literal',
    effectiveTerm: raw,
  };
}

const UI_AUTOMATION_SEARCH_ATTR_NAMES = new Set([
  'id',
  'name',
  'type',
  'value',
  'placeholder',
  'title',
  'aria-label',
  'aria-labelledby',
  'href',
  'data-appname',
  'data-app-id',
  'data-lab-catalog-action',
  'data-lab-record-name',
  'data-lab-record-id',
  'data-lab-record-action',
  'data-lab-shell-action',
  'data-lab-target-app-id',
  'data-catalog-primary-id',
]);

export function elementAttributeValuesForUiAutomationSearch(el: HTMLElement): string[] {
  const values: string[] = [];
  if (el.attributes?.length) {
    for (const attr of Array.from(el.attributes)) {
      if (UI_AUTOMATION_SEARCH_ATTR_NAMES.has(attr.name) || attr.name.startsWith('data-')) {
        if (attr.value) values.push(attr.value);
      }
    }
  }
  for (const name of UI_AUTOMATION_SEARCH_ATTR_NAMES) {
    const v = el.getAttribute(name);
    if (v && !values.includes(v)) values.push(v);
  }
  if (el.dataset['appname'] && !values.includes(el.dataset['appname'])) {
    values.push(el.dataset['appname']);
  }
  if (el.dataset.appId && !values.includes(el.dataset.appId)) {
    values.push(el.dataset.appId);
  }
  return values;
}
