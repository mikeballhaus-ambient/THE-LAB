import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `platform`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "platform-rules.evaluation.completed",
    sourceAppId: "platform-rules",
    label: "Rules evaluation completed",
    description: "Emitted when one or more automation rules match a source domain event. Payload contains match metadata and evaluated facts — use Workflow Studio for actions.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "sourceEventId",
        "label": "Source event ID",
        "valueKind": "id"
      },
      {
        "path": "sourceEventType",
        "label": "Source event type",
        "valueKind": "string"
      },
      {
        "path": "sourceAppId",
        "label": "Source app",
        "valueKind": "string"
      },
      {
        "path": "matchCount",
        "label": "Match count",
        "valueKind": "number"
      },
      {
        "path": "matches",
        "label": "Rule matches (array)",
        "valueKind": "unknown"
      }
    ],
  },
  {
    eventType: "platform-approvals.request.created",
    sourceAppId: "platform-approvals",
    label: "Approval request created",
    description: "A new approval request was opened from a policy.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "requestId",
        "label": "Request ID",
        "valueKind": "id"
      },
      {
        "path": "policyId",
        "label": "Policy ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      },
      {
        "path": "currentStepIndex",
        "label": "Current step index",
        "valueKind": "number"
      },
      {
        "path": "assigneeUserId",
        "label": "First assignee",
        "valueKind": "userId"
      },
      {
        "path": "requesterUserId",
        "label": "Requester",
        "valueKind": "userId"
      }
    ],
  },
  {
    eventType: "platform-approvals.step.pending",
    sourceAppId: "platform-approvals",
    label: "Approval step pending",
    description: "Workflow advanced; a step is waiting on an assignee.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "requestId",
        "label": "Request ID",
        "valueKind": "id"
      },
      {
        "path": "stepIndex",
        "label": "Step index",
        "valueKind": "number"
      },
      {
        "path": "assigneeUserId",
        "label": "Assignee",
        "valueKind": "userId"
      }
    ],
  },
  {
    eventType: "platform-approvals.step.approved",
    sourceAppId: "platform-approvals",
    label: "Approval step approved",
    description: "Current step was approved (request may still be in progress).",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "requestId",
        "label": "Request ID",
        "valueKind": "id"
      },
      {
        "path": "stepIndex",
        "label": "Step index",
        "valueKind": "number"
      }
    ],
  },
  {
    eventType: "platform-approvals.request.approved",
    sourceAppId: "platform-approvals",
    label: "Approval request approved",
    description: "All steps passed; request is fully approved.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "requestId",
        "label": "Request ID",
        "valueKind": "id"
      },
      {
        "path": "policyId",
        "label": "Policy ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      },
      {
        "path": "requesterUserId",
        "label": "Requester",
        "valueKind": "userId"
      },
      {
        "path": "requestStatus",
        "label": "Request status",
        "valueKind": "string",
        "allowedValues": [
          "approved",
          "rejected"
        ]
      }
    ],
  },
  {
    eventType: "platform-approvals.request.rejected",
    sourceAppId: "platform-approvals",
    label: "Approval request rejected",
    description: "A step was rejected; request is closed.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "requestId",
        "label": "Request ID",
        "valueKind": "id"
      },
      {
        "path": "policyId",
        "label": "Policy ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      },
      {
        "path": "requesterUserId",
        "label": "Requester",
        "valueKind": "userId"
      },
      {
        "path": "requestStatus",
        "label": "Request status",
        "valueKind": "string",
        "allowedValues": [
          "approved",
          "rejected"
        ]
      },
      {
        "path": "comment",
        "label": "Rejection comment",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "platform-auth.session.established",
    sourceAppId: "platform-auth",
    label: "Session established",
    description:
      "A new lab session row was created after sign-in (HTTP or socket). Not emitted on cookie resolve or reconnect.",
    publisherKind: "platform",
    payloadFields: [
      { path: "userId", label: "User ID", valueKind: "userId" },
      { path: "sessionId", label: "Session ID", valueKind: "id" },
      { path: "authMethod", label: "Auth method", valueKind: "string" },
      { path: "providerKey", label: "OIDC provider", valueKind: "string" },
      { path: "utcDate", label: "UTC date", valueKind: "string" },
    ],
  },
  {
    eventType: "platform-webhook.request.received",
    sourceAppId: "platform-webhook",
    label: "Webhook received",
    description: "A caller posted to a workflow webhook. The payload shape is set by the caller and discovered by listening.",
    publisherKind: "platform",
    dynamicPayload: true,
    payloadFields: [],
  },
  {
    eventType: "platform-ledger.entry.posted",
    sourceAppId: "platform-ledger",
    label: "Ledger entry posted",
    description: "A balanced journal entry was posted to the platform ledger.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "entryId",
        "label": "Entry ID",
        "valueKind": "id"
      },
      {
        "path": "memo",
        "label": "Memo",
        "valueKind": "string"
      },
      {
        "path": "lineCount",
        "label": "Line count",
        "valueKind": "number"
      },
      {
        "path": "totalCents",
        "label": "Total (cents)",
        "valueKind": "number"
      }
    ],
  },
] as const;
