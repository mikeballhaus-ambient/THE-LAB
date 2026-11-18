import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { eventTypeMatches } from '@/shared/utils/lab-event-type-match';

/** Human labels for stored trigger patterns that are not exact catalog event types. */
const WORKFLOW_TRIGGER_PATTERN_LABELS: Readonly<Record<string, string>> = {
  'platform-approvals.request.*': 'Approval request outcome',
};

/**
 * Whether a string looks like an internal id (event type, service id, pack marker, etc.)
 * rather than user-facing copy.
 */
export function looksLikeTechnicalPaletteId(value: string): boolean {
  const s = value.trim();
  if (!s) {
    return false;
  }
  if (s.includes('(pack:') || s.startsWith('pack:')) {
    return true;
  }
  if (/^app-[\w-]+/.test(s)) {
    return true;
  }
  if (!s.includes(' ') && /^[\w-]+(\.[\w-]+)+$/.test(s)) {
    return true;
  }
  return false;
}

/** Optional subtext under a palette card title — never returns raw technical ids. */
export function paletteCardSubtext(title: string, secondary?: string): string | undefined {
  if (!secondary?.trim()) {
    return undefined;
  }
  const text = secondary.trim();
  if (text === title.trim()) {
    return undefined;
  }
  if (looksLikeTechnicalPaletteId(text)) {
    return undefined;
  }
  return text;
}

export function resolveLabDomainEventLabel(
  eventType: string,
  catalogEntries: readonly LabDomainEventCatalogEntry[],
): string {
  const trimmed = eventType.trim();
  if (!trimmed) {
    return '';
  }

  const patternLabel = WORKFLOW_TRIGGER_PATTERN_LABELS[trimmed];
  if (patternLabel) {
    return patternLabel;
  }

  const entry = catalogEntries.find((row) => row.eventType === trimmed);
  if (entry?.label) {
    return entry.label;
  }

  if (trimmed.endsWith('.*')) {
    const matching = catalogEntries.filter((row) => eventTypeMatches(trimmed, row.eventType));
    if (matching.length === 1 && matching[0]?.label) {
      return matching[0].label;
    }
    if (matching.length > 1) {
      const shared = trimmed.slice(0, -2);
      const parentSegment = shared.split('.').slice(-1)[0]?.replace(/[-_]/g, ' ') ?? 'event';
      const titled =
        parentSegment.length > 0
          ? `${parentSegment.charAt(0).toUpperCase()}${parentSegment.slice(1)}`
          : 'Matching';
      return `${titled} (any matching type)`;
    }
  }

  const tail = trimmed.split('.').pop() ?? trimmed;
  if (tail === '*') {
    return 'Matching events (pattern)';
  }
  return tail.replace(/[-_]/g, ' ');
}

/** Best catalog row for styling a workflow trigger (exact type or first `.*` match). */
export function catalogEntryForWorkflowTriggerEventType(
  eventType: string,
  catalogEntries: readonly LabDomainEventCatalogEntry[],
): LabDomainEventCatalogEntry | undefined {
  const trimmed = eventType.trim();
  if (!trimmed) {
    return undefined;
  }
  const exact = catalogEntries.find((row) => row.eventType === trimmed);
  if (exact) {
    return exact;
  }
  if (trimmed.endsWith('.*')) {
    return catalogEntries.find((row) => eventTypeMatches(trimmed, row.eventType));
  }
  return undefined;
}
