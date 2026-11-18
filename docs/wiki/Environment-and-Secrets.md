# Environment and Secrets

## Copy the template

```bash
cp .env.example .env
```

Edit `.env` locally only — it is **gitignored** and must never be pushed.

## Safe vs sensitive

| Kind | Where it belongs |
|------|------------------|
| URLs, ports, feature flags | `.env` |
| **LLM API keys** | **Settings → AI providers** (SQLite), not committed files |
| **OIDC client secrets** | **Settings → Auth Providers** (SQLite); optional boot-time seed from `.env` on first run only |
| **JWT / app service token** | `.env` on servers you control (`LAB_JWT_SECRET`, `LAB_APP_SERVICE_TOKEN`) |
| Context7 / web search keys | `.env` optional MCP integrations (`VITE_*` also exposes keys to the browser bundle — avoid on untrusted networks) |

Do not put long-lived secrets in `VITE_*` variables for production; see [SECURITY.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/SECURITY.md).

## Windows Chroma

Set `THE_LAB_CHROMA_BIN` to your Python `chroma.exe` path — npm’s chromadb CLI does not support Windows x64 the same way Linux/macOS do.

## Linux CI note

The repo `.npmrc` sets `onnxruntime-node-install-cuda=skip` so `npm ci` works on headless agents (Chroma dependency). Your laptop install uses the same file.

## Provider docs

Adding or changing LLM backends: [src/backend/ai/providers/README.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/src/backend/ai/providers/README.md).