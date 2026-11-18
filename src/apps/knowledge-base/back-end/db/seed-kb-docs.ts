import type { Database } from 'better-sqlite3';
import { APP_SEED_BOOT_FLAG_KEYS } from '@/shared/config/app-seed-boot-flags';
import { DEMO_ADMIN, DEMO_TODAY } from '@/shared/config/demo-data-cast';
import {
  ensurePersonIdColumn,
  ensureTextColumn,
  insertRow,
} from '@/shared/server/demo-seed-columns';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { enrichKbDocSeed } from './kb-doc-prose-builder';
import {
  KB_APP_AGENT_VIEWS,
  KB_INTEGRATION_AGENT_VIEWS,
  KB_REFERENCE_AGENT_VIEWS,
} from './seed-kb-docs-app-views';
import { KB_WAVE2_AGENT_ARTICLES } from './seed-kb-docs-wave2';

/**
 * Knowledge Base as the lab's documentation hub (rm-64 §30.8).
 *
 * Seeded from the real `docs/` tree rather than invented prose. Each article carries its
 * source path in `source_path` so the two stay reconcilable, and is tagged `docs:/…` so the
 * KB MCP server can filter seeded documentation from ad-hoc team articles.
 *
 * **This is not the demo pack.** `seed-kb-demo.ts` seeds six illustrative articles for
 * catalog charts and Forms Builder pickers. This seed is the operating manual.
 */

export const KB_DOCS_PACK_ID = 'kb-docs';

/**
 * Documentation seeding is intentional content, not sample data, so it is not in the
 * user-removable demo set — but it still honours a boot flag so an admin can suppress it.
 */
export const KB_DOCS_BOOT_FLAG = APP_SEED_BOOT_FLAG_KEYS.KNOWLEDGE_BASE_DOCS;

export const KB_DOCS_TAG_PREFIX = 'docs:';

export interface KbDocSeed {
  /** Stable address used by `lab_kb_get` and by agents when citing an article. */
  slug: string;
  title: string;
  category: KbDocCategory;
  tags: string[];
  /** Path under `docs/` this article was authored from. */
  sourcePath: string;
  /** Human markdown. Rendered by the app with `renderLabMarkdown(body, { breaks: false })`. */
  body: string;
  /**
   * Registry app id when this article documents exactly one app. Drives
   * `lab_kb_app_context`, which resolves that app's live `app_system_instructions`.
   */
  appId?: string;
  /**
   * Structured agent projection. When absent, `lab_kb_get` falls back to `body` — so an
   * un-annotated article still works, it simply is not optimised for tool use.
   */
  agentView?: KbAgentViewSeed;
}

export interface KbAgentViewSeed {
  summary: string;
  facts?: Array<{ label: string; value: string }>;
  contracts?: string[];
  patterns?: string[];
  gotchas?: string[];
  liveSources?: string[];
  relatedSlugs?: string[];
}

/**
 * Registry app ids for the app articles.
 *
 * An explicit map is required rather than deriving the id from the slug: platform apps use an
 * `app-lab-*` prefix (`app-lab-crm`, not `app-crm`), and Chart Builder is
 * `app-lab-chartbuilder` — matching neither its KB slug nor the platform catalog id
 * `app-lab-chart-builder`.
 *
 * `app-games` is intentionally absent: it documents nine apps, so no single `app_id` is
 * correct and `lab_kb_app_context` must be called per game.
 */
export const KB_DOC_APP_IDS: Readonly<Record<string, string>> = {
  // Platform (host) apps.
  'app-crm': 'app-lab-crm',
  'app-task-list': 'app-lab-tasklist',
  'app-help-desk': 'app-lab-helpdesk',
  'app-forms-builder': 'app-lab-formsbuilder',
  'app-chart-builder': 'app-lab-chartbuilder',
  'app-knowledge-base': 'app-knowledge-base',
  'app-workflow-studio': 'app-lab-workflow-studio',
  'app-approvals': 'app-lab-approvals-policies',
  'app-financial-ledger': 'app-lab-financial-ledger',
  'app-app-builder': 'app-lab-app-builder',
  // Catalog apps — these slugs do match their registry ids.
  'app-okr-goals': 'app-okr-goals',
  'app-travel-itinerary': 'app-travel-itinerary',
  'app-project-charter': 'app-project-charter',
  'app-time-tracking': 'app-time-tracking',
  'app-job-applicant-tracker': 'app-job-applicant-tracker',
  'app-suggestion-box': 'app-suggestion-box',
  'app-expense-reports': 'app-expense-reports',
  'app-training-quizzes': 'app-training-quizzes',
  'app-onboarding-checklist': 'app-onboarding-checklist',
  'app-weather-dashboard': 'app-weather-dashboard',
  'app-home-maintenance': 'app-home-maintenance',
  'app-rental-property': 'app-rental-property',
  'app-event-rsvp': 'app-event-rsvp',
  'app-polls-surveys': 'app-polls-surveys',
};

export type KbDocCategory =
  | 'Getting started'
  | 'Apps'
  | 'Integrations'
  | 'Platform'
  | 'Operations'
  | 'Agents'
  | 'Reference';

/**
 * Articles, grouped by the categories §30.8 requires. One article per launchable app lives
 * in {@link APP_ARTICLES}; the rest are cross-cutting.
 */
const GETTING_STARTED: KbDocSeed[] = [
  {
    slug: 'what-is-the-lab',
    title: 'What THE-LAB is',
    category: 'Getting started',
    tags: ['overview', 'shell', 'apps'],
    sourcePath: 'CLAUDE.md',
    body: [
      'THE-LAB is an agentic platform: a chat shell (**Laboratory**) plus an **apps workspace** of',
      'launchable apps. Both views stay in the DOM — switching blurs one and focuses the other.',
      '',
      'The platform host (`src/backend`) owns identity, the app registry, MCP tooling, integration',
      'bindings and the chat surface. Product behaviour lives in `src/apps/{app-id}/**`.',
      '',
      'Three kinds of app:',
      '- **browser** — a Vue component only.',
      '- **server** — a Node/Fastify process only.',
      '- **hybrid** — both; the UI talks to its own server on `props.serverUrl`.',
    ].join('\n'),
    agentView: {
      summary:
        'Agentic platform: Laboratory chat + apps workspace; platform host on :3000, apps under src/apps/.',
      facts: [
        { label: 'App kinds', value: 'browser | server | hybrid' },
        { label: 'Hybrid URL', value: 'props.serverUrl — not port 3000' },
      ],
      patterns: ['lab_kb_search platform topics before inventing architecture'],
      gotchas: ['Viewer cannot launch apps'],
      relatedSlugs: ['launching-an-app', 'glossary', 'persona-playbook-chat'],
    },
  },
  {
    slug: 'signing-in',
    title: 'Signing in',
    category: 'Getting started',
    tags: ['auth', 'login', 'session'],
    sourcePath: 'docs/platform/platform-identity.md',
    body: [
      'Local sign-in uses a platform session cookie plus a JWT issued by `LabSessionService`.',
      '',
      'Demo users use the password **demo**: `mia.chen@lab.local`, `jordan.lee@lab.local`, and so on',
      '(ids 2–11). The bootstrap admin is id 1 and is never removed by the demo user seed pack.',
      '',
      'Enterprise sign-in goes through **Settings → Auth Providers** (OIDC). Just-in-time',
      'provisioning creates a platform user on first login — see `docs/auth/oidc-jit-phase1.md`.',
    ].join('\n'),
    agentView: {
      summary: 'Session cookie + JWT; demo password demo; OIDC via Settings → Auth Providers.',
      facts: [{ label: 'Protected user', value: 'bootstrap admin id 1' }],
      patterns: ['UI automation and MCP tools need an active session — sign in before driving the lab'],
      relatedSlugs: ['auth-providers', 'roles-and-permissions'],
    },
  },
  {
    slug: 'roles-and-permissions',
    title: 'Roles and permissions',
    category: 'Getting started',
    tags: ['roles', 'permissions', 'access'],
    sourcePath: 'docs/platform/platform-identity.md',
    body: [
      'Four roles: `owner`, `admin`, `member`, `viewer`.',
      '',
      '| Role | Launch apps | Manage apps | Manage users | Seed packs |',
      '|---|---|---|---|---|',
      '| owner | yes | yes | yes | yes |',
      '| admin | yes | yes | yes | yes |',
      '| member | yes | no | no | no |',
      '| viewer | **no** | no | no | no |',
      '',
      'Viewers can read the lobby but cannot launch apps (`RoleManager`). Never make a viewer the',
      'sole owner or assignee of an actionable record.',
    ].join('\n'),
    agentView: {
      summary: 'owner/admin/member can launch; viewer read-only — affects UI automation and CRM assignees.',
      contracts: ['Never assign viewer as sole assignee on actionable records'],
      patterns: ['Verify persona session role before expecting Launch or write dialogs to open'],
      relatedSlugs: ['launching-an-app', 'lab-ui-automation'],
    },
  },
  {
    slug: 'launching-an-app',
    title: 'Launching an app',
    category: 'Getting started',
    tags: ['launch', 'apps', 'lifecycle'],
    sourcePath: 'docs/operations/lab-stack.md',
    body: [
      'Open the apps workspace and pick a card. Hybrid and server apps start on demand: the',
      'platform spawns the app process, waits for `GET /health`, then mounts the UI.',
      '',
      'Platform apps (Forms Builder, Chart Builder, CRM, Task List, Help Desk, Knowledge Base,',
      'Workflow Studio, Approvals, Ledger, App Builder) warm on backend boot along with their',
      'dependency closure. Catalog apps start when you open them or when a host resolves launch',
      'dependencies.',
      '',
      'App servers listen on **4000–4999**. The main backend is **3000**.',
    ].join('\n'),
    agentView: {
      summary: 'Catalog launch via UI automation or user; hybrid/server need health on registered port.',
      facts: [
        { label: 'Main backend', value: '3000' },
        { label: 'App servers', value: '4000–4999' },
      ],
      patterns: ['ui_automation with searchPattern = registry id or display name'],
      relatedSlugs: ['lab-ui-automation', 'ports-and-ranges'],
    },
  },
];

/** One article per launchable app — purpose, key screens, integration surfaces. */
const APP_ARTICLES: KbDocSeed[] = [
  {
    slug: 'app-crm',
    title: 'CRM',
    category: 'Apps',
    tags: ['crm', 'accounts', 'contacts', 'pipeline'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      '### Purpose — accounts, contacts, leads, pipeline stages, products, inventory and quotes.',
      '',
      '### Key screens — entity lists, the pipeline board, dashboards (`CatalogReportsPanel`).',
      '',
      '### Integration surfaces — hosts Forms Builder dialogs and Chart Builder widgets. `contacts`',
      'carry `company` (text mirror) and `companyId` (lookup into the `accounts` entity). The',
      '`accounts` entity is the gold source for company identity across the lab.',
    ].join('\n'),
  },
  {
    slug: 'app-task-list',
    title: 'Task List',
    category: 'Apps',
    tags: ['tasks', 'lists', 'assignee'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      '### Purpose — task lists and tasks, with a host-app scope so other apps can attach tasks.',
      '',
      '### Key screens — list sidebar, task table, kanban views.',
      '',
      '### Integration surfaces — `tasks.metadata` stores host-app JSON (for example a CRM record',
      'reference). `assignee_id` holds a stringified platform `users.id`. Hosts forms and charts.',
    ].join('\n'),
  },
  {
    slug: 'app-help-desk',
    title: 'Help Desk',
    category: 'Apps',
    tags: ['tickets', 'support', 'kanban'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      '### Purpose — support tickets, statuses, priorities and kanban boards.',
      '',
      '### Key screens — ticket queue, ticket detail, kanban board views.',
      '',
      '### Integration surfaces — `assignee_id` (stringified user id) and',
      '`requester_lab_user_id` (integer user id) plus `requester_email`. Ticket metadata can',
      'reference a CRM contact so the two records can be reconciled.',
    ].join('\n'),
  },
  {
    slug: 'app-forms-builder',
    title: 'Forms Builder',
    category: 'Apps',
    tags: ['forms', 'connectors', 'dialogs'],
    sourcePath: 'docs/platform/lab-integration-host-authoring.md',
    appId: 'app-lab-formsbuilder',
    body: [
      '### Purpose',
      'Published forms and data connectors that other apps mount as create, edit and delete',
      'dialogs. If a host app needs a dialog it did not build itself, the dialog lives here.',
      '',
      '### Key screens',
      'Form designer, connector list, discovery contracts.',
      '',
      '### Integration surfaces',
      'Forms Builder is the provider for every `form.surface` binding. Lookup contracts are',
      'published to the registry hub, so a host that binds a person or account field gets a real',
      'picker instead of a free-text box.',
      '',
      'To bind it into your app, see **How form and chart bindings work**.',
    ].join('\n'),
    agentView: {
      summary:
        'Provider app for `form.surface` bindings: publishes forms and data connectors that host apps mount as create/edit/delete dialogs.',
      facts: [
        { label: 'Registry id', value: 'app-lab-formsbuilder' },
        { label: 'App type', value: 'hybrid (UI + Fastify server)' },
        { label: 'Binding surface', value: 'form.surface' },
        { label: 'Lookup source', value: 'registry hub contract, not host code' },
      ],
      contracts: [
        'form.surface — a host declares the slot, Forms Builder supplies the dialog',
        'Lookup contracts are emitted by buildCatalogAppDiscoveryContract() and consumed by the host',
        'Person/account fields must resolve through the lookup contract so an id is stored, not a name',
      ],
      patterns: [
        'Bind through the lab integration tools or the integration host — never hardcode a formKey in host code',
        'Declare the slot in the host manifest and let the registry resolve which form fills it',
        'Store both the display text and the resolved *_id column; the text is a mirror, the id is the link',
        'Use lab_integrations_upsert_binding so the binding is recorded rather than implied',
      ],
      gotchas: [
        'The viewer role cannot launch apps, so a viewer cannot exercise a bound dialog',
        'Connector handlers are async because they resolve display names through the platform',
        'An unbound slot renders nothing by default — check hideEmptyRegions before assuming a bug',
        'Do not duplicate lookup logic in the host; the contract is the single source of truth',
      ],
      liveSources: [
        'apps.app_system_instructions for app-lab-formsbuilder — the authoritative how-to',
        'lab_kb_app_context with appId="app-lab-formsbuilder"',
        'lab_integrations_* tools for the current binding API',
      ],
      relatedSlugs: ['how-form-and-chart-bindings-work', 'app-chart-builder', 'app-crm'],
    },
  },
  {
    slug: 'app-chart-builder',
    title: 'Chart Builder',
    category: 'Apps',
    tags: ['charts', 'dashboards', 'dimensions'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    appId: 'app-lab-chartbuilder',
    body: [
      '### Purpose',
      'Reusable chart definitions and data connectors that host apps render. A host never builds',
      'its own chart markup — it declares a `chart.surface` slot and Chart Builder supplies the',
      'chart.',
      '',
      '### Key screens',
      'Chart library, chart designer (its forms are Forms Builder-backed), and the Manage data',
      'connectors view.',
      '',
      '### Integration surfaces',
      'Provider for every `chart.surface` binding. Charts group on semantic dimensions declared by',
      '`catalog-chart-dimensions` (status, category, owner…).',
      '',
      'Charts come in two modes. **Host-supplied data** carries no connector: the host posts the',
      'segments it computed. **Connector-backed** charts name a `dataConnectorId` plus a mapping,',
      'and Chart Builder fetches and aggregates server-side.',
    ].join('\n'),
    agentView: {
      summary:
        'Provider app for `chart.surface` bindings: stores reusable ChartSchema records and data connectors, and renders/aggregates charts for host apps.',
      facts: [
        { label: 'Registry id', value: 'app-lab-chartbuilder' },
        { label: 'Folder', value: 'src/apps/lab-chartbuilder' },
        { label: 'Port', value: '3013' },
        { label: 'Binding surface', value: 'chart.surface' },
        { label: 'Tables', value: 'charts, data_connectors' },
        { label: 'Seed charts', value: 'chart_seed_* (host-data samples, no connector)' },
      ],
      contracts: [
        'POST /api/v1/charts/render/:chartKey with { data } for host-supplied charts',
        'POST /api/v1/charts/render/:chartKey with { context } for connector-backed charts',
        'lab_integrations_provision_chart_stub creates connector + chart + mapping for one slot',
        'binding providerRef == chartKey',
        'Chart dimensions come from catalog-chart-dimensions — do not invent grouping keys',
      ],
      patterns: [
        'Provision through lab_integrations_provision_chart_stub, then lab_integrations_upsert_binding — never write lab_integration_bindings by hand',
        'Give each host slot its own chartKey so bindings stay independent',
        'For connector-backed charts, set dataMapping and allowedFilters so filters resolve server-side',
        'Keep Task List / Help Desk report charts separate from a host’s own charts',
      ],
      gotchas: [
        'Seed chart_seed_* rows are host-data samples — they have no dataConnectorId and will not aggregate',
        'chart.designer.metadata and chart.designer.connector are inline on the designer surface, not dialogs',
        'Legacy slots chart.create.dialog / chart.edit.dialog / chart.connectors.manage.dialog were removed — do not rebind them',
        'Help Desk is hybrid but Chart Builder itself only needs Forms Builder as a dependency',
      ],
      liveSources: [
        'apps.app_system_instructions for app-lab-chartbuilder',
        'lab_kb_app_context with appId="app-lab-chartbuilder"',
      ],
      relatedSlugs: ['how-form-and-chart-bindings-work', 'app-forms-builder'],
    },
  },
  {
    slug: 'app-knowledge-base',
    title: 'Knowledge Base',
    category: 'Apps',
    tags: ['knowledge', 'articles', 'documentation', 'mcp'],
    sourcePath: 'docs/platform/app-system-instructions.md',
    body: [
      '### Purpose',
      'The lab\'s documentation hub. Everything the platform knows about itself lives here, so a',
      'person does not have to read source to answer "how does this work".',
      '',
      'Each article serves two readers. You are reading the human view — written prose, rendered',
      'as formatted text. The same article also carries a **machine view**: the same knowledge',
      'expressed as facts, contracts, patterns and gotchas, which is what an agent receives when',
      'it queries the knowledge base through its tools.',
      '',
      '### Key screens',
      'Article list with category filtering and search, and the article editor. Article bodies are',
      'markdown, so headings, tables, lists and code all render.',
      '',
      '### Integration surfaces',
      'Hosts Forms Builder dialogs for creating and editing articles, plus the',
      '`reports.articles-by-category` chart. `kb_articles.author` is the display mirror for',
      '`author_id`, the platform user link.',
      '',
      '### For agents',
      'Three tools read this app. `lab_kb_search` finds articles, `lab_kb_get` returns one in its',
      'structured form, and `lab_kb_app_context` resolves an app\'s *current* system instructions',
      'from the live registry. Prefer `lab_kb_app_context` over trusting any instructions text',
      'quoted inside an article — the article may be older than the registry.',
    ].join('\n'),
    agentView: {
      summary:
        'The lab documentation hub. Articles carry both a human markdown body and a structured agent view; app-scoped articles resolve live app_system_instructions through lab_kb_app_context.',
      facts: [
        { label: 'Registry id', value: 'app-knowledge-base' },
        { label: 'Table', value: 'kb_articles' },
        { label: 'Human column', value: 'body (markdown, rendered with GFM)' },
        { label: 'Agent column', value: 'agent_view (JSON: summary/facts/contracts/patterns/gotchas)' },
        { label: 'App link column', value: 'app_id — null for cross-cutting docs' },
        { label: 'Stable address', value: 'slug' },
        { label: 'Docs provenance', value: 'source_path, seeded rows also tagged docs:<path>' },
      ],
      contracts: [
        'lab_kb_search(query?, category?, tags?[], appId?, limit?, includeUnpublished?) → ranked summaries',
        'lab_kb_get(slug? | articleId?) → structured article; slug is preferred',
        'lab_kb_app_context(appId) → live registry record incl. app_system_instructions',
        'Only published articles are returned unless includeUnpublished is true',
      ],
      patterns: [
        'Search first, then lab_kb_get on the slug — do not guess article ids',
        'For app behaviour, read lab_kb_app_context and then drive the app with UI Automation',
        'When an article says "see this app\'s system instructions", call lab_kb_app_context rather than looking for a copy',
        'Cite the slug when reporting what you found',
      ],
      gotchas: [
        'agent_view is null on articles that have not been annotated — lab_kb_get then returns the human body only',
        'lab_kb_app_context reads the platform registry in process; it is read-only and needs no app management permission',
        'lab_kb_search is keyword/LIKE by default; set LAB_KB_RAG_HYBRID_SEARCH=1 on the backend to merge Chroma kb-chunks vector hits',
        'Published articles are also chunked into Chroma collection kb-chunks for slot-A chat pre-inject when LAB_KB_RAG_SLOT_A=1',
        'Articles describing one app have app_id set; the games article deliberately does not, because it covers nine apps',
      ],
      liveSources: [
        'apps.app_system_instructions for app-knowledge-base',
        'lab_kb_app_context with appId="app-knowledge-base"',
      ],
      relatedSlugs: ['kb-document-rag', 'mcp-servers', 'writing-app-instructions', 'app-app-builder'],
    },
  },
  {
    slug: 'app-workflow-studio',
    title: 'Workflow Studio',
    category: 'Apps',
    tags: ['workflows', 'automation', 'graph'],
    sourcePath: 'docs/platform/lab-workflow-studio.md',
    body: [
      '### Purpose — author automation graphs: triggers, conditions, actions, notification steps.',
      '',
      '### Key screens — graph canvas (Settings), workflow list.',
      '',
      '### Integration surfaces — calls lab integration service ids; actions may target catalog',
      'apps, which now start on demand. Person-targeted actions should write `*_user_id`, not just a',
      'display name.',
    ].join('\n'),
  },
  {
    slug: 'app-approvals',
    title: 'Approvals & Policies',
    category: 'Apps',
    tags: ['approvals', 'policies', 'steps'],
    sourcePath: 'docs/platform/lab-approvals.md',
    body: [
      '### Purpose — approval policies and the requests that run through them.',
      '',
      '### Key screens — policy list, policy editor, request inbox.',
      '',
      '### Integration surfaces — expense reports and other hosts can raise approval requests;',
      'approvers are platform users, so steps store `assigneeUserId`.',
    ].join('\n'),
  },
  {
    slug: 'app-financial-ledger',
    title: 'Financial Ledger',
    category: 'Apps',
    tags: ['ledger', 'accounts', 'journal'],
    sourcePath: 'docs/platform/lab-financial-ledger.md',
    body: [
      '### Purpose — double-entry journal over a chart of accounts.',
      '',
      '### Key screens — chart of accounts, journal entry composer, entries list.',
      '',
      '### Integration surfaces — `lab_ledger_accounts` holds chart-of-accounts codes (`1000` Cash,',
      '`4000` Revenue, `DEMO-CASH`, `DEMO-REV`), **not** customers. Customer identity appears only',
      'in `lab_ledger_entries.memo` (for example `Northwind Labs — Platform Starter`).',
    ].join('\n'),
  },
  {
    slug: 'app-app-builder',
    title: 'App Builder',
    category: 'Apps',
    tags: ['catalog', 'tags', 'builder'],
    sourcePath: 'docs/platform/lab-app-builder.md',
    body: [
      '### Purpose — create and organize catalog entries and their tags.',
      '',
      '### Key screens — app catalog, tag manager.',
      '',
      '### Integration surfaces — tags drive catalog browse sections. Registry metadata (name,',
      'order, icon, type, port, dependencies) is managed through App Management tooling, not ad-hoc',
      'SQL.',
    ].join('\n'),
  },
  {
    slug: 'app-okr-goals',
    title: 'OKR / Goals',
    category: 'Apps',
    tags: ['okr', 'objectives', 'key-results'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — objectives and key results with derived progress.',
      '',
      '### Key screens — objective cards with key-result lists and progress bars.',
      '',
      '### Integration surfaces — `okr_objectives.owner_name` mirrors `owner_id` (platform user).',
      'Hosts a Forms Builder dialog for objectives and key results.',
    ].join('\n'),
  },
  {
    slug: 'app-travel-itinerary',
    title: 'Travel Itinerary',
    category: 'Apps',
    tags: ['travel', 'trips', 'itinerary'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — trips and their itinerary items (flights, hotels, activities, transport).',
      '',
      '### Key screens — trip list, trip detail with ordered items.',
      '',
      '### Integration surfaces — hosts Forms Builder dialogs for trips and items. No person column.',
    ].join('\n'),
  },
  {
    slug: 'app-project-charter',
    title: 'Project Charter',
    category: 'Apps',
    tags: ['charter', 'sponsor', 'scope'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — project charters: purpose, scope, out-of-scope, stakeholders, goals, status.',
      '',
      '### Key screens — charter list, charter editor.',
      '',
      '### Integration surfaces — `charters.sponsor` mirrors `sponsor_id`;',
      '`stakeholders` is a `; `-separated list whose lead stakeholder maps to',
      '`stakeholders_owner_id`.',
    ].join('\n'),
  },
  {
    slug: 'app-time-tracking',
    title: 'Time Tracking',
    category: 'Apps',
    tags: ['time', 'entries', 'billable'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — log time against projects and tasks, with weekly summaries.',
      '',
      '### Key screens — entry table, weekly summary, submit-week action.',
      '',
      '### Integration surfaces — `time_entries` had no person column historically; phase 31 added',
      '`user_id` (no backfill possible). Entries carry a computed ISO `week_key`.',
    ].join('\n'),
  },
  {
    slug: 'app-job-applicant-tracker',
    title: 'Job Applicant Tracker',
    category: 'Apps',
    tags: ['hiring', 'candidates', 'pipeline'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — candidate pipeline across applied → screening → interview → offer → hired or',
      'rejected.',
      '',
      '### Key screens — kanban board by stage, applicant detail.',
      '',
      '### Integration surfaces — `applicants.name` / `email` are **external candidates**, not lab',
      'users. Hosts Forms Builder dialogs and stage inline edits.',
    ].join('\n'),
  },
  {
    slug: 'app-suggestion-box',
    title: 'Suggestion Box',
    category: 'Apps',
    tags: ['suggestions', 'ideas', 'votes'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — collect ideas, track status and count votes.',
      '',
      '### Key screens — voted-ranked suggestion list, status inline edit, vote arrows.',
      '',
      '### Integration surfaces — `suggestions.author` mirrors `author_id`. Statuses: open,',
      'planned, in-progress, done, declined.',
    ].join('\n'),
  },
  {
    slug: 'app-expense-reports',
    title: 'Expense Reports',
    category: 'Apps',
    tags: ['expenses', 'approval', 'ledger'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — submit and track expenses through draft → submitted → approved → reimbursed,',
      'or rejected.',
      '',
      '### Key screens — expense table, status inline edit.',
      '',
      '### Integration surfaces — `expense_reports.submitter` mirrors `submitter_id`;',
      '`amount_cents` is an **integer**. Ledger and Approvals posting is a follow-on — it has no',
      'schema link yet.',
    ].join('\n'),
  },
  {
    slug: 'app-training-quizzes',
    title: 'Training & Quizzes',
    category: 'Apps',
    tags: ['training', 'quizzes', 'attempts'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — quizzes with questions and scored attempts.',
      '',
      '### Key screens — quiz list, quiz runner, attempt history.',
      '',
      '### Integration surfaces — `quiz_attempts.learner` mirrors `learner_id`. Questions store',
      'options as JSON plus a `correct_index`; `passed` is derived from `passing_score`.',
    ].join('\n'),
  },
  {
    slug: 'app-onboarding-checklist',
    title: 'Onboarding Checklist',
    category: 'Apps',
    tags: ['onboarding', 'checklists', 'tasks'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — per-hire onboarding checklists with task progress.',
      '',
      '### Key screens — checklist cards with progress, task lists.',
      '',
      '### Integration surfaces — `onboarding_checklists.new_hire` mirrors `new_hire_id`;',
      '`onboarding_tasks.owner` mirrors `owner_id`. Task statuses: todo, doing, done.',
    ].join('\n'),
  },
  {
    slug: 'app-weather-dashboard',
    title: 'Weather Dashboard',
    category: 'Apps',
    tags: ['weather', 'locations', 'observations'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — live conditions, radar overlays, and multi-day forecasts for saved locations.',
      '',
      '### Key screens — location cards with the latest observation, observation history.',
      '',
      '### Integration surfaces — live third-party weather is a follow-on; the MVP records',
      'observations. No person column.',
    ].join('\n'),
  },
  {
    slug: 'app-home-maintenance',
    title: 'Home Maintenance',
    category: 'Apps',
    tags: ['home', 'assets', 'maintenance'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — household assets and their maintenance tasks.',
      '',
      '### Key screens — asset cards with task lists, due-date ordering.',
      '',
      '### Integration surfaces — task statuses: scheduled, due, done, skipped; priorities: low,',
      'normal, high. No person column.',
    ].join('\n'),
  },
  {
    slug: 'app-rental-property',
    title: 'Rental Property',
    category: 'Apps',
    tags: ['rental', 'leases', 'payments'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — properties, leases and rent payments.',
      '',
      '### Key screens — property cards with lease and payment detail.',
      '',
      '### Integration surfaces — `rental_properties.monthly_rent_cents` and',
      '`rental_payments.amount_cents` are integers. `tenant_name` is an **external tenant**,',
      'correctly not a lab user.',
    ].join('\n'),
  },
  {
    slug: 'app-event-rsvp',
    title: 'Event RSVP',
    category: 'Apps',
    tags: ['events', 'rsvp', 'guests'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — events and guest responses with headcounts.',
      '',
      '### Key screens — event cards with RSVP lists.',
      '',
      '### Integration surfaces — `rsvp_responses.guest_name` mirrors `guest_user_id`. Responses:',
      'yes, no, maybe.',
    ].join('\n'),
  },
  {
    slug: 'app-polls-surveys',
    title: 'Polls & Surveys',
    category: 'Apps',
    tags: ['polls', 'options', 'votes'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — polls with options and votes, single or multi choice.',
      '',
      '### Key screens — poll cards with tallies, vote controls.',
      '',
      '### Integration surfaces — `poll_votes.voter` mirrors `voter_id`. Poll statuses: draft,',
      'open, closed.',
    ].join('\n'),
  },
  {
    slug: 'app-games',
    title: 'Games (Solitaire, Word Tile, Chess, Checkers, Battleship, Connect Four, Hangman, Poker, Tic Tac Toe)',
    category: 'Apps',
    tags: ['games', 'multiplayer', 'agents', 'quarks'],
    sourcePath: 'docs/apps/README.md',
    body: [
      '### Purpose — nine multiplayer game apps, most with an LLM agent opponent.',
      '',
      '### Key screens — lobby, game board, run history where implemented.',
      '',
      '### Quarks — optional play-money wagers, win rewards, and purchasable in-game hints use the',
      'platform **virtual bank** (`lab-quarks-virtual-bank`). Practice tables may simulate stakes without',
      'ledger posts.',
      '',
      '### Play vs Lab Assistant — see **`lab-games-and-lab-assistant`** (LLM opponent policy, app ports).',
      '',
      '### Integration surfaces — games publish domain events for Workflow Studio; they have no',
      'person or company identity surface, so the demo seed pack deliberately leaves them empty.',
    ].join('\n'),
  },
];

const INTEGRATIONS: KbDocSeed[] = [
  {
    slug: 'how-form-and-chart-bindings-work',
    title: 'How form and chart bindings work',
    category: 'Integrations',
    tags: ['bindings', 'forms', 'charts'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      'A **binding** connects a host app slot to a provider app asset.',
      '',
      '| Field | Meaning |',
      '|---|---|',
      '| `hostAppId` | App that renders the binding |',
      '| `slot` | Placement identifier on the host surface |',
      '| `kind` | `form` or `chart` |',
      '| `providerAppId` | Forms Builder or Chart Builder |',
      '| `providerRef` | Form key or chart key |',
      '',
      'Readiness is computed separately: a binding can exist while its provider asset is missing',
      '(`missing_provider_asset`). Never report a binding as connected without checking readiness —',
      'provision the stub first.',
    ].join('\n'),
  },
  {
    slug: 'the-connector-model',
    title: 'The connector model',
    category: 'Integrations',
    tags: ['connectors', 'rest', 'discovery'],
    sourcePath: 'docs/platform/lab-integration-host-authoring.md',
    body: [
      'Each app exposes CRUD connectors under `/api/connector/...`. The registry hub derives a',
      '**discovery contract** from each connector: entity list, property types, lookup providers and',
      'enum options.',
      '',
      'Lookup providers:',
      '- `lab-user` — platform `users.id`, rendered as a person picker.',
      '- `lookup` — another entity in the same app (for example CRM `accounts`).',
      '',
      'Discovery is what makes a form field render as a picker instead of a text box.',
    ].join('\n'),
  },
  {
    slug: 'adding-an-integration-provider',
    title: 'Adding an integration provider',
    category: 'Integrations',
    tags: ['providers', 'unbind', 'cleanup'],
    sourcePath: 'docs/platform/lab-integration-provider-unbind.md',
    body: [
      '1. Declare the service in the provider app\'s integration manifest.',
      '2. Publish a connector the hub can discover.',
      '3. Bind it from the host with `lab_integrations_upsert_binding`.',
      '4. Provision a stub asset (form or chart) so readiness resolves.',
      '',
      'Unbinding demotes integration-only dependencies when nothing else uses them, and removes',
      'stubs whose `providerRef` is no longer referenced.',
    ].join('\n'),
  },
  {
    slug: 'the-integration-wizard',
    title: 'The integration wizard',
    category: 'Integrations',
    tags: ['wizard', 'ui', 'bindings'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      'The Settings integration view walks a host through: pick a slot → pick a provider → pick an',
      'asset → set placement. Placement defaults come from the host manifest, so an unconfigured',
      'binding still lands somewhere sensible.',
      '',
      'Agents drive the same flow through `lab_integrations_*` MCP tools; the wizard and the tools',
      'share the same validation.',
    ].join('\n'),
  },
];

const PLATFORM: KbDocSeed[] = [
  {
    slug: 'theming-tokens',
    title: 'Theming tokens (`--lab-*`)',
    category: 'Platform',
    tags: ['theming', 'tokens', 'tailwind'],
    sourcePath: 'docs/platform/platform-theming.md',
    body: [
      'Theme tokens live on `:root` as `--lab-*` custom properties and are exposed to Tailwind as',
      '`bg-lab-*`, `text-lab-*` and `border-lab-*`.',
      '',
      'Use them on the shell **and every app screen** — lobby and in-game. Hard-coded colours break',
      'light and high-contrast presets.',
      '',
      'Presets live in `src/shared/theme/presets/`; admins switch them in **Settings → Themes**.',
    ].join('\n'),
    agentView: {
      summary: 'All UI chrome uses --lab-* / bg-lab-* — hard-coded hex breaks presets.',
      contracts: ['verify:theme-colors in CI — agents must not add literal colors in apps'],
      patterns: ['Map new surfaces through src/shared/theme/presets — never inline #rgb in Vue templates'],
      relatedSlugs: ['agent-coding-standards', 'catalog-workspace-ui-pattern', 'theming-tokens'],
    },
  },
  {
    slug: 'lab-sidecar',
    title: 'Lab Sidecar',
    category: 'Platform',
    tags: ['sidecar', 'assistant', 'context'],
    sourcePath: 'docs/platform/lab-sidecar.md',
    body: [
      'The apps-view **Assistant** panel. Sidecar messages are tagged with `labSidecarContext` on',
      'the platform chat so the agent knows which app is in focus.',
      '',
      'App front-ends enrich that context with',
      '`useLabSidecar().setContext({ key: value })` — the workspace API is re-provided from',
      '`AppLifecycle`.',
    ].join('\n'),
    agentView: {
      summary: 'Apps-view Assistant injects labSidecarContext into chat; narrower tool profile than Laboratory.',
      patterns: ['useLabSidecar().setContext in app lifecycle for focused-app hints'],
      relatedSlugs: ['sidecar-chat-and-prompt-layers', 'lab-sidecar-game-banter', 'persona-playbook-chat'],
    },
  },
  {
    slug: 'lab-messaging',
    title: 'Lab messaging',
    category: 'Platform',
    tags: ['messaging', 'comms', 'socket'],
    sourcePath: 'docs/platform/lab-messaging.md',
    body: [
      '**Messages** (quick nav `fa-comments`) is **human-to-human** chat on the main backend (**3000**).',
      'It is **not** Laboratory AI chat (`SOCKET_EVENTS` on `/`) and **not** the domain event bus.',
      '',
      '### Technical (v1)',
      '',
      '- Socket.IO namespace **`/lab-comms`** with **`LAB_COMMS_EVENTS`** only.',
      '- DMs persist in **main SQLite** (`lab_comms_*`); unread badges and presence on the same socket.',
      '- **Socket-only API** for send/history/inbox in v1 (no REST comms send).',
      '- Game apps may send structured **`game.invite`** envelopes on `/lab-comms` (hybrid game ports',
      'register invites separately from Laboratory chat).',
      '',
      'Workflow automation can DM users from platform system user **`users.id` 12** (read-only thread',
      'in Messages — not the bell Notifications inbox).',
      '',
      'See **`lab-realtime-channels`** for how chat, comms, and `/lab-events` differ.',
    ].join('\n'),
    agentView: {
      summary:
        'Human DMs on /lab-comms with SQLite persistence; separate from AI chat and lab-events; game invites use same namespace.',
      facts: [
        { label: 'Nav', value: 'Messages (after Laboratory)' },
        { label: 'Presence', value: 'green/yellow/red on /lab-comms connection' },
        { label: 'Teammate list', value: 'GET /api/platform/users' },
      ],
      contracts: ['Do not route agent Laboratory chat over LAB_COMMS_EVENTS'],
      gotchas: ['Cannot start a new DM to THE-LAB system user from the picker — automation only'],
      relatedSlugs: ['lab-realtime-channels', 'lab-sidecar', 'lab-games-and-lab-assistant'],
    },
  },
  {
    slug: 'auth-providers',
    title: 'Auth providers (OIDC)',
    category: 'Platform',
    tags: ['auth', 'oidc', 'jit'],
    sourcePath: 'docs/auth/oidc-jit-phase1.md',
    body: [
      'Configure IdPs in **Settings → Auth Providers** only. Just-in-time provisioning creates the',
      'platform user on first successful login and links an `user_auth_identities` row.',
      '',
      'OIDC users are never touched by demo-user removal, and the bootstrap admin is always protected.',
    ].join('\n'),
    agentView: {
      summary: 'OIDC JIT via Settings only; LAB_*_OIDC_* in .env seeds empty SQLite rows on boot.',
      gotchas: ['Agents cannot configure OIDC — user must complete Settings → Auth Providers'],
      relatedSlugs: ['signing-in', 'lab-environment-variables'],
    },
  },
  {
    slug: 'seed-packs',
    title: 'Seed packs',
    category: 'Platform',
    tags: ['seed', 'demo-data', 'settings'],
    sourcePath: 'docs/platform/app-system-instructions.md',
    body: [
      'Two tiers: **infrastructure** (required — forms and charts the platform mounts) and **demo**',
      '(removable).',
      '',
      'Every pack is idempotent and records what it inserted, so **Remove** deletes exactly those',
      'rows. Removing sets a per-pack boot flag; the pack does not come back on restart.',
      '',
      '**Apply** ignores the boot flag — that is the repair path.',
      '',
      'Settings → App demo data shows every pack as present or missing, without needing the app to',
      'be running.',
    ].join('\n'),
    agentView: {
      summary: 'Infrastructure vs demo packs; Apply repairs, Remove sets boot flag; kb-docs pack is infrastructure.',
      patterns: ['Settings → App demo data for pack status without launching apps'],
      relatedSlugs: ['backup-and-restore', 'app-knowledge-base'],
    },
  },
];

const OPERATIONS: KbDocSeed[] = [
  {
    slug: 'lab-start-and-stop',
    title: '`lab:start` / `lab:stop`',
    category: 'Operations',
    tags: ['stack', 'lifecycle', 'scripts'],
    sourcePath: 'docs/operations/lab-stack.md',
    body: [
      '`npm run lab:start` brings up Chroma, Vite and the backend. `npm run lab:stop` shuts the',
      'stack down, killing by port as well as by tracked PID.',
      '',
      '`npm run lab:services` starts services only (`--services-only --detach --wait-ready`).',
      '',
      'On Windows, orphan windows after a failed start are also cleaned up by `lab:stop`.',
    ].join('\n'),
    agentView: {
      summary: 'lab:start/stop orchestrates Chroma+Vite+backend; lab:services detached Chroma only.',
      patterns: ['Port 8000 conflict → lab:stop or reuse running Chroma'],
      relatedSlugs: ['lab-app-server-warmup', 'ports-and-ranges', 'local-dev-16gb-and-lm-studio'],
    },
  },
  {
    slug: 'ports-and-ranges',
    title: 'Ports and ranges',
    category: 'Operations',
    tags: ['ports', 'networking'],
    sourcePath: 'docs/operations/lab-stack.md',
    body: [
      '| Piece | Port |',
      '|---|---|',
      '| Main backend (Fastify + Socket.IO) | **3000** |',
      '| Vite shell | dev server default |',
      '| Chroma | **8000** |',
      '| App servers | **4000–4999** |',
      '',
      'The platform product apps have fixed low ports (CRM 3010, Forms Builder 3011, Help Desk 3012,',
      'Chart Builder 3013, Task List 3005) because they predate the 4000 range.',
    ].join('\n'),
    agentView: {
      summary: '3000 platform, 8000 Chroma, 5173 Vite, 4000–4999 apps; legacy platform apps 3005–3013.',
      patterns: ['curl health on app.port from registry before blaming UI for load failures'],
      relatedSlugs: ['lab-start-and-stop', 'launching-an-app'],
    },
  },
  {
    slug: 'backup-and-restore',
    title: 'Backup and restore',
    category: 'Operations',
    tags: ['backup', 'restore', 'database'],
    sourcePath: 'docs/operations/backup-restore-drill.md',
    body: [
      '`npm run backup:lab` snapshots the lab data. `npm run backup:verify-sandbox` validates a',
      'backup by restoring it into a sandbox first — do that before trusting a snapshot.',
      '',
      'The main database is `db/the_lab.db` (`DATABASE_PATH`). Every app has its own',
      '`src/apps/{app}/db/the_lab.db`. Back up both, or a restore will have identity without records.',
    ].join('\n'),
    agentView: {
      summary: 'backup:lab + verify-sandbox; platform db + per-app the_lab.db files.',
      patterns: ['Restore both src/backend/db/the_lab.db and app SQLite under src/apps/*/db/'],
      relatedSlugs: ['seed-packs'],
    },
  },
  {
    slug: 'logs-and-diagnostics',
    title: 'Logs and diagnostics',
    category: 'Operations',
    tags: ['logs', 'diagnostics', 'errors'],
    sourcePath: 'docs/operations/structured-logging.md',
    body: [
      'Structured logging writes to `LOG_OUTPUT_PATH`. Platform logs use `VSCodeLogger`; app servers',
      'log to their own console, captured by the app manager.',
      '',
      'Production profile: `LAB_PRODUCTION_PROFILE=1` enables the production MCP enforcers. If a',
      'tool silently refuses to run, check that first.',
    ].join('\n'),
    agentView: {
      summary: 'VSCodeLogger + LAB_STRUCTURED_LOGS; production profile changes MCP behaviour.',
      patterns: ['grep backend console for kb-rag, [kb-rag], AppManager warmUp'],
      relatedSlugs: [
        'lab-production-profile',
        'lab-platform-audit-log',
        'lab-environment-variables',
        'persona-playbook-debug',
      ],
    },
  },
];

const AGENTS: KbDocSeed[] = [
  {
    slug: 'personas',
    title: 'Personas',
    category: 'Agents',
    tags: ['personas', 'chat', 'delegation'],
    sourcePath: 'docs/providers/persona-delegation-contract.md',
    body: [
      'Built-in personas: Chat, Orchestrator, Architect, Code, Debug, QA. Each has a system',
      'message, a reasoning value and an **allowlisted tool list**.',
      '',
      'Allowlists are seeded from `src/backend/db/Persona/persona-tools-config.json` and re-synced',
      'on backend start, so a new tool can be granted to every persona by adding it to that file.',
      '',
      'Delegation follows the contract in the persona delegation doc — verify a delegate\'s output',
      'before presenting it as your own.',
    ].join('\n'),
    agentView: {
      summary:
        'Six personas: Chat, Orchestrator, Architect, Code, Debug, QA — each with persona-tools-config.json allowlist.',
      patterns: [
        'Chat — operators; Orchestrator — delegate; Code — implement; QA — verify',
        'See persona-playbook-* articles per role',
      ],
      relatedSlugs: [
        'persona-playbook-chat',
        'persona-playbook-orchestrator',
        'persona-playbook-code',
        'tool-permissions',
      ],
    },
  },
  {
    slug: 'mcp-servers',
    title: 'MCP servers',
    category: 'Agents',
    tags: ['mcp', 'tools', 'servers'],
    sourcePath: 'docs/mcp/mcp-production-policy.md',
    body: [
      'MCP servers expose tools to personas. System servers live in',
      '`src/backend/mcp/mcp-servers/` and register in `loadDefaultServers()`; user servers are',
      'configured per user and loaded by the external server loader.',
      '',
      'Tool ids are snake_case and unique. Each tool has a Zod parameter schema and returns',
      '`{ success, content }` via the adapter.',
      '',
      'Knowledge Base tools: `lab_kb_search`, `lab_kb_get`, `lab_kb_app_context`.',
      '',
      'When `LAB_KB_RAG_HYBRID_SEARCH=1`, `lab_kb_search` also boosts results using the kb-chunks',
      'vector index (requires Chroma and a working embed provider).',
    ].join('\n'),
    agentView: {
      summary:
        'System MCP under src/backend/mcp/mcp-servers/; KB tools lab_kb_search, lab_kb_get, lab_kb_app_context — always check persona allowlist.',
      patterns: [
        'lab_kb_search then lab_kb_get(slug) — cite slugs in answers',
        'lab_kb_app_context(appId) beats stale prose inside articles',
      ],
      gotchas: [
        'Hybrid search needs LAB_KB_RAG_HYBRID_SEARCH=1, Chroma :8000, and embed provider',
        'Tool not in persona-tools-config.json will never appear in the session',
      ],
      relatedSlugs: ['kb-document-rag', 'tool-permissions', 'personas'],
    },
  },
  {
    slug: 'tool-permissions',
    title: 'Tool permissions',
    category: 'Agents',
    tags: ['permissions', 'allowlist', 'personas'],
    sourcePath: 'docs/setup/persona-allowed-tools.md',
    body: [
      'A tool the persona does not allowlist will not be offered, even if the server is connected.',
      'That is the usual cause of "the agent cannot see the tool".',
      '',
      'New tools default to `allowed: true` when generated from a manifest, then get curated per',
      'persona in the JSON config.',
    ].join('\n'),
    agentView: {
      summary:
        'persona-tools-config.json gates which MCP tools the model sees — missing allowlist entry looks like a broken server.',
      gotchas: [
        '"Agent cannot see tool X" — usually persona allowlist, not MCP registration',
        'Code persona may lack ui_automation while Chat has it',
      ],
      patterns: ['Compare requested tool id to persona-tools-config before debugging handler code'],
      relatedSlugs: ['personas', 'mcp-servers', 'persona-playbook-code'],
    },
  },
  {
    slug: 'writing-app-instructions',
    title: 'Writing app instructions',
    category: 'Agents',
    tags: ['instructions', 'apps', 'context'],
    sourcePath: 'docs/platform/app-system-instructions.md',
    body: [
      'Per-app agent context lives in `src/backend/db/Apps/app-instructions/` and syncs to',
      '`apps.app_system_instructions` on backend init.',
      '',
      '**Any app rework that changes UX, integrations or automation must update that app\'s',
      'instruction file in the same change set.** Otherwise the agent gives stale guidance.',
    ].join('\n'),
    agentView: {
      summary:
        'Per-app instructions in src/backend/db/Apps/app-instructions/ sync to app_system_instructions on backend init.',
      patterns: [
        'Ship instruction markdown in the same PR as UX or integration changes',
        'Agents: lab_kb_app_context(appId) after code changes — articles may lag the registry',
      ],
      relatedSlugs: ['app-knowledge-base', 'agent-coding-standards'],
    },
  },
  {
    slug: 'kb-document-rag',
    title: 'KB document RAG (`kb-chunks`)',
    category: 'Agents',
    tags: ['rag', 'chroma', 'embeddings', 'kb-chunks', 'slot-a'],
    sourcePath: 'docs/setup/neural-memory-for-agents.md',
    body: [
      'THE-LAB keeps **two Chroma purposes** separate:',
      '',
      '| Collection | Purpose |',
      '|---|---|',
      '| `chat-memory` | Session transcript turns for a chat id |',
      '| `kb-chunks` | Chunked, embedded **published KB articles** (this is document RAG) |',
      '',
      '**Slot A (chat):** before each model call, the backend may embed the latest user message,',
      'query `kb-chunks`, and append a `## Retrieved knowledge (KB)` block to the system prompt',
      'when `LAB_KB_RAG_SLOT_A=1`. Requires LM Studio (or another) **embed** provider for the chat user.',
      '',
      '**Slot C (tools):** `lab_kb_search` stays the same tool name; with `LAB_KB_RAG_HYBRID_SEARCH=1`',
      'keyword SQL hits are merged with vector slugs from `kb-chunks`.',
      '',
      '**Ingest:** publishing or updating a KB article emits lab domain events; the main backend',
      'upserts chunks. Startup reconcile and `npm run kb-rag:reindex` fill or repair the index.',
      '',
      'Common env vars: `LAB_KB_RAG_SLOT_A`, `LAB_KB_RAG_HYBRID_SEARCH`, `LAB_KB_RAG_MIN_SCORE`,',
      '`LAB_KB_RAG_EMBED_USER_ID` (reindex), `LAB_KB_RAG_INGEST_ON_PUBLISH=0` to disable ingest.',
    ].join('\n'),
    agentView: {
      summary:
        'Document RAG over published KB articles: Chroma collection kb-chunks, slot-A sysMsg appendix in chat, optional hybrid lab_kb_search, ingest on publish + reconcile.',
      facts: [
        { label: 'Index collection', value: 'kb-chunks (not chat-memory)' },
        { label: 'Source of truth', value: 'kb_articles in Knowledge Base SQLite' },
        { label: 'Slot A gate', value: 'LAB_KB_RAG_SLOT_A=1' },
        { label: 'Hybrid MCP gate', value: 'LAB_KB_RAG_HYBRID_SEARCH=1' },
        { label: 'Manual backfill', value: 'cd the-lab && npm run kb-rag:reindex' },
        { label: 'Debug probe', value: 'npm run kb-rag:probe -- "<query>"' },
      ],
      contracts: [
        'Ingest text = agent_view markdown + article body (see kb-article-ingest-text)',
        'Citations use slug#chunkIndex in the appendix',
        'Embed provider must be reachable for slot A and hybrid search — chat uses the logged-in user embed config',
        'lab_kb_get(slug) still returns structured agent_view; slot A injects raw chunks, not a substitute for lab_kb_get',
      ],
      patterns: [
        'Prefer lab_kb_search then lab_kb_get for step-by-step procedures; use slot A as automatic context, not the only source',
        'Cite slugs you retrieved',
        'If answers lack KB detail, check Chroma is up (:8000), embed server is running, and kb-rag:reindex completed',
      ],
      gotchas: [
        'chat-memory similarity is session history, not KB — do not conflate the two collections',
        'fetch failed on embed means LM Studio (or embed base URL) is down — slot A fails open with no appendix',
        'LAB_KB_RAG_MIN_SCORE too high can yield zero hits even when the article exists',
        'Hybrid search falls back to keyword-only when embed or Chroma is unavailable',
      ],
      liveSources: [
        'src/shared/config/kb-rag-config.ts',
        'lab_kb_app_context with appId="app-knowledge-base"',
      ],
      relatedSlugs: [
        'lab-chroma-collections',
        'mcp-servers',
        'app-knowledge-base',
        'llm-providers-chat-and-embed',
      ],
    },
  },
  {
    slug: 'lab-domain-events-for-agents',
    title: 'Lab domain events (for agents)',
    category: 'Agents',
    tags: ['events', 'workflows', 'notifications', 'automation'],
    sourcePath: 'docs/platform/lab-domain-events.md',
    body: [
      'Apps publish **versioned domain events** to the main backend (`schemaVersion: 1`).',
      'Event type shape: `{sourceAppId}.{entity}.{action}` — e.g. `app-lab-tasklist.task.created`.',
      '',
      'Workflows and rules react in-process on port **3000**. Notifications in the bell UI are',
      'produced by workflow steps, not by the envelope itself.',
      '',
      'KB RAG ingest listens for Knowledge Base events such as `article.published`,',
      '`article.content_updated`, and `article.index_removed` to upsert or purge `kb-chunks`.',
      '',
      'When advising app authors: publish **after** the DB write succeeds, wrap publish in',
      '`try/catch` so a bus failure does not fail the user request, and set `actorUserId` on the',
      'envelope so `@me` resolves in workflows.',
      '',
      '**Catalog registration:** add a manifest row, register the file in',
      '`domain-event-manifest-index.ts`, then run `npm run verify:domain-event-manifests`',
      '(also in `test:pipeline`). See `docs/platform/lab-domain-events.md`.',
    ].join('\n'),
    agentView: {
      summary:
        'Platform domain event bus on the main backend; workflows and KB RAG ingest subscribe; types are registered in per-app lab-domain-events.manifest.ts files.',
      facts: [
        { label: 'Socket namespace', value: '/lab-events' },
        { label: 'Catalog', value: 'src/apps/<app>/shared/lab-domain-events.manifest.ts' },
        { label: 'Manifest index', value: 'src/shared/lab-domain-events/domain-event-manifest-index.ts' },
        { label: 'Verify gate', value: 'npm run verify:domain-event-manifests' },
        { label: 'KB ingest types', value: 'article.published, article.content_updated, article.index_removed' },
      ],
      contracts: [
        'buildLabEventType(sourceAppId, entity, action) — do not hand-type event strings',
        'Publish facts only on the payload — recipient lists belong in workflow notify steps',
        'Register every published type in the app manifest + domain-event-manifest-index.ts or CI fails',
      ],
      patterns: [
        'Use workflow MCP tools to inspect listeners and mock samples before proposing automation',
        'Prefer reading lab_kb_search for human procedures, then lab-domain-events doc for publish rules',
      ],
      gotchas: [
        'Publishing inside a DB transaction can race workflow readers',
        'Omitting actorUserId breaks user-scoped workflow steps silently',
      ],
      relatedSlugs: [
        'workflows-rules-and-automation',
        'lab-automation-architecture',
        'lab-requirement-sweep-and-date-events',
        'lab-notifications-inbox',
        'lab-realtime-channels',
        'app-workflow-studio',
        'kb-document-rag',
      ],
    },
  },
  {
    slug: 'workflows-rules-and-automation',
    title: 'Workflows, rules, and automation',
    category: 'Agents',
    tags: ['workflows', 'rules', 'listen', 'approvals'],
    sourcePath: 'docs/platform/lab-automation-architecture.md',
    body: [
      '**Workflow Studio** graphs listen for domain events and run steps (notify, ledger, HTTP,',
      'persona prompt, KB-side effects). **Rules** gate or transform behaviour at a lower level.',
      '',
      'Agents with workflow MCP tools can list workflows, start runs, and attach **listen**',
      'subscriptions for debugging — use them instead of guessing which event fired.',
      '',
      'Approvals and the financial ledger are separate platform surfaces; workflow steps can',
      'request approval or post journal lines when policies allow.',
    ].join('\n'),
    agentView: {
      summary:
        'In-process automation on the main backend: Workflow Studio reacts to lab domain events; use workflow MCP for inspection, not raw SQL.',
      facts: [
        { label: 'Studio app id', value: 'app-lab-workflow-studio' },
        { label: 'Main backend', value: 'port 3000' },
      ],
      contracts: [
        'workflow MCP tools require a valid caller userId',
        'Mock samples help regression-test a graph without live publishers',
      ],
      patterns: [
        'Trace: domain event → workflow listen → step run logs on backend console',
        'Pair with lab-domain-events article when designing new publishers',
      ],
      gotchas: [
        'Workflows do not run inside app server processes — only events published to the platform bus count',
      ],
      relatedSlugs: [
        'lab-automation-architecture',
        'lab-domain-events-for-agents',
        'lab-workflow-studio-for-agents',
        'lab-notifications-inbox',
        'app-workflow-studio',
        'app-approvals',
      ],
    },
  },
  {
    slug: 'llm-providers-chat-and-embed',
    title: 'LLM providers: chat vs embed',
    category: 'Agents',
    tags: ['providers', 'lm-studio', 'embeddings', 'settings'],
    sourcePath: 'docs/providers/openai-compatible-profile.md',
    body: [
      'Each user stores **two** provider rows: `chat` and `embed`. Chat drives completions;',
      'embed drives Chroma writes, session memory vectors, **kb-chunks** ingest, slot A, and hybrid KB search.',
      '',
      'THE-LAB defaults to **LM Studio** at `http://127.0.0.1:1234` for local dev. The embed',
      'model must be loaded on the LM Studio server before RAG or memory embedding works.',
      '',
      'Settings → AI providers: test **both** legs. A working chat model does not imply embed',
      'works. Reindex scripts use `LAB_KB_RAG_EMBED_USER_ID` (default user `1`); chat slot A uses',
      'the signed-in user\'s embed config.',
    ].join('\n'),
    agentView: {
      summary:
        'Per-user chat and embed provider configs; embed must be up for kb-chunks RAG, hybrid lab_kb_search, and Chroma memory writes.',
      facts: [
        { label: 'Resolution', value: 'ProviderService / user_ai_provider_configs' },
        { label: 'Embed path', value: 'src/backend/chroma/provider-embed.ts' },
        { label: 'Typical local embed', value: 'LM Studio text-embedding-mxbai-embed-large-v1' },
      ],
      contracts: [
        'resolveUserEmbedProviderAdapter(userId) for kb-rag only needs embed row, not chat',
        'Embedding truncates near 1250 chars per chunk for safety',
      ],
      patterns: [
        'When RAG fails with fetch failed, start LM Studio server and load embed model first',
        'Align embed model between ingest (reindex) and chat (same user) to keep scores meaningful',
      ],
      gotchas: [
        'Missing embed provider skips kb ingest on domain events with a warning, not a user-visible error',
      ],
      relatedSlugs: ['kb-document-rag', 'logs-and-diagnostics', 'personas'],
    },
  },
  {
    slug: 'agent-coding-standards',
    title: 'Agent coding standards (THE-LAB)',
    category: 'Agents',
    tags: ['standards', 'apps', 'mcp', 'dnd', 'theme'],
    sourcePath: 'AGENTS.md',
    body: [
      'When generating or editing THE-LAB code, agents must follow repository **AGENTS.md**',
      'non-negotiables. Highlights:',
      '',
      '- **App registry** — register apps through MCP/platform paths, not ad-hoc SQL.',
      '- **Vue ids** — `useUniqueElementId()` on every interactive control.',
      '- **Drag-and-drop** — `@vue-dnd-kit/core` only in `src/apps/**`.',
      '- **Theming** — `lab-*` Tailwind utilities and `--lab-*` tokens, no hard-coded hex.',
      '- **Decoupling** — core backend must not import `src/apps/knowledge-base/**`; read KB via MCP/db shape.',
      '- **Logging** — `VSCodeLogger`, not `console`, on the main backend.',
      '',
      'App rework that changes UX or integrations must update that app\'s',
      '`src/backend/db/Apps/app-instructions/*.ts` in the same change set.',
    ].join('\n'),
    agentView: {
      summary:
        'Repository AGENTS.md rules for apps, MCP, theme tokens, DnD kit, and KB decoupling — agents implementing code must obey these even when user prose omits them.',
      facts: [
        { label: 'DnD library', value: '@vue-dnd-kit/core' },
        { label: 'Theme utilities', value: 'bg-lab-*, text-lab-*, border-lab-*' },
        { label: 'Instruction sync', value: 'app-instructions → apps.app_system_instructions on backend init' },
      ],
      contracts: [
        'useUniqueElementId on every new Vue control',
        'KB core reads kb_articles via kb-reader, never imports KB app routes',
      ],
      patterns: [
        'Read lab_kb_app_context before driving an unfamiliar app',
        'Mirror integration binding flows with lab_integrations_* tools',
      ],
      gotchas: [
        'npm chromadb CLI on Windows x64 is unsupported — use Python chroma.exe (THE_LAB_CHROMA_BIN)',
        'Do not run npm scripts from LLM_Workspace parent — cd into the-lab',
      ],
      relatedSlugs: [
        'lab-app-ui-standards',
        'lab-integration-host-authoring',
        'catalog-workspace-ui-pattern',
        'theming-tokens',
        'writing-app-instructions',
        'how-form-and-chart-bindings-work',
      ],
    },
  },
  {
    slug: 'sidecar-chat-and-prompt-layers',
    title: 'Sidecar, chat, and prompt layers',
    category: 'Agents',
    tags: ['sidecar', 'chat', 'system-prompt', 'provider-service'],
    sourcePath: 'docs/platform/lab-sidecar.md',
    body: [
      'A single chat turn assembles **layers** onto the persona system message in',
      '`provider-service.ts` (stream and non-stream paths):',
      '',
      '1. Persona template and developer mode',
      '2. Lab Sidecar context (focused app, view mode)',
      '3. User display name',
      '4. Lab integrations routing (when the message matches integration workflows)',
      '5. **KB RAG slot A** appendix when enabled',
      '6. Sidecar chat-turn preparation',
      '',
      'The apps-view **Assistant** panel sends `labSidecarContext` so the model knows which app',
      'is focused. Open **Laboratory** for full-repo tools and personas with broader MCP access.',
    ].join('\n'),
    agentView: {
      summary:
        'System prompt is built in ordered layers on the main backend; sidecar context and KB RAG append before the model call.',
      facts: [
        { label: 'Assembly', value: 'src/backend/ai/provider-service.ts' },
        { label: 'Sidecar append', value: 'lab-sidecar-system-prompt.ts' },
        { label: 'KB slot A', value: 'kb-rag-preinject.ts when LAB_KB_RAG_SLOT_A=1' },
      ],
      contracts: [
        'Latest user message text drives slot A retrieval — must be a string user role message',
        'Integrations layer runs before KB RAG appendix',
      ],
      patterns: [
        'When testing RAG, watch backend logs for kb_rag_preinject JSON when LAB_STRUCTURED_LOGS=1',
      ],
      gotchas: [
        'Slot A does not add a user-visible chat bubble — only the system prompt grows',
      ],
      relatedSlugs: ['lab-sidecar', 'kb-document-rag', 'personas'],
    },
  },
  ...KB_WAVE2_AGENT_ARTICLES,
];

const REFERENCE: KbDocSeed[] = [
  {
    slug: 'glossary',
    title: 'Glossary',
    category: 'Reference',
    tags: ['glossary', 'terminology', 'shell'],
    sourcePath: 'docs/platform/lab-shell-terminology.md',
    body: [
      '**Laboratory** — the full-screen chat view (formerly "Lab Assistant view").',
      '**Apps workspace** — the app lobby and focused app view.',
      '**Host app** — an app that renders integration bindings.',
      '**Provider app** — Forms Builder or Chart Builder.',
      '**Slot** — a named placement on a host surface.',
      '**Binding** — slot → provider asset connection.',
      '**Persona** — an agent role with a system message and tool allowlist.',
      '**Seed pack** — idempotent demo or infrastructure data.',
    ].join('\n'),
  },
  {
    slug: 'service-ids',
    title: 'Service ids',
    category: 'Reference',
    tags: ['services', 'integration', 'ids'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      'Integration service ids are `<host>.<entity>.<action>` — for example',
      '`crm.contacts.create`, `task.list`, `help-desk.tickets.list`.',
      '',
      'Platform app registry ids are prefixed `app-lab-` for platform products and `app-` for the',
      'catalog. Folder names drop the prefix (`src/apps/lab-crm`, `src/apps/okr-goals`).',
    ].join('\n'),
  },
  {
    slug: 'the-account-and-contact-model',
    title: 'The account and contact model',
    category: 'Reference',
    tags: ['accounts', 'contacts', 'companies'],
    sourcePath: 'docs/platform/lab-app-integrations.md',
    body: [
      'CRM is the gold source for companies:',
      '- `accounts` — one row per company (`name`, `domain`, `industry`, `status`, `ownerId`).',
      '- `contacts` — people, with `company` (text mirror) **and** `companyId` (lookup).',
      '',
      'Other apps do not share a database with CRM, so they reference a company by its exact name',
      'in prose. The two hero accounts are **Northwind Labs** (Platform Starter expansion, closed at',
      '$24,000) and **Summit Health** (Premium Support, quote sent at $1,990); the other eight',
      'accounts are filler. Consistency comes from the canonical account list, not from a foreign',
      'key.',
      '',
      'External parties — job applicants, rental tenants, travel vendors — are deliberately **not**',
      'accounts.',
    ].join('\n'),
  },
];

const KB_DOC_ARTICLES_RAW: readonly KbDocSeed[] = [
  ...GETTING_STARTED,
  ...APP_ARTICLES,
  ...INTEGRATIONS,
  ...PLATFORM,
  ...OPERATIONS,
  ...AGENTS,
  ...REFERENCE,
];

function attachStructuredAgentView(article: KbDocSeed): KbDocSeed {
  if (article.agentView) {
    return article;
  }
  const view =
    KB_APP_AGENT_VIEWS[article.slug] ??
    KB_INTEGRATION_AGENT_VIEWS[article.slug] ??
    KB_REFERENCE_AGENT_VIEWS[article.slug] ??
    undefined;
  return view ? { ...article, agentView: view } : article;
}

/** Human `body` fields are expanded for readable prose; `agentView` is unchanged unless attached above. */
export const KB_DOC_ARTICLES: readonly KbDocSeed[] = KB_DOC_ARTICLES_RAW.map((article) =>
  enrichKbDocSeed(attachStructuredAgentView(article)),
);

/** Category → article count, for verification and the KB MCP server summary. */
export function kbDocsByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const article of KB_DOC_ARTICLES) {
    out[article.category] = (out[article.category] ?? 0) + 1;
  }
  return out;
}

export function kbDocsTagsFor(article: KbDocSeed): string {
  return [KB_DOCS_TAG_PREFIX + article.sourcePath, ...article.tags].join(',');
}

/** True when the documentation set has been seeded into this DB. */
export function hasKnowledgeBaseDocs(db: Database): boolean {
  const row = db
    .prepare(`SELECT 1 FROM kb_articles WHERE tags LIKE ? LIMIT 1`)
    .get(`%${KB_DOCS_TAG_PREFIX}%`);
  return Boolean(row);
}

export interface SeedKbDocsOptions {
  adminApply?: boolean;
}

export interface SeedKbDocsResult {
  inserted: number;
  /** Rows whose content was refreshed from the in-code article set. */
  updated?: number;
}

/**
 * Insert the documentation set, then reconcile previously seeded rows.
 *
 * Two passes on purpose:
 *
 * 1. **Insert** anything genuinely missing — matched on `slug` when available, else `title`
 *    (rows seeded before `slug` existed have no slug).
 * 2. **Reconcile** every row we own (`docs:` tag) so a code change to `body`, `agent_view` or
 *    `app_id` actually reaches an existing database. Without this, the seed is write-once and
 *    every content fix requires deleting rows.
 *
 * Step 2 is why `adminApply` no longer gates the *reconcile* pass: reconciliation is not
 * "make the demo data exist", it is "make the shipped content current".
 */
export function seedKnowledgeBaseDocsIfMissing(
  db: Database,
  options?: SeedKbDocsOptions,
): SeedKbDocsResult {
  ensurePersonIdColumn(db, 'kb_articles', 'author_id');
  ensureTextColumn(db, 'kb_articles', 'slug');
  ensureTextColumn(db, 'kb_articles', 'agent_view');
  ensureTextColumn(db, 'kb_articles', 'app_id');
  ensureTextColumn(db, 'kb_articles', 'source_path');

  const alreadySeeded = hasKnowledgeBaseDocs(db);
  if (alreadySeeded && !options?.adminApply) {
    // Still reconcile — content edits must land on existing installs.
    const reconciled = reconcileSeededDocs(db);
    return { inserted: 0, updated: reconciled };
  }

  let inserted = 0;
  for (const article of KB_DOC_ARTICLES) {
    const existing = db
      .prepare(
        `SELECT id FROM kb_articles WHERE slug = ? LIMIT 1`,
      )
      .get(article.slug) ?? db.prepare(`SELECT id FROM kb_articles WHERE title = ? LIMIT 1`).get(article.title);
    if (existing) {
      continue;
    }
    insertRow(db, 'kb_articles', {
      slug: article.slug,
      title: article.title,
      category: article.category,
      tags: kbDocsTagsFor(article),
      body: article.body,
      agent_view: article.agentView ? JSON.stringify(article.agentView) : null,
      app_id: article.appId ?? KB_DOC_APP_IDS[article.slug] ?? null,
      source_path: article.sourcePath,
      status: 'published',
      author: DEMO_ADMIN.name,
      author_id: DEMO_ADMIN.id,
      created_at: `${DEMO_TODAY}T08:00:00`,
      updated_at: `${DEMO_TODAY}T08:00:00`,
    });
    inserted += 1;
  }
  const updated = reconcileSeededDocs(db);
  return { inserted, updated };
}

/**
 * Push the current in-code content onto rows we own.
 *
 * Matches on `slug` first and falls back to `title`, because rows seeded before this change
 * carry neither a slug nor a `source_path`. Only touches articles tagged `docs:` so the demo
 * pack and user-authored articles are never overwritten.
 */
function reconcileSeededDocs(db: Database): number {
  const bySlug = db.prepare(`SELECT id FROM kb_articles WHERE slug = ? LIMIT 1`);
  const byTitle = db.prepare(`SELECT id FROM kb_articles WHERE title = ? LIMIT 1`);
  const update = db.prepare(
    `UPDATE kb_articles
     SET slug = ?, category = ?, tags = ?, body = ?, agent_view = ?, app_id = ?,
         source_path = ?, updated_at = ?
     WHERE id = ?`,
  );

  let updated = 0;
  for (const article of KB_DOC_ARTICLES) {
    const row =
      (bySlug.get(article.slug) as { id: number } | undefined) ??
      (byTitle.get(article.title) as { id: number } | undefined);
    if (!row) {
      continue;
    }
    update.run(
      article.slug,
      article.category,
      kbDocsTagsFor(article),
      article.body,
      article.agentView ? JSON.stringify(article.agentView) : null,
      article.appId ?? KB_DOC_APP_IDS[article.slug] ?? null,
      article.sourcePath,
      `${DEMO_TODAY}T08:00:00`,
      row.id,
    );
    updated += 1;
  }
  return updated;
}

/**
 * Remove the documentation set. Only rows carrying the `docs:` tag are touched, so the KB demo
 * pack and any user-authored articles survive.
 */
export function removeKnowledgeBaseDocs(db: Database): number {
  const result = db
    .prepare(`DELETE FROM kb_articles WHERE tags LIKE ?`)
    .run(`%${KB_DOCS_TAG_PREFIX}%`);
  return result.changes;
}

/** Boot-time entry point — never throws. */
export function runKnowledgeBaseDocsSeedOnBoot(db: Database): void {
  try {
    seedKnowledgeBaseDocsIfMissing(db);
  } catch (err) {
    console.warn(
      '[knowledge-base] documentation seed on boot failed:',
      err instanceof Error ? err.message : err,
    );
  }
}

export const kbDocsBootAdapter: DemoSeedBootAdapter = {
  bootFlagKey: KB_DOCS_BOOT_FLAG,
  has: hasKnowledgeBaseDocs,
  seed: seedKnowledgeBaseDocsIfMissing,
};
