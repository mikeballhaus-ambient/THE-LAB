import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-polls-surveys`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-polls-surveys.poll.published",
    sourceAppId: "app-polls-surveys",
    label: "Poll published",
    description: "Emitted when a poll status transitions to `open` (publish).",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "pollId",
        "label": "Poll ID",
        "valueKind": "id"
      },
      {
        "path": "question",
        "label": "Question",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "kind",
        "label": "Kind",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-polls-surveys.poll.closed",
    sourceAppId: "app-polls-surveys",
    label: "Poll closed",
    description: "Emitted when a poll status transitions to `closed`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "pollId",
        "label": "Poll ID",
        "valueKind": "id"
      },
      {
        "path": "question",
        "label": "Question",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "voteCount",
        "label": "Vote count",
        "valueKind": "number"
      }
    ],
  },
  {
    eventType: "app-polls-surveys.poll.results_ready",
    sourceAppId: "app-polls-surveys",
    label: "Poll results ready",
    description: "Emitted when a poll closes with at least one recorded vote.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "pollId",
        "label": "Poll ID",
        "valueKind": "id"
      },
      {
        "path": "question",
        "label": "Question",
        "valueKind": "string"
      },
      {
        "path": "winningOption",
        "label": "Winning option",
        "valueKind": "string"
      },
      {
        "path": "voteCount",
        "label": "Vote count",
        "valueKind": "number"
      }
    ],
  },
] as const;
