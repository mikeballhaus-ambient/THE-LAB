# Provider profiles — rm-46 **2.11**

Settings lists **Ollama**, **OpenAI** (cloud or OpenAI-compatible via custom URL), and **LM Studio** (native LM Studio REST server).

## OpenAI provider (cloud or OpenAI-compatible)

| Field | OpenAI cloud | Custom URL (OpenAI-compatible gateway) |
|-------|--------------|----------------------------------------|
| Provider | OpenAI | OpenAI |
| Base URL | `https://api.openai.com/v1` (seed default) | Full OpenAI-compatible API base (include `/v1` if required by the gateway) |
| API key | Required | Per gateway |

Uses the OpenAI SDK with the **exact** base URL you enter (THE-LAB does not rewrite it). For OpenAI-compatible gateways (including LM Studio’s `/v1` server), set the full base such as `http://host:1234/v1`.

## LM Studio provider

| Field | Value |
|-------|--------|
| Provider | LM Studio |
| Base URL | Server address only, e.g. `http://10.0.0.216:1234` |
| API key | Optional (Bearer token if enabled in LM Studio) |

Uses LM Studio’s **native REST API** on that host ([docs](https://lmstudio.ai/docs/developer/rest)), for example:

- `GET /api/v1/models` — list models (fallback: `GET /api/v0/models`)
- `POST /api/v0/chat/completions` — chat (with tools when supported)
- `POST /api/v0/embeddings` — embeddings

Does **not** call OpenAI-compatible `GET /v1/models` on the server root.

Capability profile: **`openai-compatible`** in [lab-provider-capabilities.ts](../../src/shared/config/lab-provider-capabilities.ts) (streaming + native tools where the v0 API supports them).

## Embed quirks (OpenAI provider path)

The OpenAI SDK adapter sets `encoding_format: 'float'` on embeddings for compatible servers (see `openai-provider.ts`).

## Verification

1. Settings → API: **LM Studio** + server root, or **OpenAI** + `/v1` compatible URL.
2. Fetch models, test connection, save.
3. `npm run test:path "lm-studio-http|openai-compatible-base-url|provider-adapter-factory"`

See [local-16gb-profile.md](./local-16gb-profile.md) and [adr/rm-46-provider-capability-matrix.md](../adr/rm-46-provider-capability-matrix.md).
