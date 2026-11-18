import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-knowledge-base`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-knowledge-base.article.review_due",
    sourceAppId: "app-knowledge-base",
    label: "Article review due",
    description: "A published article has not been updated in 180 days. Re-saving the article resets the clock.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "recordId",
        "label": "Article ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "category",
        "label": "Category",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "author",
        "label": "Author",
        "valueKind": "string"
      },
      {
        "path": "dueDate",
        "label": "Window date",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-knowledge-base.article.published",
    sourceAppId: "app-knowledge-base",
    label: "Article published",
    description: "Emitted when an article status transitions to `published` (via `PUT /api/kb/articles/:id`).",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "articleId",
        "label": "Article ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "category",
        "label": "Category",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "author",
        "label": "Author",
        "valueKind": "userId"
      }
    ],
  },
  {
    eventType: "app-knowledge-base.article.content_updated",
    sourceAppId: "app-knowledge-base",
    label: "Article content updated",
    description: "Emitted when a `published` article is saved via `PUT /api/kb/articles/:id` (including re-saves). Drives KB vector re-index.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "articleId",
        "label": "Article ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "slug",
        "label": "Slug",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-knowledge-base.article.index_removed",
    sourceAppId: "app-knowledge-base",
    label: "Article removed from KB index",
    description: "Emitted when a formerly indexed article leaves `published` (archived/draft), or is deleted. Purges `kb-chunks` vectors for the slug.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "articleId",
        "label": "Article ID",
        "valueKind": "id"
      },
      {
        "path": "slug",
        "label": "Slug",
        "valueKind": "string"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "reason",
        "label": "Reason",
        "valueKind": "string"
      }
    ],
  },
] as const;
