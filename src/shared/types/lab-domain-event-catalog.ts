/**
 * Central registry of lab domain events apps may publish.
 * Add an entry here when you call publishLabDomainEvent / publishLabDomainEventPipeline.
 *
 * @see docs/platform/lab-domain-events.md
 */

export type LabDomainEventPayloadFieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'userId'
  | 'id'
  | 'unknown';

export interface LabDomainEventPayloadFieldDescriptor {
  path: string;
  label: string;
  valueKind: LabDomainEventPayloadFieldKind;
  description?: string;
  /** When set, condition editors offer a fixed pick list instead of free text. */
  allowedValues?: readonly string[];
}

export type LabDomainEventPublisherKind = 'catalog-app' | 'platform';

export interface LabDomainEventCatalogEntry {
  eventType: string;
  sourceAppId: string;
  label: string;
  description: string;
  publisherKind: LabDomainEventPublisherKind;
  payloadFields: LabDomainEventPayloadFieldDescriptor[];
  /**
   * The publisher decides the payload shape, so the catalog cannot declare it (phase 37).
   *
   * A webhook is the case this exists for: the caller's body *is* the payload. `payloadFields` is
   * empty on such an entry, and consumers must treat an empty list as **open** rather than closed —
   * otherwise the mapping UI offers nothing and the author has to guess at paths.
   *
   * Honoured by `collectWorkflowPayloadMappingFields` (returns captured paths), the output-mapping
   * panel (free-text plus suggestions), and the rule-condition editor.
   */
  dynamicPayload?: boolean;
  /**
   * Declared here but never seen on the bus in this environment.
   *
   * A declared event with no publisher is the most misleading entry in a trigger picker: the author
   * selects it, saves a valid workflow, and the workflow never fires — with no error anywhere. The
   * flag lets the picker badge it so "nobody has ever published this" is visible before the author
   * builds on it. Computed by `buildLabDomainEventCatalogResponse`, never authored by hand.
   */
  neverFired?: boolean;
}

/** Types seen on the bus but not yet documented in the static catalog. */
export interface LabDomainEventObservedType {
  eventType: string;
  sourceAppId: string;
  lastSeenAt: string;
  publishCount: number;
}

export interface LabDomainEventCatalogResponse {
  schemaVersion: 1;
  entries: LabDomainEventCatalogEntry[];
  observedOnly: LabDomainEventObservedType[];
}
