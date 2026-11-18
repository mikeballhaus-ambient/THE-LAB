export interface ExternalMcpEnvGap {
  id: string;
  label: string;
  envHint: string;
  detail: string;
}

function hasEnv(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Server-side optional MCP dependency check (rm-46 **2.24**). */
export function evaluateExternalMcpEnvGaps(env: NodeJS.ProcessEnv = process.env): ExternalMcpEnvGap[] {
  const items: ExternalMcpEnvGap[] = [];

  const context7Key = env.VITE_CONTEXT7_KEY ?? env.CONTEXT7_API_KEY;
  const context7Url = env.VITE_CONTEXT7_BASEURL;
  if (!hasEnv(context7Key) && !hasEnv(context7Url)) {
    items.push({
      id: 'context7',
      label: 'Context7 documentation MCP',
      envHint: 'VITE_CONTEXT7_KEY (and optional VITE_CONTEXT7_BASEURL)',
      detail: 'Library docs tools will fail until a Context7 API key is configured.',
    });
  }

  const webQueryUrl = env.VITE_WEB_QUERY_BASEURL;
  const webQueryKey = env.VITE_WEB_QUERY_API_KEY;
  if (!hasEnv(webQueryUrl) || !hasEnv(webQueryKey)) {
    items.push({
      id: 'web-query',
      label: 'Web query MCP',
      envHint: 'VITE_WEB_QUERY_BASEURL and VITE_WEB_QUERY_API_KEY',
      detail: 'Web search tools are unavailable until both variables are set.',
    });
  }

  return items;
}
