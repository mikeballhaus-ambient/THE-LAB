/**
 * Agent instructions for the Knowledge Base catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const knowledgeBaseAppInstructions = `# App System Instructions: Knowledge Base

## Overview

\`app-knowledge-base\` is a **platform hybrid** catalog app and the lab's documentation hub: platform and app knowledge for humans, and — through the KB MCP server — for agents. UI: \`src/apps/knowledge-base/front-end/App.vue\`; server on **\`props.serverUrl\`** (registry port **3016**). **Launch dependencies:** \`app-lab-formsbuilder\`, \`app-lab-chartbuilder\` (article Forms Builder slots + report charts).

## Dual-audience model (important)

One row serves two readers. Do not collapse them.

| Column | Audience | Notes |
|---|---|---|
| \`body\` | **humans** | Markdown. Reader uses \`renderKbArticleMarkdown()\` (\`renderLabMarkdown\` with \`breaks: false\`, then \`##\` → section cards). |
| \`agent_view\` | **agents** | JSON: \`summary\`, \`facts\`, \`contracts\`, \`patterns\`, \`gotchas\`, \`liveSources\`, \`relatedSlugs\`. |
| \`app_id\` | link | Registry app id (\`app-lab-formsbuilder\`). \`NULL\` for cross-cutting docs. |
| \`slug\` | address | Stable id; preferred over the numeric id when citing. |
| \`source_path\` | provenance | Path under \`docs/\` the article was authored from. |

When \`agent_view\` is null, \`lab_kb_get\` falls back to \`body\` — usable, just not optimised for tool use.

## Data model

- **Articles** — title, slug, category, tags (comma separated), body (human markdown), agent_view (JSON), app_id, source_path, status (\`draft\` | \`published\` | \`archived\`), author + \`author_id\` (\`kb_articles\`).

## API (app server, REST)

- \`GET /api/kb/articles[?search=]\` — articles + distinct categories.
- \`POST/PUT/DELETE /api/kb/articles[/:id]\` — direct REST (automation). **UI** create/edit/delete uses Forms Builder → \`POST /api/connector/articles\` and \`POST /api/connector/articles/:id\` with the signed-in user for author resolution. Connector updates **preserve** \`slug\`, \`agentView\`, \`appId\`, and \`sourcePath\` when the form does not send them (docs rows). Write schema accepts \`slug\`, \`agentView\` (object or JSON string), \`appId\`, \`sourcePath\`, \`author\` / \`authorId\` (lab-user lookup).

## Knowledge Base MCP tools (agent-facing)

- \`lab_kb_search\` — \`query\`, \`category\`, \`tags[]\`, \`appId\`, \`limit\`, \`includeUnpublished\`. Published only by default. Returns slug + an agent summary.
- \`lab_kb_get\` — \`slug\` (preferred) or \`articleId\`. Returns the structured agent form, then the human body as context.
- \`lab_kb_app_context\` — \`appId\`. Resolves the app's **current** \`app_system_instructions\` from the live registry, plus type, port, dependencies and enabled/system state.

**Never copy live platform state into an article.** A port or instructions blob stored in \`agent_view.facts\` goes stale. Name the source in \`liveSources\` and call \`lab_kb_app_context\` at run time. All three tools are granted to every persona.

## Integration (rm-64)

Host \`app-knowledge-base\`, surface \`knowledge-base.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

Article (primary): \`entityKey\` \`article\`, segment \`articles\` — \`openPrimaryCreate/Edit/Delete\`. Stub form \`knowledge-base.article.*.dialog\`: \`body\` is a full-width **Textarea** on row 3 of a 4-column grid. List/search stays \`GET /api/kb/articles\`.

### Human body authoring

- Use \`##\` for major sections; the Reader wraps each in a \`lab-form-section\` card.
- Optional section icon (Reader only): suffix the heading — \`## Overview{{pi pi-info-circle}}\` (PrimeIcons classes). No suffix → no icon chip. Snippets stay in stored markdown; \`lab_kb_get\` strips them from the appended human body so agents see clean headings.
- Seeded docs use \`kbSectionHeading()\` in \`kb-doc-prose-builder.ts\`. Do **not** use \`repairStreamedMarkdown\` on article bodies.

### Chart Builder

\`reports.articles-by-category\`, \`reports.articles-by-status\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Seed packs

- \`kb-demo\` — six illustrative articles for charts and Forms Builder pickers (removable).
- \`kb-docs\` — the real documentation set, authored from \`docs/\`, tagged \`docs:<path>\` (infrastructure, not removable). Reconciles existing rows on boot, so content edits reach an existing DB. Human \`body\` fields are expanded in \`kb-doc-prose-builder.ts\` before insert/reconcile (\`agentView\` unchanged).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-knowledge-base.article.published\` | article status **transitions to** \`published\` | \`PUT /api/kb/articles/:id\` |
| \`app-knowledge-base.article.content_updated\` | article saved while **already** \`published\` (includes first publish save) | \`PUT /api/kb/articles/:id\` |
| \`app-knowledge-base.article.index_removed\` | article leaves \`published\` (archived/draft) or is **deleted** | \`PUT /api/kb/articles/:id\` · \`DELETE /api/kb/articles/:id\` |

There is no status route — publishing happens through the article update. \`content_updated\` drives KB vector re-index on the main backend; \`index_removed\` purges Chroma \`kb-chunks\` for the slug; \`published\` remains the workflow-friendly first-publish signal.

## Automation scope

- Root class \`knowledge-base-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.
- **Layout** — \`lab-platform-catalog-app\` + canonical \`lab-form-section\` cards (Reports / Browse with icon titles; nested **Library** / **Reader**). Reports collapsed by default; charts use \`tile\` + fixed \`ChartRuntime\` height so canvas does not spill over Browse.
- Article chrome — title + tags in a nested \`lab-form-section\` header card; scrollable body below.
- Article body markdown → \`renderKbArticleMarkdown()\` (wraps each \`##\` section in nested \`lab-form-section\` cards, no step numerals). Optional section icon: suffix the heading with \`{{pi pi-info-circle}}\` (PrimeIcons classes only); snippet is stripped from the visible title. No snippet → no icon chip. Container \`.kb-body\`; styles use \`:deep()\`.
- Do **not** pass the article body through \`repairStreamedMarkdown\` — that pass strips blank lines and splits table lead-ins, and would flatten authored prose.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-knowledge-base',
  displayName: 'Knowledge Base',
  contextAreaClass: 'knowledge-base-app',
  primaryRecordLabel: 'article title',
  extraBullets: [
    "Reader **Edit** / **Delete** (when an article is selected) use the selected article id and title.",
  ],
})}

User doc: \`docs/apps/knowledge-base.md\` (create/update when UX changes).
`;
