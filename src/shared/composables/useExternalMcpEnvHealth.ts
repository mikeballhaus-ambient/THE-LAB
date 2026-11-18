import { computed } from 'vue';

export interface ExternalMcpEnvGap {
  id: string;
  label: string;
  envHint: string;
  detail: string;
}

function hasEnv(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Surfaces optional external MCP dependencies missing from the Vite env (rm-46 **2.24**).
 */
export function useExternalMcpEnvHealth() {
  const gaps = computed((): ExternalMcpEnvGap[] => {
    const items: ExternalMcpEnvGap[] = [];
    const context7Key = import.meta.env.VITE_CONTEXT7_KEY;
    const context7Url = import.meta.env.VITE_CONTEXT7_BASEURL;
    if (!hasEnv(context7Key) && !hasEnv(context7Url)) {
      items.push({
        id: 'context7',
        label: 'Context7 documentation MCP',
        envHint: 'VITE_CONTEXT7_KEY (and optional VITE_CONTEXT7_BASEURL)',
        detail: 'Library docs tools will fail until a Context7 API key is configured.',
      });
    }
    return items;
  });

  const hasDegradedExternalMcp = computed(() => gaps.value.length > 0);

  return { gaps, hasDegradedExternalMcp };
}
