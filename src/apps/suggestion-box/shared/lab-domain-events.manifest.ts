import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-suggestion-box`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-suggestion-box.suggestion.promoted",
    sourceAppId: "app-suggestion-box",
    label: "Suggestion promoted",
    description: "Emitted when a suggestion status moves out of `open`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "suggestionId",
        "label": "Suggestion ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "author",
        "label": "Author",
        "valueKind": "userId"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      }
    ],
  },
] as const;
