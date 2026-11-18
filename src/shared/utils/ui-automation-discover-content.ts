import type { UIDiscoveryElement } from '@/shared/types/schemas/ui-automation-schema';
import { DEFAULT_TOOL_RESULT_CONTENT_MAX_CHARS } from '@/shared/utils/tool-result-content';

export const UI_AUTOMATION_DISCOVER_JSON_MARKER = 'selector components:\n';
export const UI_AUTOMATION_DISCOVER_REQUEST_MARKER = 'Discover request:\n';
export const UI_AUTOMATION_DISCOVER_PAGINATION_MARKER = 'Discover pagination:\n';

const TRUNCATION_SUFFIX =
  '\n\n[Tool result truncated for chat storage and model context.]';

export type UiAutomationDiscoverToolMessageOptions = {
  searchPattern?: string | null;
  contextArea?: string | null;
  skip?: number | null;
  maxResults?: number | null;
  resultMessage?: string;
};

function formatDiscoverRequestLine(options?: UiAutomationDiscoverToolMessageOptions): string {
  const context =
    options?.contextArea != null && String(options.contextArea).trim() !== ''
      ? String(options.contextArea).trim()
      : '(none — whole page)';
  const pattern =
    options?.searchPattern != null && String(options.searchPattern).trim() !== ''
      ? String(options.searchPattern).trim()
      : '(none)';
  const skip = options?.skip ?? 0;
  const max =
    options?.maxResults != null && options.maxResults > 0 ? String(options.maxResults) : '(default)';
  return `${UI_AUTOMATION_DISCOVER_REQUEST_MARKER}contextArea="${context}", searchPattern="${pattern}", skip=${skip}, maxResults=${max}`;
}

function resolveDiscoverMessageOptions(options?: UiAutomationDiscoverToolMessageOptions): {
  contextArea: string;
  searchPattern: string;
  skip: number;
  maxResults: number;
} {
  const context =
    options?.contextArea != null && String(options.contextArea).trim() !== ''
      ? String(options.contextArea).trim()
      : '(none — whole page)';
  const pattern =
    options?.searchPattern != null && String(options.searchPattern).trim() !== ''
      ? String(options.searchPattern).trim()
      : '(none)';
  const skip = Math.max(0, options?.skip ?? 0);
  const maxResults =
    options?.maxResults != null && options.maxResults > 0 ? options.maxResults : 25;
  return { contextArea: context, searchPattern: pattern, skip, maxResults };
}

/** Plain-language paging hint for local / smaller models. */
export function formatDiscoverPaginationBlock(
  returnedCount: number,
  totalCount: number,
  options?: UiAutomationDiscoverToolMessageOptions,
): string {
  const { contextArea, searchPattern, skip, maxResults } = resolveDiscoverMessageOptions(options);
  const nextSkip = skip + returnedCount;
  const remaining = Math.max(0, totalCount - nextSkip);

  if (totalCount === 0) {
    return `${UI_AUTOMATION_DISCOVER_PAGINATION_MARKER}NO MATCHES. totalCount=0. Try a different searchPattern or contextArea.`;
  }

  if (!returnedCount) {
    if (skip > 0 && totalCount > 0) {
      return `${UI_AUTOMATION_DISCOVER_PAGINATION_MARKER}EMPTY PAGE. totalCount=${totalCount} but skip=${skip} is past the end. Rerun with skip=0 or a smaller skip.`;
    }
    return `${UI_AUTOMATION_DISCOVER_PAGINATION_MARKER}NO ROWS ON THIS PAGE. totalCount=${totalCount}. See result message above.`;
  }

  const lines = [
    `${UI_AUTOMATION_DISCOVER_PAGINATION_MARKER}totalCount=${totalCount} (all matches after filter).`,
    `This message JSON has ${returnedCount} row(s) only (skip=${skip}, maxResults=${maxResults}).`,
  ];

  if (remaining > 0) {
    lines.push(
      `MORE MATCHES EXIST: ${remaining} not in this message.`,
      `NEXT PAGE — call ui_automation_discover_elements again with the SAME contextArea="${contextArea}" and searchPattern="${searchPattern}" and skip=${nextSkip} and maxResults=${maxResults}.`,
    );
  } else {
    lines.push('ALL MATCHES ARE IN THIS MESSAGE. Do not paginate further for this search.');
  }

  lines.push(
    'If the JSON is later shortened for chat size ([Tool result truncated…] or condensed summary), paging skip values above still apply — or narrow searchPattern.',
  );

  return lines.join('\n');
}

export function buildUiAutomationDiscoverToolMessage(
  elements: UIDiscoveryElement[],
  totalCount: number,
  options?: UiAutomationDiscoverToolMessageOptions,
): string {
  const requestLine = formatDiscoverRequestLine(options);
  const paginationLine = formatDiscoverPaginationBlock(elements.length, totalCount, options);
  const summaryLine = `Match summary: totalCount=${totalCount}, returnedInJson=${elements.length}.`;

  if (!elements.length) {
    const detail =
      options?.resultMessage?.trim() ||
      'No elements found matching the discovery criteria.';
    const elementData = '[]';
    return `${requestLine}\n${summaryLine}\n${paginationLine}\n${detail}\nFull element data with ${UI_AUTOMATION_DISCOVER_JSON_MARKER}${elementData}`;
  }
  const elementData = JSON.stringify(elements);
  return `${requestLine}\n${summaryLine}\n${paginationLine}\nFull element data with ${UI_AUTOMATION_DISCOVER_JSON_MARKER}${elementData}`;
}

export function parseDiscoverElementsFromToolContent(content: string): {
  elements: UIDiscoveryElement[];
  parseError?: string;
  truncatedListing?: string;
} {
  const markerIdx = content.indexOf(UI_AUTOMATION_DISCOVER_JSON_MARKER);
  if (markerIdx === -1) {
    return { elements: [], parseError: 'missing_marker' };
  }

  let jsonPart = content.slice(markerIdx + UI_AUTOMATION_DISCOVER_JSON_MARKER.length).trim();
  const truncNoteIdx = jsonPart.indexOf('\n\n[Tool result truncated');
  if (truncNoteIdx !== -1) {
    jsonPart = jsonPart.slice(0, truncNoteIdx).trim();
  }
  const listingIdx = jsonPart.indexOf('\n(Showing ');
  let truncatedListing: string | undefined;
  if (listingIdx !== -1) {
    truncatedListing = jsonPart.slice(listingIdx).trim();
    jsonPart = jsonPart.slice(0, listingIdx).trim();
  }

  try {
    const parsed = JSON.parse(jsonPart) as unknown;
    if (!Array.isArray(parsed)) {
      return { elements: [], parseError: 'not_array' };
    }
    return { elements: parsed as UIDiscoveryElement[], truncatedListing };
  } catch (error) {
    return {
      elements: [],
      parseError: error instanceof Error ? error.message : 'parse_failed',
    };
  }
}

/**
 * Keeps discover tool results as valid JSON when capped for Dexie / model context.
 * Naive char truncation breaks JSON.parse in the dashboard formatter.
 */
export function truncateUiAutomationDiscoveryContent(
  content: string,
  maxChars: number = DEFAULT_TOOL_RESULT_CONTENT_MAX_CHARS,
): string {
  if (!content || content.length <= maxChars) {
    return content;
  }

  const markerIdx = content.indexOf(UI_AUTOMATION_DISCOVER_JSON_MARKER);
  if (markerIdx === -1) {
    return `${content.slice(0, Math.max(0, maxChars - TRUNCATION_SUFFIX.length))}${TRUNCATION_SUFFIX}`;
  }

  const prefix = content.slice(0, markerIdx + UI_AUTOMATION_DISCOVER_JSON_MARKER.length);
  const jsonPart = content.slice(markerIdx + UI_AUTOMATION_DISCOVER_JSON_MARKER.length);
  let elements: UIDiscoveryElement[];
  try {
    const parsed = JSON.parse(jsonPart.trim()) as unknown;
    if (!Array.isArray(parsed)) {
      return `${content.slice(0, Math.max(0, maxChars - TRUNCATION_SUFFIX.length))}${TRUNCATION_SUFFIX}`;
    }
    elements = parsed as UIDiscoveryElement[];
  } catch {
    return `${content.slice(0, Math.max(0, maxChars - TRUNCATION_SUFFIX.length))}${TRUNCATION_SUFFIX}`;
  }

  const total = elements.length;
  const presentationOrder = [...elements].sort((a, b) => {
    const score = (el: UIDiscoveryElement): number => {
      if (el.uiRole === 'record-action' && el.recordAction?.action === 'edit') return 100;
      if (el.uiRole === 'record-action') return 80;
      if (el.uiRole === 'catalog-launch') return 60;
      return 0;
    };
    return score(b) - score(a);
  });
  let trimmed = [...presentationOrder];
  const listingBudget = 80;

  while (trimmed.length > 0) {
    const listing =
      trimmed.length < total
        ? `\n(Showing ${trimmed.length} of ${total} rows in this message's JSON — character limit, not discover skip. Re-read Discover pagination above for skip=.)`
        : '';
    const candidate = `${prefix}${JSON.stringify(trimmed)}${listing}`;
    if (candidate.length + TRUNCATION_SUFFIX.length <= maxChars) {
      return trimmed.length < total ? `${candidate}${TRUNCATION_SUFFIX}` : candidate;
    }
    trimmed = trimmed.slice(0, trimmed.length - 1);
  }

  const preferred =
    presentationOrder.find((el) => el.uiRole === 'record-action' && el.recordAction?.action === 'edit')
    ?? presentationOrder.find((el) => el.uiRole === 'record-action')
    ?? presentationOrder.find((el) => el.uiRole === 'catalog-launch')
    ?? presentationOrder[0];

  const minimal = (preferred ? [preferred] : elements.slice(0, 1)).map((el) => ({
    tag: el.tag,
    target: el.target,
    elementRef: el.elementRef,
    textContent: el.textContent?.slice(0, 120),
    isInteractive: el.isInteractive,
    isVisible: el.isVisible,
    contextArea: el.contextArea,
    uiRole: el.uiRole,
    catalogLaunch: el.catalogLaunch,
    recordAction: el.recordAction,
  })) as UIDiscoveryElement[];

  let minimalJson = JSON.stringify(minimal);
  while (minimalJson.length + prefix.length + TRUNCATION_SUFFIX.length + listingBudget > maxChars && minimalJson.length > 20) {
    minimalJson = minimalJson.slice(0, -20);
  }

  return `${prefix}${minimalJson}\n(Showing condensed element summary — one row only; character limit. Re-read Discover pagination above; rerun discover with skip= if MORE MATCHES EXIST.)${TRUNCATION_SUFFIX}`;
}

/** Strip control chars that break JSON when payloads are mishandled downstream. */
export function sanitizeUiAutomationDiscoveryText(value: string | null | undefined): string | null {
  if (value == null || value === '') {
    return value ?? null;
  }
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}
