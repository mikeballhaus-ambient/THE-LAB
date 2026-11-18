import type {
  LabDomainEventCatalogEntry,
  LabDomainEventPayloadFieldDescriptor,
} from '@/shared/types/lab-domain-event-catalog';
import { eventTypeMatches } from '@/shared/utils/lab-event-type-match';

/**
 * Catalog rows whose `eventType` matches a workflow trigger pattern (exact or trailing `.*`).
 *
 * Trigger nodes store a single pattern string; condition/mapping pickers must union payload fields from
 * every matching catalog entry so wildcards like `platform-approvals.request.*` still expose shape.
 */
export function catalogEntriesMatchingTriggerPatterns(
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
): LabDomainEventCatalogEntry[] {
  const matched = new Map<string, LabDomainEventCatalogEntry>();
  for (const pattern of eventTypes) {
    const trimmed = pattern.trim();
    if (!trimmed) {
      continue;
    }
    for (const entry of catalogEntries) {
      if (eventTypeMatches(trimmed, entry.eventType)) {
        matched.set(entry.eventType, entry);
      }
    }
  }
  return [...matched.values()];
}

/**
 * Fields suitable for rule conditions (no opaque internal ids).
 *
 * `observedPaths` supplies paths from a captured webhook body when the catalog has none — same merge
 * rules as {@link collectWorkflowPayloadMappingFields}, but still excludes documented `id` fields.
 */
export function collectRuleConditionPayloadFields(
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
  observedPaths: readonly string[] = [],
): LabDomainEventPayloadFieldDescriptor[] {
  const map = new Map<string, LabDomainEventPayloadFieldDescriptor>();
  for (const entry of catalogEntriesMatchingTriggerPatterns(eventTypes, catalogEntries)) {
    for (const field of entry.payloadFields ?? []) {
      if (field.valueKind === 'id' || field.valueKind === 'unknown') {
        continue;
      }
      if (!map.has(field.path)) {
        map.set(field.path, field);
      }
    }
  }
  for (const path of observedPaths) {
    const trimmed = path.trim();
    if (!trimmed || map.has(trimmed)) {
      continue;
    }
    map.set(trimmed, { path: trimmed, label: trimmed, valueKind: 'unknown' });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Event payload paths for integration / notify mapping (includes id fields).
 *
 * `observedPaths` is how a **dynamic-payload** trigger (phase 37) offers anything at all. A webhook's
 * shape is chosen by the caller, so `payloadFields` is empty by definition; the only paths that exist
 * are the ones a capture actually saw. Passing them here — rather than leaving the list empty — is
 * what stops the mapping UI from having nothing to suggest.
 *
 * Static and observed sources are merged, so an event that is both documented and captured shows the
 * union without duplicates.
 */
export function collectWorkflowPayloadMappingFields(
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
  observedPaths: readonly string[] = [],
): LabDomainEventPayloadFieldDescriptor[] {
  const map = new Map<string, LabDomainEventPayloadFieldDescriptor>();
  for (const entry of catalogEntriesMatchingTriggerPatterns(eventTypes, catalogEntries)) {
    for (const field of entry.payloadFields ?? []) {
      if (!map.has(field.path)) {
        map.set(field.path, field);
      }
    }
  }
  for (const path of observedPaths) {
    const trimmed = path.trim();
    if (!trimmed || map.has(trimmed)) {
      continue;
    }
    // `valueKind: 'unknown'` — a capture records paths, not types. Claiming a kind would let the
    // condition editor offer value pickers that do not apply.
    map.set(trimmed, { path: trimmed, label: trimmed, valueKind: 'unknown' });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** True when **any** of these event types takes its payload shape from the caller. */
export function hasDynamicPayload(
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
): boolean {
  return catalogEntriesMatchingTriggerPatterns(eventTypes, catalogEntries).some(
    (entry) => entry.dynamicPayload === true,
  );
}

export function findRuleConditionPayloadField(
  path: string,
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
): LabDomainEventPayloadFieldDescriptor | undefined {
  return collectRuleConditionPayloadFields(eventTypes, catalogEntries).find((f) => f.path === path);
}

export type LabRulePayloadPathOption = { label: string; value: string };

/** Dropdown labels for payload paths declared on the trigger event(s). */
export function buildRuleConditionPayloadPathOptions(
  path: string,
  descriptors: LabDomainEventPayloadFieldDescriptor[],
): LabRulePayloadPathOption[] {
  const base = descriptors.map((field) => ({ label: field.label, value: field.path }));
  if (!base.length) {
    return [{ label: 'Custom path…', value: '__path_custom__' }];
  }
  const trimmed = path.trim();
  if (trimmed && !base.some((option) => option.value === trimmed)) {
    return [{ label: `${trimmed} (custom)`, value: trimmed }, ...base];
  }
  return base;
}

/** Use a path dropdown when the catalog lists at least one condition-safe field. */
export function ruleConditionPayloadPathUseSelect(options: LabRulePayloadPathOption[]): boolean {
  return options.some((option) => option.value !== '__path_custom__');
}

function formatAllowedValueLabel(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Fixed value choices for `payload_equals` when the catalog declares `allowedValues`. */
export function ruleConditionPayloadValueOptions(
  path: string,
  eventTypes: string[],
  catalogEntries: LabDomainEventCatalogEntry[],
): LabRulePayloadPathOption[] {
  const field = findRuleConditionPayloadField(path, eventTypes, catalogEntries);
  if (!field?.allowedValues?.length) {
    return [];
  }
  return field.allowedValues.map((value) => ({
    value,
    label: formatAllowedValueLabel(value),
  }));
}
