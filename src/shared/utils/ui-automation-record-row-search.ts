import type { CompiledUiAutomationSearchPattern } from '@/shared/utils/ui-automation-search-pattern';
import { elementAttributeValuesForUiAutomationSearch } from '@/shared/utils/ui-automation-search-pattern';
import {
  elementMatchesUiAutomationSearchPattern,
  isLabRecordActionControl,
  readLabRecordActionDiscoverMeta,
  LAB_RECORD_ATTR_NAME,
} from '@/shared/constants/lab-record-automation';
import { readLabShellActionDiscoverMeta } from '@/shared/constants/lab-shell-workspace-automation';

const RECORD_SEARCH_STOP_WORDS = new Set([
  'edit',
  'button',
  'click',
  'the',
  'for',
  'a',
  'an',
  'workflow',
  'workflows',
  'row',
  'please',
  'can',
  'you',
  'my',
  'open',
  /** Agent searchPattern noise (layout hints); not on control labels */
  'header',
  'toolbar',
  'footer',
  'icon',
]);

export function tokenizeRecordRowSearchPattern(pattern: string): string[] {
  return pattern
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        (t.length >= 2 || t === 'x') && !RECORD_SEARCH_STOP_WORDS.has(t),
    );
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function haystackHasToken(haystack: string, token: string, fuzzy: boolean): boolean {
  const h = haystack.toLowerCase();
  const t = token.toLowerCase();
  if (h.includes(t)) return true;
  if (!fuzzy || t.length < 4) return false;
  const words = h.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  return words.some((w) => levenshtein(w, t) <= 1);
}

export function buildUiAutomationSearchHaystack(
  el: HTMLElement,
  getTextContent: (element: HTMLElement) => string | undefined,
): string {
  const parts = elementAttributeValuesForUiAutomationSearch(el);
  const text = getTextContent(el);
  if (text) parts.push(text);
  const row = el.closest('tr');
  if (row) {
    const rowText = row.textContent?.trim();
    if (rowText) parts.push(rowText);
  }
  return parts.join(' ');
}

export function matchesUiAutomationDiscoverSearchPattern(
  el: HTMLElement,
  compiled: CompiledUiAutomationSearchPattern,
  getTextContent: (element: HTMLElement) => string | undefined,
): boolean {
  if (!compiled.effectiveTerm) return true;
  if (elementMatchesUiAutomationSearchPattern(el, compiled.regex, getTextContent)) {
    return true;
  }

  const haystack = buildUiAutomationSearchHaystack(el, getTextContent);
  const tokens = tokenizeRecordRowSearchPattern(compiled.effectiveTerm);

  if (tokens.length === 0) return false;

  /** Multi-word patterns are synonym soup from agents — match if **any** token hits (OR). */
  return tokens.some((token) => haystackHasToken(haystack, token, true));
}

export function rankUiAutomationDiscoverElement(
  el: HTMLElement,
  compiled: CompiledUiAutomationSearchPattern,
  getTextContent: (element: HTMLElement) => string | undefined,
): number {
  let score = 0;
  if (isLabRecordActionControl(el)) {
    score += 40;
    const meta = readLabRecordActionDiscoverMeta(el);
    if (meta?.action === 'edit') score += 30;
    if (meta?.recordName) {
      const nameHaystack = meta.recordName.toLowerCase();
      const tokens = tokenizeRecordRowSearchPattern(compiled.effectiveTerm);
      if (tokens.length > 0) {
        const nameHits = tokens.filter((t) => haystackHasToken(nameHaystack, t, true));
        score += nameHits.length * 10;
        if (nameHits.length === tokens.length) score += 25;
      }
    }
  }

  const tokens = tokenizeRecordRowSearchPattern(compiled.effectiveTerm);
  if (tokens.length > 0) {
    const haystack = buildUiAutomationSearchHaystack(el, getTextContent);
    const hits = tokens.filter((t) => haystackHasToken(haystack, t, true));
    score += hits.length * 8;
    if (hits.length === tokens.length && tokens.length >= 2) score += 20;
  }

  const recordName = el.getAttribute(LAB_RECORD_ATTR_NAME)?.trim();
  if (recordName) score += 10;

  if (/edit/i.test(compiled.effectiveTerm) && readLabRecordActionDiscoverMeta(el)?.action === 'edit') {
    score += 15;
  }

  const shell = readLabShellActionDiscoverMeta(el);
  if (shell?.action === 'close-app') {
    score += 45;
    const term = compiled.effectiveTerm.toLowerCase();
    if (/\b(close|teardown|exit)\b/.test(term) || term.includes('close')) {
      score += 25;
    }
  }

  return score;
}
