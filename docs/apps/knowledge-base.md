# Knowledge Base (`app-knowledge-base`)

The lab's documentation hub. Everything the platform knows about itself lives here, so you do
not have to read source to answer "how does this work".

## Two audiences, one article

Every article serves a person and an agent from a single row:

| Column | Reader | What it holds |
|---|---|---|
| `body` | **you** | Markdown, rendered as formatted text — headings, tables, lists, code |
| `agent_view` | **agents** | The same knowledge as `summary`, `facts`, `contracts`, `patterns`, `gotchas`, `liveSources` |
| `app_id` | link | The registry app this article documents, when it documents exactly one |
| `slug` | address | Stable id used when citing an article |
| `source_path` | provenance | The `docs/` file the article was authored from |

An article is written once for people and annotated once for agents. You only ever see the
human view; the structured view is what an agent receives when it queries the knowledge base.

**Roadmap (rm-69.5):** optional Workflow Studio path will generate `agent_view` from human
`body` via a one-shot platform LLM (same pattern as catalog games — structured tool, no Chroma)
and save to the database when articles are published. Until then, team articles are body-only for
agents; seeded `docs:` articles keep code-authored `agent_view`.

## Browsing

- **Search** — the box above the list filters title, body and tags as you type.
- **Category** — shown under each title; the seeded set is Getting started, Apps, Integrations,
  Platform, Operations, Agents and Reference.
- **Article pane** — renders the body with `renderKbArticleMarkdown()`: each `##` section becomes a
  card. Optional Reader icon: `## Title{{pi pi-info-circle}}` (PrimeIcons classes on the heading;
  omitted snippet → no icon).

## Editing

Create, edit and delete go through Forms Builder dialogs (the app hosts `knowledge-base.workspace`
with an `article` entity). The app never renders its own form.

## Seeded content

Two separate packs:

- **`kb-docs`** — the real operating manual, authored from `docs/` and tagged `docs:<path>`.
  This is infrastructure, not sample data; it is not in the removable demo set. On boot it
  reconciles existing rows, so an edit to the article source reaches an existing database
  instead of being write-once.
- **`kb-demo`** — six illustrative articles that exist so chart and Forms Builder pickers have
  something to point at. Removable.

## For agents

Three MCP tools, granted to **every persona**:

| Tool | Params | Use it for |
|---|---|---|
| `lab_kb_search` | `query`, `category`, `tags[]`, `appId`, `limit`, `includeUnpublished` | Finding the right article. Published only by default. |
| `lab_kb_get` | `slug` (preferred) or `articleId` | Reading one article in its structured form. |
| `lab_kb_app_context` | `appId` | An app's **current** `app_system_instructions`, plus type, port, dependencies and enabled state. |

The important discipline: **live platform state is never copied into an article.** A port number
or an instructions blob written into `agent_view.facts` goes stale the moment the registry
changes. Articles name the source in `liveSources`, and `lab_kb_app_context` resolves it at call
time by reading the platform registry in process.

`lab_kb_app_context` is read-only and requires no app management permission.

### Registry coverage

Every `LAB_*_APP_ID` constant is guaranteed to have an `apps` row by
`AppsRepository.initialize()`, and `src/tests/backend/platform-app-registry-coverage.test.ts`
fails if one is ever missing. Chart Builder was briefly unregistered despite being a required
dependency of Help Desk and Financial Ledger; that is now fixed and guarded.
