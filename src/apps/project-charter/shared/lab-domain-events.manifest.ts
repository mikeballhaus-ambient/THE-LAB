import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-project-charter`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-project-charter.charter.approved",
    sourceAppId: "app-project-charter",
    label: "Charter approved",
    description: "Emitted when a charter moves from `draft` to `active`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "charterId",
        "label": "Charter ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "sponsor",
        "label": "Sponsor",
        "valueKind": "userId"
      }
    ],
  },
  {
    eventType: "app-project-charter.charter.scope_changed",
    sourceAppId: "app-project-charter",
    label: "Charter scope changed",
    description: "Emitted when a charter’s in-scope or out-of-scope text changes.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "charterId",
        "label": "Charter ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "scope",
        "label": "Scope",
        "valueKind": "string"
      }
    ],
  },
] as const;
