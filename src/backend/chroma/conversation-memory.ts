import { ChatMessage, ChatRole, LLMProvider, MCPToolCall, SummarizedContext } from '../../shared/types';
import { chroma } from './chroma';
import { embedTexts } from './provider-embed';
import { VSCodeLogger } from '../utils/logger';
import { ProviderService } from '../ai/provider-service';
import {
  defaultSessionRetrieveLimit,
  resolveSessionDeleteFetchLimit,
  resolveSessionMessageFetchLimit,
  resolveSessionMessageLimit,
  resolveSummaryQueryLimit,
} from '../../shared/config/lab-chroma-limits';
import { isChromaAsyncWriteEnabled } from '../../shared/config/lab-chroma-write';
import {
  getChromaMemoryHealth,
  setChromaMemoryDegraded,
  setChromaMemoryHealthOk,
} from './chroma-memory-health';
export { getChromaMemoryHealth } from './chroma-memory-health';
interface BufferedTurn {
  sessionId: string;
  role: string;
  content: string;
  ts: number;
}
export class ConversationMemory {
  private static instance: ConversationMemory;
  private readonly pendingTurns = new Map<string, BufferedTurn>();
  public static getInstance() {
    if (!ConversationMemory.instance) ConversationMemory.instance = new ConversationMemory();
    return ConversationMemory.instance;
  }
  private turnKey(sessionId: string, ts: number, role: string): string {
    return `${sessionId}:${ts}:${role}`;
  }
  private async collection() {
    return chroma.getCollection({ name: 'chat-memory' });
  }
  private pendingForSession(sessionId: string): BufferedTurn[] {
    return [...this.pendingTurns.values()].filter((t) => t.sessionId === sessionId);
  }
  public async addTurn(params: {
    userId: number,
    sessionId: string;
    role: ChatRole;
    content: string;
    ts?: number;
    summary?: string;
    tool_calls?: MCPToolCall[];
    tool_call_id?: string;
  }) {
    const { userId, sessionId, role, content, summary, tool_calls, tool_call_id } = params;
    const ts = params.ts ?? Date.now();
    const key = this.turnKey(sessionId, ts, role);
    const documentText = this.documentTextForTurn(content, role, tool_calls, tool_call_id);
    this.pendingTurns.set(key, {
      sessionId,
      role,
      content: documentText,
      ts,
    });
    const runPersist = () =>
      this.persistTurn({
        userId,
        sessionId,
        role,
        ts,
        key,
        documentText,
        summary,
        tool_calls,
        tool_call_id,
      });
    const useAsync =
      isChromaAsyncWriteEnabled() && role !== 'user';
    if (useAsync) {
      void runPersist().catch(() => undefined);
      return;
    }
    await runPersist();
  }
  private documentTextForTurn(
    content: string,
    role: ChatRole,
    tool_calls?: MCPToolCall[],
    tool_call_id?: string,
  ): string {
    if (tool_calls && tool_calls.length > 0) {
      return `${JSON.stringify(tool_calls)}`;
    }
    if (role === 'tool' || tool_call_id) {
      return `${content}`;
    }
    return content;
  }
  private async persistTurn(args: {
    userId: number;
    sessionId: string;
    role: ChatRole;
    ts: number;
    key: string;
    documentText: string;
    summary?: string;
    tool_calls?: MCPToolCall[];
    tool_call_id?: string;
  }): Promise<void> {
    const {
      userId,
      sessionId,
      role,
      ts,
      key,
      documentText,
      summary,
      tool_calls,
      tool_call_id,
    } = args;
    try {
      const providerConfigs = await ProviderService.getInstance().ResolveProviderAdapter(userId);
      if (!providerConfigs?.embedProvider) {
        return;
      }
      const embedding = await this.safeEmbed(documentText, providerConfigs.embedProvider);
      if (!embedding) {
        return;
      }
      const col = await this.collection();
      const metadata = { sessionId, role, ts } as import('chromadb').Metadata;
      if (tool_calls && tool_calls.length > 0) {
        metadata.hasToolCalls = true;
        metadata.toolNames = tool_calls.map((tc) => tc.function.name).join(',');
      }
      if (tool_call_id) {
        metadata.toolCallId = tool_call_id;
      }
      await col.add({
        ids: [key],
        documents: [documentText],
        embeddings: [embedding],
        metadatas: [metadata],
      });
      if (summary) {
        const summaryEmbeddings = await embedTexts([summary], providerConfigs.embedProvider);
        const summaryEmbedding = summaryEmbeddings[0];
        await col.add({
          ids: [`${key}:summary`],
          documents: [summary],
          embeddings: [summaryEmbedding],
          metadatas: [{ sessionId, role, ts, type: 'summary' }],
        });
      }
      this.pendingTurns.delete(key);
      if (getChromaMemoryHealth().status !== 'unavailable') {
        setChromaMemoryHealthOk();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      (await VSCodeLogger.getInstance()).error(`Failed to store conversation message: ${msg}`);
      setChromaMemoryDegraded(msg);
    }
  }
  private async safeEmbed(text: string, provider: LLMProvider): Promise<number[] | null> {
    if (typeof text !== "string") text = String(text ?? "");
    const cleaned = text.trim();
    if (cleaned.length === 0) {
      return null;
    }
    const vectors = await embedTexts([cleaned], provider);
    const vec = vectors?.[0];
    if (!Array.isArray(vec) || vec.length === 0) {
      return null;
    }
    return vec;
  }
  public async retrieveRelevant(params: {
    sessionId: string;
    nResults?: number;
  }) {
    const { sessionId } = params;
    const nResults = resolveSessionMessageLimit(params.nResults ?? defaultSessionRetrieveLimit());
    const fetchLimit = resolveSessionMessageFetchLimit();
    let paired: Array<{ role: string; content: string; ts: number }> = [];
    try {
      const col = await this.collection();
      const res = await col.get({
        where: { sessionId },
        limit: fetchLimit,
      });
      if (process.env.VITE_LOGGING_ENABLED !== '0') {
        (await VSCodeLogger.getInstance()).json('[MEMORY]: retrieveAllForSession result', res);
      }
      const docs = res.documents ?? [];
      const metas = res.metadatas ?? [];
      paired = docs.map((doc, i) => {
        const meta = metas[i] ?? {};
        return {
          role: (meta.role as string) ?? 'unknown',
          content: doc ?? '',
          ts: typeof meta.ts === 'number' ? meta.ts : 0,
        };
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setChromaMemoryDegraded(msg);
    }
    for (const pending of this.pendingForSession(sessionId)) {
      paired.push({
        role: pending.role,
        content: pending.content,
        ts: pending.ts,
      });
    }
    paired.sort((a, b) => a.ts - b.ts);
    if (paired.length > nResults) {
      return paired.slice(-nResults);
    }
    return paired;
  }
  public async retrieveSummarizedContexts(params: {
    userId: number,
    sessionId: string;
    query: string;
    nResults?: number;
  }): Promise<SummarizedContext[]> {
    const { userId, sessionId, query } = params;
    const nResults = resolveSummaryQueryLimit(params.nResults);
    const providerConfigs = await ProviderService.getInstance().ResolveProviderAdapter(userId)
    if (providerConfigs && providerConfigs.embedProvider) {
      try {
        const [qEmbedding] = await embedTexts([query], providerConfigs.embedProvider);
        const col = await this.collection();
        const res = await col.query({
          queryEmbeddings: [qEmbedding],
          nResults,
          where: { sessionId, type: 'summary' },
        });
        const docs = (res.documents?.[0] ?? []).filter(Boolean);
        const metas = (res.metadatas?.[0] ?? []) as Array<{ role?: string; ts?: number; summary?: string }>;
        const paired = docs.map((d, i) => ({ doc: d, meta: metas[i] }));
        paired.sort((a, b) => (a.meta?.ts ?? 0) - (b.meta?.ts ?? 0));
        return paired.map(p => ({
          role: (p.meta?.role ?? 'unknown') as ChatRole,
          content: p.doc ?? '',
          summary: p.meta?.summary ?? '',
          ts: p.meta?.ts ?? 0,
        }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setChromaMemoryDegraded(msg);
        return [];
      }
    } else {
      throw 'No embedding provider has been supplied'
    }
  }
  public async deleteAllForSession(sessionId: string) {
    for (const [key, turn] of this.pendingTurns) {
      if (turn.sessionId === sessionId) {
        this.pendingTurns.delete(key);
      }
    }
    try {
      const col = await this.collection();
      const res = await col.get({
        where: { sessionId },
        limit: resolveSessionDeleteFetchLimit(),
      });
      const ids = res.ids ?? [];
      if (ids.length === 0) {
        return { deleted: 0 };
      }
      await col.delete({ ids });
      return { deleted: ids.length };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setChromaMemoryDegraded(msg);
      return { deleted: 0 };
    }
  }
  public async retrieveAsMessages(params: {
    sessionId: string;
    nResults?: number;
  }): Promise<ChatMessage[]> {
    const recalled = await this.retrieveRelevant(params);
    return recalled.map(m => ({
      role: m.role as ChatMessage['role'],
      content: m.content ?? ''
    }));
  }
  clearPendingTurnsForTests(): void {
    this.pendingTurns.clear();
  }
}
