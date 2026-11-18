import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-job-applicant-tracker`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-job-applicant-tracker.applicant.stage_changed",
    sourceAppId: "app-job-applicant-tracker",
    label: "Applicant stage changed",
    description: "Emitted when an applicant moves to a different hiring stage (`PATCH /api/applicants/:id/stage`).",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "applicantId",
        "label": "Applicant ID",
        "valueKind": "id"
      },
      {
        "path": "name",
        "label": "Name",
        "valueKind": "string"
      },
      {
        "path": "role",
        "label": "Role",
        "valueKind": "string"
      },
      {
        "path": "stage",
        "label": "Stage",
        "valueKind": "string"
      },
      {
        "path": "email",
        "label": "Email",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-job-applicant-tracker.applicant.hired",
    sourceAppId: "app-job-applicant-tracker",
    label: "Applicant hired",
    description: "Emitted when an applicant stage transitions to `hired`. Intended trigger for onboarding.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "applicantId",
        "label": "Applicant ID",
        "valueKind": "id"
      },
      {
        "path": "name",
        "label": "Name",
        "valueKind": "string"
      },
      {
        "path": "role",
        "label": "Role",
        "valueKind": "string"
      },
      {
        "path": "email",
        "label": "Email",
        "valueKind": "string"
      }
    ],
  },
] as const;
