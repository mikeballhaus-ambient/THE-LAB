/** Fixed mini corpus for shared RAG pipeline tests (mirrors training spike snippets). */
export const KB_RAG_CORPUS_FIXTURE: Array<{ slug: string; body: string }> = [
  {
    slug: 'chat-memory',
    body: `**chat-memory** is not **kb-chunks**: it is session transcript storage, not a KB document index.
THE-LAB stores conversation turns in Chroma collection chat-memory.`,
  },
  {
    slug: 'kb-chunks',
    body: `**kb-chunks** is not **chat-memory**: it indexes published KB articles, not live chat turns.
Phase 2 adds Chroma collection kb-chunks for published Knowledge Base articles.`,
  },
  {
    slug: 'lab-kb-search',
    body: `The MCP tool lab_kb_search reads published articles via SQL/LIKE keyword search today.`,
  },
  {
    slug: 'kb-document-rag',
    body: `## Agent summary

Document RAG: Chroma collection kb-chunks, slot-A sysMsg appendix LAB_KB_RAG_SLOT_A, hybrid lab_kb_search LAB_KB_RAG_HYBRID_SEARCH, ingest on publish.

## Facts

- Index collection: kb-chunks (not chat-memory)
- Manual backfill: npm run kb-rag:reindex`,
  },
  {
    slug: 'app-workflow-studio',
    body: `## Agent summary

Browser Workflow Studio — graphs on platform port 3000; sole place to author automation, not Settings My workflows.

## Patterns

- workflow MCP for inspect; Sidecar context lab-workflow-studio-app`,
  },
  {
    slug: 'how-form-and-chart-bindings-work',
    body: `## Agent summary

Bindings link hostAppId slot to providerAppId providerRef form or chart; readiness missing_provider_asset if stub absent.

## Gotchas

- lab_integrations_provision before lab_integrations_upsert_binding`,
  },
  {
    slug: 'theming-tokens',
    body: `## Agent summary

All UI chrome uses --lab-* and bg-lab-* theme tokens; hard-coded hex breaks presets verify theme-colors CI.`,
  },
  {
    slug: 'lab-start-and-stop',
    body: `## Agent summary

lab start stop orchestrates Chroma Vite backend; lab services detached Chroma only port 8000 conflict lab stop reuse.`,
  },
];

export const KB_RAG_GOLDEN_QUERY = 'How is kb-chunks different from chat-memory?';