import type { KbAgentViewSeed } from './seed-kb-docs';

/**
 * Structured agent views for {@link APP_ARTICLES} entries that do not inline `agentView`.
 * Merged in `seed-kb-docs.ts` before `enrichKbDocSeed`.
 */
export const KB_APP_AGENT_VIEWS: Readonly<Record<string, KbAgentViewSeed>> = {
  'app-crm': {
    summary:
      'Hybrid CRM on :3010 — metadata entities, Forms/Chart bindings, approvals, ledger, Task List and Help Desk integration slots.',
    facts: [
      { label: 'Registry id', value: 'app-lab-crm' },
      { label: 'Type', value: 'hybrid' },
      { label: 'Port', value: '3010' },
      { label: 'Company gold source', value: 'accounts entity + contacts.companyId lookup' },
    ],
    contracts: [
      'Integration slots crm.{entityKey}.*.dialog — no hard-coded form keys in host',
      'approval submit via POST /api/integrations/approval-request/submit on CRM server',
    ],
    patterns: [
      'lab_kb_app_context(app-lab-crm) before driving CRM UI or inventing entity fields',
      'Trace cross-app: related tasks → app-lab-tasklist; tickets → app-lab-helpdesk',
    ],
    gotchas: [
      'Demo CRM rows reset on app relaunch unless CRM_SKIP_DEMO_SEED=1 or demo pack removed',
      'company text mirror ≠ companyId — store both when binding Forms lookups',
    ],
    liveSources: ['lab_kb_app_context with appId="app-lab-crm"'],
    relatedSlugs: ['how-form-and-chart-bindings-work', 'lab-approvals-platform', 'app-task-list'],
  },
  'app-task-list': {
    summary:
      'Hybrid Task List on :3005 — host-scoped tasks; metadata JSON links back to CRM or other hosts.',
    facts: [
      { label: 'Registry id', value: 'app-lab-tasklist' },
      { label: 'Type', value: 'hybrid' },
      { label: 'Port', value: '3005' },
      { label: 'Assignee', value: 'assignee_id stringified platform users.id' },
    ],
    patterns: [
      'Workflow triggers: app-lab-tasklist.task.created / .task.completed',
      'Open from CRM related-task slot — do not duplicate task APIs in CRM server',
    ],
    gotchas: ['tasks.metadata is opaque JSON — parse hostAppId/record refs before assuming shape'],
    liveSources: ['lab_kb_app_context with appId="app-lab-tasklist"'],
    relatedSlugs: ['app-crm', 'workflows-rules-and-automation'],
  },
  'app-help-desk': {
    summary:
      'Hybrid Help Desk on :3012 — tickets, kanban, assignee and requester user links; CRM contact metadata.',
    facts: [
      { label: 'Registry id', value: 'app-lab-helpdesk' },
      { label: 'Type', value: 'hybrid' },
      { label: 'Port', value: '3012' },
      { label: 'Requester ids', value: 'requester_lab_user_id int; assignee_id string' },
    ],
    patterns: [
      'Bind charts via Chart Builder — separate report charts from host dashboard slots',
      'Reconcile ticket requester with CRM contact when metadata carries contact ref',
    ],
    gotchas: ['Hybrid UI uses props.serverUrl — ticket APIs are not on platform :3000'],
    liveSources: ['lab_kb_app_context with appId="app-lab-helpdesk"'],
    relatedSlugs: ['app-crm', 'app-chart-builder'],
  },
  'app-workflow-studio': {
    summary:
      'Browser Workflow Studio — graphs on platform :3000; sole place to author automation (not Settings).',
    facts: [
      { label: 'Registry id', value: 'app-lab-workflow-studio' },
      { label: 'Type', value: 'browser (no app server port)' },
      { label: 'API', value: '/api/platform/lab-workflows on :3000' },
    ],
    contracts: [
      'Event types from lab-domain-events.manifest.ts — no hand-typed strings',
      'Person-targeted steps need *_user_id fields, not display names only',
    ],
    patterns: [
      'workflow MCP for inspect; UI automation only when canvas must be seen',
      'Sidecar context lab-workflow-studio-app — do not relaunch when already mounted',
    ],
    gotchas: [
      'Settings → My workflows removed — send users to Workflow Studio app',
      'rule_ref steps need Rules Engine library rows — rules do not auto-run alone',
    ],
    liveSources: ['lab_kb_app_context with appId="app-lab-workflow-studio"'],
    relatedSlugs: ['workflows-rules-and-automation', 'lab-rules-engine', 'lab-domain-events-for-agents'],
  },
  'app-approvals': {
    summary:
      'Browser Approvals & Policies — inbox and policy editor; platform approvals API on :3000.',
    facts: [
      { label: 'Registry id', value: 'app-lab-approvals-policies' },
      { label: 'Type', value: 'browser' },
      { label: 'sourceAppId', value: 'platform-approvals' },
    ],
    patterns: [
      'Decide flows use Forms decide dialogs + Approvals inbox — trace CRM raise_approval graphs',
      'Settings → Approvals for policy CRUD when automating admin paths',
    ],
    gotchas: ['Policies do not notify by themselves — workflows must include notify steps'],
    liveSources: ['lab_kb_app_context with appId="app-lab-approvals-policies"'],
    relatedSlugs: ['lab-approvals-platform', 'app-crm'],
  },
  'app-financial-ledger': {
    summary:
      'Browser Financial Ledger UI over platform ledger — integer cents, balanced entries, CRM post dialog.',
    facts: [
      { label: 'Registry id', value: 'app-lab-financial-ledger' },
      { label: 'Type', value: 'browser' },
      { label: 'Accounts', value: 'lab_ledger_accounts codes — not customer FKs' },
    ],
    patterns: [
      'Prefer platform ledger API / CRM crm.ledger.* bindings over raw SQL',
      'Pair with lab-financial-ledger-platform article for event types',
    ],
    gotchas: [
      'Customer names live in entry memo text — accounts table is COA only',
      'Demo journal purge on restart when demo ledger pack enabled',
    ],
    liveSources: ['lab_kb_app_context with appId="app-lab-financial-ledger"'],
    relatedSlugs: ['lab-financial-ledger-platform', 'app-crm'],
  },
  'app-app-builder': {
    summary:
      'Browser App Builder — catalog tags and scaffolding; registry metadata via App Management MCP, not SQL.',
    facts: [
      { label: 'Registry id', value: 'app-lab-app-builder' },
      { label: 'Type', value: 'browser' },
    ],
    patterns: [
      'app_management_* tools for id, port, dependencies after scaffold',
      'Tags drive catalog browse — keep tag ids stable when demoing',
    ],
    gotchas: ['New apps need manifest + entry + useUniqueElementId — follow agent-coding-standards'],
    liveSources: ['lab_kb_app_context with appId="app-lab-app-builder"'],
    relatedSlugs: ['agent-coding-standards', 'writing-app-instructions', 'app-knowledge-base'],
  },
  'app-okr-goals': {
    summary: 'Catalog OKR app — objectives and key results; owner_id mirrors platform user.',
    facts: [{ label: 'Registry id', value: 'app-okr-goals' }, { label: 'Owner', value: 'owner_name mirrors owner_id' }],
    patterns: ['Forms Builder dialogs for objective/kr CRUD — check bindings before UI automation'],
    gotchas: ['Progress derived from key results — edit KR weights, not hard-coded % in host'],
    liveSources: ['lab_kb_app_context with appId="app-okr-goals"'],
    relatedSlugs: ['app-forms-builder'],
  },
  'app-travel-itinerary': {
    summary: 'Catalog travel app — trips and ordered itinerary items; no lab user columns.',
    facts: [{ label: 'Registry id', value: 'app-travel-itinerary' }],
    patterns: ['Use form.surface bindings for trip/item dialogs'],
    gotchas: ['External vendors — not CRM accounts unless explicitly linked in prose'],
    liveSources: ['lab_kb_app_context with appId="app-travel-itinerary"'],
    relatedSlugs: ['the-account-and-contact-model'],
  },
  'app-project-charter': {
    summary: 'Catalog charter app — sponsor_id + stakeholders_owner_id mirror text fields.',
    facts: [{ label: 'Registry id', value: 'app-project-charter' }],
    patterns: ['Parse stakeholders list — lead maps to stakeholders_owner_id'],
    gotchas: ['Semicolon-separated stakeholders string — do not split on commas only'],
    liveSources: ['lab_kb_app_context with appId="app-project-charter"'],
    relatedSlugs: ['app-forms-builder'],
  },
  'app-time-tracking': {
    summary: 'Catalog time tracking — entries with user_id (phase 31); week_key ISO grouping.',
    facts: [{ label: 'Registry id', value: 'app-time-tracking' }, { label: 'user_id', value: 'added phase 31 — no historical backfill' }],
    patterns: ['Submit-week action drives status transitions — automate via UI, not invented API'],
    gotchas: ['Legacy rows may lack user_id — do not assume every entry has assignee'],
    liveSources: ['lab_kb_app_context with appId="app-time-tracking"'],
    relatedSlugs: ['app-task-list'],
  },
  'app-job-applicant-tracker': {
    summary: 'Catalog hiring pipeline — external candidates, not lab users.',
    facts: [{ label: 'Registry id', value: 'app-job-applicant-tracker' }],
    patterns: ['Kanban stage changes via inline edit or bound forms'],
    gotchas: ['applicants.email/name are candidates — never JIT as platform users'],
    liveSources: ['lab_kb_app_context with appId="app-job-applicant-tracker"'],
    relatedSlugs: ['the-account-and-contact-model'],
  },
  'app-suggestion-box': {
    summary: 'Catalog ideas — votes, status workflow, author_id mirror.',
    facts: [{ label: 'Registry id', value: 'app-suggestion-box' }],
    patterns: ['Statuses: open → planned → in-progress → done | declined'],
    gotchas: ['Vote counts are not ledger amounts — separate from expense/ledger flows'],
    liveSources: ['lab_kb_app_context with appId="app-suggestion-box"'],
    relatedSlugs: ['app-polls-surveys'],
  },
  'app-expense-reports': {
    summary: 'Catalog expenses — amount_cents integer; approval/ledger linkage is workflow follow-on.',
    facts: [
      { label: 'Registry id', value: 'app-expense-reports' },
      { label: 'Amount', value: 'amount_cents integer' },
    ],
    patterns: ['Status inline: draft → submitted → approved → reimbursed | rejected'],
    gotchas: ['No direct schema FK to ledger yet — use workflows + approvals articles for E2E'],
    liveSources: ['lab_kb_app_context with appId="app-expense-reports"'],
    relatedSlugs: ['app-approvals', 'lab-approvals-platform'],
  },
  'app-training-quizzes': {
    summary: 'Catalog training — JSON question options, correct_index, derived passed flag.',
    facts: [{ label: 'Registry id', value: 'app-training-quizzes' }],
    patterns: ['Quiz runner UI for attempts — learner_id mirrors platform user'],
    gotchas: ['passed derived from passing_score — edit quiz meta, not attempt row directly'],
    liveSources: ['lab_kb_app_context with appId="app-training-quizzes"'],
    relatedSlugs: ['app-onboarding-checklist'],
  },
  'app-onboarding-checklist': {
    summary: 'Catalog onboarding — checklist per new_hire_id; task owner_id mirrors.',
    facts: [{ label: 'Registry id', value: 'app-onboarding-checklist' }],
    patterns: ['Task statuses: todo | doing | done'],
    gotchas: ['new_hire must be platform user id — not external candidate'],
    liveSources: ['lab_kb_app_context with appId="app-onboarding-checklist"'],
    relatedSlugs: ['app-training-quizzes'],
  },
  'app-weather-dashboard': {
    summary: 'Catalog weather — saved locations and observations; live API is follow-on.',
    facts: [{ label: 'Registry id', value: 'app-weather-dashboard' }],
    patterns: ['Record observations in MVP — do not assume live radar without env config'],
    gotchas: ['No person column — do not bind user pickers unnecessarily'],
    liveSources: ['lab_kb_app_context with appId="app-weather-dashboard"'],
    relatedSlugs: [],
  },
  'app-home-maintenance': {
    summary: 'Catalog home maintenance — assets and tasks with priority/due statuses.',
    facts: [{ label: 'Registry id', value: 'app-home-maintenance' }],
    patterns: ['Order tasks by due date in UI automation smoke tests'],
    gotchas: ['Statuses: scheduled | due | done | skipped — not CRM pipeline stages'],
    liveSources: ['lab_kb_app_context with appId="app-home-maintenance"'],
    relatedSlugs: [],
  },
  'app-rental-property': {
    summary: 'Catalog rentals — cents columns; tenant_name is external tenant.',
    facts: [
      { label: 'Registry id', value: 'app-rental-property' },
      { label: 'Money', value: 'monthly_rent_cents, rental_payments.amount_cents' },
    ],
    patterns: ['Treat tenants as external parties — parallel to job applicants pattern'],
    gotchas: ['Do not create CRM accounts for every tenant unless demo script requires it'],
    liveSources: ['lab_kb_app_context with appId="app-rental-property"'],
    relatedSlugs: ['the-account-and-contact-model'],
  },
  'app-event-rsvp': {
    summary: 'Catalog events — guest_user_id mirror on guest_name; yes/no/maybe responses.',
    facts: [{ label: 'Registry id', value: 'app-event-rsvp' }],
    patterns: ['Headcounts derive from RSVP list — refresh after bulk edits'],
    gotchas: ['guest_name is display mirror — persist guest_user_id for integrations'],
    liveSources: ['lab_kb_app_context with appId="app-event-rsvp"'],
    relatedSlugs: ['app-polls-surveys'],
  },
  'app-polls-surveys': {
    summary: 'Catalog polls — voter_id mirror; draft/open/closed lifecycle.',
    facts: [{ label: 'Registry id', value: 'app-polls-surveys' }],
    patterns: ['Single vs multi choice enforced in UI — match poll metadata before automating votes'],
    gotchas: ['Closed polls reject votes — change status before UI automation retries'],
    liveSources: ['lab_kb_app_context with appId="app-polls-surveys"'],
    relatedSlugs: ['app-suggestion-box'],
  },
  'app-games': {
    summary:
      'Nine multiplayer game apps — domain events for workflows; no single app_id; optional LLM opponents.',
    facts: [
      { label: 'Scope', value: '9 separate registry apps — no unified app_id on this article' },
      { label: 'Identity', value: 'No person/company columns — demo seed intentionally empty' },
    ],
    patterns: [
      'Call lab_kb_app_context per game id (solitaire, chess, …) — never one context for all nine',
      'Workflow Studio listens to game domain events — see lab-quarks-virtual-bank for play-money; lab-quarks-hints for hint SKUs',
    ],
    gotchas: [
      'Do not expect CRM/task bindings on game surfaces',
      'Multiplayer sockets are per-game server ports from registry',
    ],
    relatedSlugs: [
      'lab-games-and-lab-assistant',
      'lab-quarks-virtual-bank',
      'lab-quarks-hints',
      'workflows-rules-and-automation',
    ],
  },
};

/** Reference articles — ids and terminology local models confuse easily. */
export const KB_REFERENCE_AGENT_VIEWS: Readonly<Record<string, KbAgentViewSeed>> = {
  glossary: {
    summary:
      'Shell vocabulary: Laboratory vs Apps workspace, host vs provider, slot/binding, persona, seed pack.',
    patterns: [
      'Laboratory = full-screen chat; Apps workspace = lobby + focused app',
      'Provider = Forms Builder or Chart Builder; host declares slots',
    ],
    gotchas: ['Persona ≠ platform user — persona is agent role + tool allowlist'],
    relatedSlugs: ['what-is-the-lab', 'personas', 'how-form-and-chart-bindings-work'],
  },
  'service-ids': {
    summary:
      'Integration services use host.entity.action; registry ids use app-lab-* (platform) vs app-* (catalog).',
    facts: [
      { label: 'Service pattern', value: 'crm.contacts.create, help-desk.tickets.list' },
      { label: 'Folder rule', value: 'src/apps/lab-crm — drops app-lab- prefix' },
    ],
    patterns: ['Resolve registry id via lab_kb_app_context — never guess port from folder name'],
    gotchas: ['KB slug app-crm maps to registry app-lab-crm — see KB_DOC_APP_IDS'],
    relatedSlugs: ['app-crm', 'launching-an-app', 'glossary'],
  },
  'the-account-and-contact-model': {
    summary:
      'CRM accounts are company gold source; contacts have company + companyId; other apps use prose names, not shared FK.',
    facts: [
      { label: 'Hero accounts', value: 'Northwind Labs, Summit Health' },
      { label: 'External parties', value: 'applicants, tenants — not CRM accounts' },
    ],
    contracts: ['Store companyId on contacts — text mirror is display only'],
    patterns: ['When demoing revenue, cite Northwind/Summit names consistently across apps'],
    gotchas: ['Catalog apps do not join CRM DB — no automatic company FK outside CRM'],
    relatedSlugs: ['app-crm', 'app-rental-property', 'app-job-applicant-tracker'],
  },
};

/** Integration articles that benefit from structured retrieval. */
export const KB_INTEGRATION_AGENT_VIEWS: Readonly<Record<string, KbAgentViewSeed>> = {
  'how-form-and-chart-bindings-work': {
    summary:
      'Bindings link hostAppId + slot to providerAppId + providerRef; readiness missing_provider_asset if stub absent.',
    facts: [
      { label: 'Kinds', value: 'form | chart' },
      { label: 'Providers', value: 'app-lab-formsbuilder | app-lab-chartbuilder' },
    ],
    contracts: [
      'Never report connected without readiness check',
      'lab_integrations_provision_* before lab_integrations_upsert_binding',
    ],
    patterns: [
      'Trace slot name in host manifest → binding row → providerRef formKey/chartKey',
      'lab_kb_app_context on host + provider when debugging empty dialog regions',
    ],
    gotchas: [
      'Binding can exist while provider asset missing — provision stub first',
      'providerRef for charts equals chartKey',
    ],
    relatedSlugs: ['app-forms-builder', 'app-chart-builder', 'lab-ui-automation'],
  },
  'the-connector-model': {
    summary:
      'App connectors under /api/connector expose discovery contracts — lab-user vs lookup pickers, enum options.',
    facts: [
      { label: 'lab-user lookup', value: 'platform users.id person picker' },
      { label: 'lookup provider', value: 'same-app entity e.g. CRM accounts' },
    ],
    patterns: [
      'Forms Builder consumes discovery hub output — hosts must not duplicate picker SQL',
      'Connector list drives which fields render as pickers vs free text',
    ],
    gotchas: ['Missing discovery row → plain text field even when id column exists'],
    relatedSlugs: ['app-forms-builder', 'adding-an-integration-provider'],
  },
  'adding-an-integration-provider': {
    summary:
      'Provider rollout: manifest service → publish connector → upsert binding → provision stub for readiness.',
    contracts: [
      'lab_integrations_upsert_binding records binding — not implied by manifest alone',
      'Unbind demotes integration-only deps and removes orphaned stubs',
    ],
    patterns: ['Order: declare → connector → provision_* → upsert_binding → verify readiness'],
    gotchas: ['missing_provider_asset until stub exists — same as bindings article'],
    relatedSlugs: ['how-form-and-chart-bindings-work', 'the-integration-wizard'],
  },
  'the-integration-wizard': {
    summary:
      'Settings UI for slot → provider → asset → placement; same validation as lab_integrations_* MCP tools.',
    patterns: [
      'Agents: prefer lab_integrations_* when wizard steps are slow for locals',
      'Placement defaults from host manifest — unconfigured binding still renders region',
    ],
    gotchas: ['Wizard and MCP share validation — errors match across UI and tools'],
    relatedSlugs: ['lab-ui-automation', 'mcp-servers', 'adding-an-integration-provider'],
  },
};