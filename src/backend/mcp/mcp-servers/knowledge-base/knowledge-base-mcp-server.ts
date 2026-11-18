import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAppContext, getKnowledgeBaseArticle, searchKnowledgeBase } from './kb-reader';

/**
 * Knowledge Base MCP server (rm-64 §30.8a).
 *
 * Owner directive: agents must be able to discover usage and technical information from the
 * Knowledge Base. Every persona gets all three tools, seeded from
 * `src/backend/db/Persona/persona-tools-config.json`.
 *
 * **Two audiences, one article.** Humans read `body` (markdown, rendered in the app). Agents
 * get `agent_view` — the structured projection with facts, contracts, patterns and gotchas.
 * `lab_kb_get` returns the structured form when present and falls back to prose when not.
 *
 * **Tool descriptions drive selection** — an agent picks tools by reading the description, so
 * each one states *when* to use it and what it will not do.
 */

export const knowledgeBaseMcpServer = new McpServer({
  name: 'system-knowledge-base-server',
  version: '1.1.0',
});

const SEARCH_DESC =
  'Searches THE-LAB Knowledge Base articles (platform usage, app docs, integrations, operations, agents). ' +
  'Use this FIRST for any "how do I…", "what is…", "where do I configure…" or "which app does…" question about the lab, ' +
  'its apps, integrations, theming, personas or operations — before guessing or reading source. ' +
  'Pass `appId` to narrow to one registry app. ' +
  'Returns slug, title, category, tags and an agent summary. Published articles only by default. ' +
  'Follow up with lab_kb_get (prefer the slug over the id) for the full structured article.';

const GET_DESC =
  'Returns one Knowledge Base article in its agent-facing form: summary, facts, contracts, ' +
  'patterns, gotchas and live sources, followed by the human body as supporting context ' +
  '(UI-only `{{pi …}}` icon suffixes on `##` headings are stripped from that prose). ' +
  'Use this when a lab_kb_search snippet is not enough — for step-by-step procedures, ' +
  'integration contracts, table/column names or reference tables. ' +
  'If the article is tied to an app, follow up with lab_kb_app_context for that app\'s CURRENT ' +
  'system instructions — do not rely on an instructions copy inside the article.';

const APP_CONTEXT_DESC =
  'Returns the live registry record for a lab app: its CURRENT app_system_instructions (the ' +
  'authority for how to drive it with UI Automation), plus type, port, dependencies and ' +
  'enabled/system state. ' +
  'Use this whenever you are about to interact with an app through UI Automation, or when an ' +
  'article says "see this app\'s system instructions". ' +
  'This reads the platform registry at call time, so it never returns stale guidance. ' +
  'It is read-only and does not require app management permissions.';

const searchSchemaFields = {
  query: z
    .string()
    .optional()
    .describe('Free text matched against title, body, tags, category and the agent view (case-insensitive).'),
  category: z
    .string()
    .optional()
    .describe(
      'Exact category filter. Common values: Getting started, Apps, Integrations, Platform, Operations, Agents, Reference.',
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('All listed tags must be present. Seeded docs carry a `docs:<path>` tag.'),
  appId: z
    .string()
    .optional()
    .describe(
      'Registry app id to filter by, e.g. `app-forms-builder`. Use when the question is about one specific app.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum articles to return (default 10).'),
  includeUnpublished: z
    .boolean()
    .optional()
    .describe('Include drafts and archived articles. Leave false unless explicitly asked.'),
};

knowledgeBaseMcpServer.registerTool(
  'lab_kb_search',
  { description: SEARCH_DESC, inputSchema: searchSchemaFields },
  async (params) => {
    const result = await searchKnowledgeBase(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

const getSchemaFields = {
  articleId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Knowledge Base article id from a lab_kb_search result.'),
  slug: z
    .string()
    .optional()
    .describe(
      'Stable article slug (preferred over id — slugs survive a re-seed). From a lab_kb_search result.',
    ),
};

knowledgeBaseMcpServer.registerTool(
  'lab_kb_get',
  { description: GET_DESC, inputSchema: getSchemaFields },
  async (params) => {
    if (!params.slug && !params.articleId) {
      return {
        content: [
          {
            type: 'text',
            text: 'Provide either `slug` (preferred) or `articleId`. Get one from lab_kb_search.',
          },
        ],
        isError: true,
      };
    }
    const result = await getKnowledgeBaseArticle({
      articleId: params.articleId,
      slug: params.slug,
    });
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

const appContextSchemaFields = {
  appId: z
    .string()
    .min(1)
    .describe(
      'Registry app id, e.g. `app-forms-builder`, `app-crm`, `app-word-tile`. From lab_kb_search results or the app management tool.',
    ),
};

knowledgeBaseMcpServer.registerTool(
  'lab_kb_app_context',
  { description: APP_CONTEXT_DESC, inputSchema: appContextSchemaFields },
  async (params) => {
    const result = await getAppContext(params.appId);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

export const knowledgeBaseToolsManifest = [
  {
    id: 'lab_kb_search',
    name: 'Knowledge Base - Search',
    description: SEARCH_DESC,
    params: z.object(searchSchemaFields),
  },
  {
    id: 'lab_kb_get',
    name: 'Knowledge Base - Get Article',
    description: GET_DESC,
    params: z.object(getSchemaFields),
  },
  {
    id: 'lab_kb_app_context',
    name: 'Knowledge Base - App Context',
    description: APP_CONTEXT_DESC,
    params: z.object(appContextSchemaFields),
  },
];
