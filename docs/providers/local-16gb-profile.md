# Local 16GB development profile (rm-46 **2.20**)

Recommended defaults when running THE-LAB on a **~16GB RAM** machine with **local Ollama** (or similar). Tied to Phase 2 latency work **2.1–2.4**.

## Environment

| Variable | Suggested | Why |
|----------|-----------|-----|
| `LAB_CHROMA_ASYNC_WRITE` | `1` | Assistant/tool memory writes off the hot path |
| `LAB_CHROMA_DEGRADED_OK` | `1` (dev only) | Backend starts if Chroma is down; UI shows amber banner |
| `LAB_MCP_TOOL_UI_DELAY_MS` | `100` (default) | Lower tool before/after UI delay vs legacy 500ms |
| `LAB_PERSONA_DIRECT_WORKFLOW` | `1` | Persona activate/response in-process locally (default) |

## Chroma / context

- Session recall uses capped `nResults` (`lab-chroma-limits.ts`) — do not raise without measuring RAM.
- Tune **maxContext** in Settings → API Management for your GPU/RAM.

## Models

- Use models with reliable **native tool** support for agent workflows on local hardware.
- Ollama uses the same streaming + native tool path as OpenAI-compatible providers.

## Verification

1. `npm run dev` — note `[TEMPLATE-MANAGER] init() completed in …ms` in logs.
2. First chat message — compare TTFT vs [metrics-baseline.md](./metrics-baseline.md) and [metrics-phase-2.md](./metrics-phase-2.md).

See also [server-env-aliases.md](./server-env-aliases.md) and `.env.example`.
