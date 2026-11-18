import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { MCPToolInterface, MCPToolResponse } from '../../../shared/types';

type PendingReply = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const DEFAULT_MCP_ADAPTER_TIMEOUT_MS = 30_000;

/**
 * In-memory MCP tool wrapper (rm-46 **2.22** — per-request reply correlation).
 */
export class MCPToolAdapter implements MCPToolInterface<z.ZodTypeAny> {
  private static pendingReplies = new Map<string, PendingReply>();
  private static wiredTransports = new WeakSet<InMemoryTransport>();

  constructor(
    public id: string,
    public name: string,
    public description: string,
    public params: z.ZodTypeAny,
    private transport: InMemoryTransport,
  ) {
    MCPToolAdapter.ensureTransportHandler(this.transport);
  }

  private static ensureTransportHandler(transport: InMemoryTransport): void {
    if (MCPToolAdapter.wiredTransports.has(transport)) {
      return;
    }
    MCPToolAdapter.wiredTransports.add(transport);
    const priorOnMessage = transport.onmessage?.bind(transport);
    transport.onmessage = (message: unknown) => {
      const msg = message as { id?: unknown; result?: unknown } | null | undefined;
      if (msg?.id != null) {
        const pending = MCPToolAdapter.pendingReplies.get(String(msg.id));
        if (pending) {
          clearTimeout(pending.timeout);
          MCPToolAdapter.pendingReplies.delete(String(msg.id));
          pending.resolve(msg.result);
        }
      }
      if (priorOnMessage) {
        void priorOnMessage(message as Parameters<NonNullable<InMemoryTransport['onmessage']>>[0]);
      }
    };
  }

  async execute(params: z.infer<z.ZodTypeAny>): Promise<MCPToolResponse> {
    try {
      const requestId = Math.random().toString(36).substring(7);
      const timeoutMs = Number.parseInt(process.env.LAB_MCP_ADAPTER_TIMEOUT_MS ?? '', 10);
      const effectiveTimeout =
        Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_MCP_ADAPTER_TIMEOUT_MS;

      const responsePromise = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => {
          MCPToolAdapter.pendingReplies.delete(requestId);
          reject(new Error('MCP Tool Execution Timeout'));
        }, effectiveTimeout);
        MCPToolAdapter.pendingReplies.set(requestId, { resolve, reject, timeout });
      });

      await this.transport.send({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: this.id,
          arguments: params,
        },
      });

      const result = (await responsePromise) as {
        content?: Array<{ type: string; text?: string }>;
        isError?: boolean;
      };
      const firstItem = result.content?.[0];
      const textOutput =
        firstItem?.type === 'text' && firstItem.text ? firstItem.text : JSON.stringify(result.content || []);

      return {
        type: 'tool_result',
        tool_call_id: this.id,
        function: 'execute',
        content: textOutput,
        success: !result.isError,
      } as MCPToolResponse;
    } catch (error) {
      return {
        type: 'tool_result',
        tool_call_id: this.id,
        function: 'execute',
        content: `Execution error: ${(error as Error).message}`,
        success: false,
      } as MCPToolResponse;
    }
  }
}
