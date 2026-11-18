# ADR: rm-46 provider capability matrix (2.7)

**Status:** Accepted  
**Date:** 2026-10-04  
**Related:** [chat-provider-architecture.md](../../plans/the-lab-optimization/chat-provider-architecture.md), tasks **2.8–2.11b**

## Context

THE-LAB supports multiple chat backends: **Ollama** (local), **OpenAI-compatible** endpoints (e.g. LM Studio via OpenAI SDK + custom base URL), and **OpenAI** cloud. Adapters historically diverged (streaming, tools, recovery nudges), causing duplicate logic in `ProviderService` and fragile local-model behavior.

## Decision

1. **Single adapter factory** — `src/backend/ai/provider-adapter-factory.ts` (`buildProviderAdapter` / `createProviderAdapter`) is the only construction path for chat/embed adapters.
2. **Capability matrix** (product + engineering reference):

| Capability | Ollama (local) | OpenAI-compatible (LM Studio, etc.) | OpenAI |
|------------|----------------|-------------------------------------|--------|
| Chat completions | Yes (non-stream default) | Yes | Yes |
| **Streaming** | **No** (guard → non-stream fallback **2.11b**) | Yes (when endpoint supports SSE) | Yes |
| Native `tool_calls` | Model/API dependent; text fallback still used on weak models | Yes (when server supports tools) | Yes |
| Reasoning / thinking fields | Model-dependent (`thinking`) | Varies by server | Yes (model-dependent) |
| Embeddings | Ollama embed API | OpenAI-compatible `/embeddings` (float quirks documented in adapter) | OpenAI embeddings |
| Context usage metrics | Token estimate from Ollama counts | Usage when returned | Usage when returned |
| Typical dev profile | 16GB local default | Desktop LM Studio | Cloud API key |

3. **Stream guard** — When the user enables streaming but the adapter does not support it (Ollama today), `ProviderService.generateStreamResponse` logs, notifies via socket error message, and **delegates to non-stream** (`generateResponse`) without throwing.
4. **Recovery** — Empty / malformed-tool / reasoning-only retries live in `model-turn-recovery.ts` (**2.12**), not duplicated string blocks in `ProviderService`.
5. **OpenAI provider type in settings** — User selects provider **OpenAI** with a custom **base URL** for LM Studio and other compatible gateways; same adapter code path as OpenAI cloud.

## Consequences

- Streaming UX is reliable for OpenAI-compatible/OpenAI; Ollama users should keep session streaming off or accept automatic fallback.
- Future **2.10** (Ollama native tools) and **2.11** (explicit compatible profile flags) extend this matrix without new construction paths.
- Tests should mock all three configuration shapes before **2.19** matrix lands.

## References

- `src/backend/ai/providers/ollama-provider.ts`
- `src/backend/ai/providers/openai-provider.ts`
- `src/backend/ai/provider-adapter-factory.ts`
- `src/backend/utils/chat/model-turn-recovery.ts`
