import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-training-quizzes`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-training-quizzes.cert.expiring",
    sourceAppId: "app-training-quizzes",
    label: "Certification expiring",
    description: "An active learner certification expires within 30 days. Passing a quiz issues or renews a one-year certification.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "recordId",
        "label": "Certification ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "learner",
        "label": "Learner",
        "valueKind": "userId"
      },
      {
        "path": "quizId",
        "label": "Quiz ID",
        "valueKind": "id"
      },
      {
        "path": "dueDate",
        "label": "Expiry date",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-training-quizzes.quiz.passed",
    sourceAppId: "app-training-quizzes",
    label: "Quiz passed",
    description: "Emitted when a submitted quiz attempt scores at or above the quiz pass mark.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "quizId",
        "label": "Quiz ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "learnerId",
        "label": "Learner",
        "valueKind": "userId"
      },
      {
        "path": "passed",
        "label": "Passed",
        "valueKind": "boolean"
      }
    ],
  },
] as const;
