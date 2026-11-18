/** JSONL-shaped eval cases (offline embed; no Chroma). */

export type KbRagEvalCase = {
  query: string;
  expectSlugInTop3: string;
};

export const KB_RAG_EVAL_CASES: KbRagEvalCase[] = [
  {
    query: 'How is kb-chunks different from chat-memory?',
    expectSlugInTop3: 'kb-chunks',
  },
  {
    query: 'How is kb-chunks different from chat-memory?',
    expectSlugInTop3: 'chat-memory',
  },
  {
    query: 'lab_kb_search keyword SQL LIKE',
    expectSlugInTop3: 'lab-kb-search',
  },
  {
    query: 'kb-chunks slot A hybrid search reindex',
    expectSlugInTop3: 'kb-document-rag',
  },
  {
    query: 'author workflows not Settings My workflows port 3000',
    expectSlugInTop3: 'app-workflow-studio',
  },
  {
    query: 'hostAppId providerRef missing_provider_asset binding',
    expectSlugInTop3: 'how-form-and-chart-bindings-work',
  },
  {
    query: 'bg-lab theme tokens no hardcoded colors',
    expectSlugInTop3: 'theming-tokens',
  },
  {
    query: 'lab stop chroma port 8000 lab services',
    expectSlugInTop3: 'lab-start-and-stop',
  },
];