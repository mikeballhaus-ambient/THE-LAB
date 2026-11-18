import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-okr-goals`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-okr-goals.key-result.at_risk",
    sourceAppId: "app-okr-goals",
    label: "Key result at risk",
    description: "Emitted when a key result transitions to `at-risk`. Intended trigger for escalation workflows.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "keyResultId",
        "label": "Key result ID",
        "valueKind": "id"
      },
      {
        "path": "objectiveId",
        "label": "Objective ID",
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
        "path": "current",
        "label": "Current value",
        "valueKind": "number"
      },
      {
        "path": "target",
        "label": "Target value",
        "valueKind": "number"
      }
    ],
  },
  {
    eventType: "app-okr-goals.objective.completed",
    sourceAppId: "app-okr-goals",
    label: "Objective completed",
    description: "Emitted when the last key result of an objective reaches `done`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "objectiveId",
        "label": "Objective ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "quarter",
        "label": "Quarter",
        "valueKind": "string"
      },
      {
        "path": "ownerName",
        "label": "Owner",
        "valueKind": "userId"
      }
    ],
  },
] as const;
