## Chroma never connects

Backend retries then **exits** if Chroma is unavailable. Ensure Chroma starts (see `npm run dev` logs). On Windows, verify `THE_LAB_CHROMA_BIN`.

## App launch fails / port in use

App servers use **4000–4999**. Stale processes can hold a port — tear down the app from the UI or restart the lab stack.

## “Viewer cannot launch”

User role is **viewer** — upgrade in **Settings → Users** (admin/owner).

## Chat has no LLM response

Configure **Settings → AI providers** (model + API key or local endpoint such as Ollama/LM Studio). Providers are per-user rows in SQLite, not only `.env`.

## MCP tools missing

Personas have **allowlists** in the database. External MCP servers are per-user in Settings. Production profile may block stdio servers until approved.

## Build / CI failures after pull

```bash
rm -rf node_modules
npm ci
```

On Linux, `onnxruntime-node` CUDA skip is in repo `.npmrc` — do not remove on CI agents.

## More

Platform error log (maintainers): [docs/platform/errors.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/platform/errors.md) — type-check / lint debt snapshot, not runtime logs.

Operator runbook: [docs/operations/operator-runbook.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/operations/operator-runbook.md).