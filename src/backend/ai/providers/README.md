# LLM chat provider adapters

Agents adding or changing chat backends should follow this checklist. Lab Assistant and **Platform LLM** (`PlatformLlmCompletionService`, Time Wasters agents, etc.) share the same user Settings chat provider; they differ only by which fields are set on `ChatRequestPayload`.

## Contract (non-negotiable)

1. **Implement `LLMProvider`** (`src/shared/types/llm-provider.ts`), including **`resolveChatRequestOptions(config)`**.
2. **Delegate** `resolveChatRequestOptions` to **`mapChatRequestPayload(config)`** in `shared/chat-request-payload.ts`. Do not duplicate temperature, `reasoningEffort`, `maxTokens`, or `sampling` mapping in the adapter.
3. **Use** `this.resolveChatRequestOptions(config)` inside `makeChatRequest` (batch + stream) when building HTTP/SDK bodies.
4. **Register** the adapter in `src/backend/ai/provider-adapter-factory.ts` (`buildProviderAdapter` switch on `provider` name from SQLite).
5. **Extend tests** in `src/tests/backend/chat-request-payload.test.ts` (adapter file grep + `buildProviderAdapter` parity with mapper).

New adapters that skip step 2–3 will break platform agent turns (e.g. thinking models ignoring `reasoningEffort: 'none'`) while Lab chat may still look fine.

## `ChatRequestPayload`: Lab vs platform

| Field | Lab Assistant | Platform LLM / agents |
|--------|---------------|------------------------|
| `sessionId`, `persona`, `personaConfig` | Always | Always |
| `temperature` | Usually unset (persona reasoning temp) | Often `0` for deterministic JSON |
| `maxTokens` | Unset | Set when output must be capped |
| `reasoningEffort` | Unset | e.g. `'none'` to disable thinking on Qwen/LM Studio |
| `sampling` | Unset | `top_p`, penalties, `repeat_penalty` when needed |
| `structuralToolIds`, `requiredStructuralToolId` | Unset | Platform agent turns with mock tools (not persona MCP allowlist) |

**Rule:** If a field is unset, the mapper **omits** it from vendor requests (no defaults for platform-only knobs).

### Structural / mock tools (platform agents)

Lab personas filter tools via `personaConfig.tools`. Platform agent jobs (e.g. Time Wasters) register **structural** tool definitions on the backend (`src/backend/ai/structural-tools/`) and pass them through `ProviderService.completeAgentChatRequest()` or `POST /api/platform/llm/complete` with `structuralTool` on the request body.

Adapters must build the OpenAI tool list with **`resolveChatRequestTools()`** and **`resolveChatRequestToolChoice()`** (`shared/resolve-chat-request-tools.ts`) so structural ids are included. Use **string** `tool_choice` only (`auto` / `required` / `none`) — not `{ type: "function", … }` (LM Studio returns 400).

## Mapping output (`ResolvedChatRequestOptions`)

| Piece | Use when |
|--------|----------|
| `temperature` | All adapters |
| `openAiCompatExtras` | OpenAI SDK, LM Studio REST, any OpenAI-compatible `/chat/completions` — spread into request body |
| `ollamaOptions` + `ollamaThink` | Ollama adapter only (`think` + `options`) |

OpenAI-compat extras: `reasoning_effort: "none"` + `chat_template_kwargs.enable_thinking: false` when platform `reasoningEffort` is `none`; `enable_thinking: true` only when effort is non-`none` (binary Qwen3 thinking — not o-series effort tiers). Also `max_tokens`, sampling. See `buildOpenAiCompatRequestExtras()`.

## Reference implementations

| Provider | File | Transport |
|----------|------|-----------|
| OpenAI (incl. generic OpenAI-compatible base URL) | `openai-provider.ts` | OpenAI Node SDK |
| LM Studio | `lm-studio-provider.ts` | Native LM Studio REST + shared `open-ai-compat-chat-stream.ts` |
| Ollama | `ollama-provider.ts` | `ollama` npm client |

Streaming: reuse `shared/open-ai-compat-chat-stream.ts` for OpenAI-shaped SSE when possible.

## Capabilities matrix

After adding a provider name, update **`src/shared/config/lab-provider-capabilities.ts`** (`resolveProviderCapabilities`) so streaming, tool-call parsing, and leak extraction match the backend’s behavior.

## Embed provider

Chat adapters are built via `buildProviderAdapter`. Embed uses the same config shape; today Ollama/OpenAI embed paths live on the same classes. Keep embed behavior consistent with existing adapters when extending.

## Checklist for a new provider

- [ ] New `*-provider.ts` class implementing `LLMProvider`
- [ ] `resolveChatRequestOptions` → `mapChatRequestPayload`
- [ ] `getName()` matches the string used in Settings / `ai_providers` seed name
- [ ] `buildProviderAdapter` case added
- [ ] `lab-provider-capabilities.ts` entry if not covered by OpenAI-compatible fallback
- [ ] Tests in `chat-request-payload.test.ts`
- [ ] `npm run type-check-file` on new adapter; `npm run test:path chat-request-payload`

## Do not

- Map platform fields only in one adapter (OpenAI path is used for many local OpenAI-compatible URLs).
- Import `src/backend/**` from dashboard or app `front-end/` (unchanged platform rule).
- Change provider **metadata** in ad-hoc SQL without the normal AI provider / settings flows.
