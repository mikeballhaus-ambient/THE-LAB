# THE-LAB operator runbook (rm-46 **5.4**)

Quick reference for staging/production incidents. See also [production-deploy-checklist.md](./production-deploy-checklist.md).

## Upgrade

1. Stop: SIGTERM main backend and app server processes (platform sends SIGTERM on app teardown).
2. Backup: run `npm run backup:lab` (see [backup-restore-drill.md](./backup-restore-drill.md)).
3. Pull/build; run migrations if any app DB bootstrap changed.
4. Start backend; verify `GET /health` → 200 and `GET /ready` → 200 with `checks.database` and `checks.chroma` ok.
5. Log in once; confirm chat initializes without socket auth errors.

## Chroma down

- **Symptoms:** Amber “degraded mode” banner; `/ready` returns 503 on `checks.chroma`.
- **Dev:** `LAB_CHROMA_DEGRADED_OK=1` allows boot; chat continues with limited recall.
- **Prod:** Restore Chroma service/data; restart backend after Chroma healthy.
- **Data path:** `chroma-data/` (see backup doc).

## Port conflict (app server)

- **Symptoms:** App launch fails; AppManager logs EADDRINUSE.
- **Fix:** Teardown zombie app from dashboard; verify no orphan `tsx` on app port (4000–4999).
- **Prevention:** Do not run two lab backends on **3000**.

## JWT / auth

- **Symptoms:** 401 on app APIs; socket disconnect after reconnect.
- **Fix:** Re-login; ensure `LAB_JWT_SECRET` stable across restarts in prod.
- **Apps:** Hybrid apps need user JWT on requests (`registerLabAppHttpAuth`).

## MCP / external services

- Settings → MCP Servers: amber banner lists missing optional env (Context7, web-query).
- Persona activate/response: in-process by default (`LAB_PERSONA_DIRECT_WORKFLOW=0` to opt out).

## Keys rotation

- Rotate `LAB_JWT_SECRET` → all sessions invalidate; users re-login.
- Rotate `LAB_APP_SERVICE_TOKEN` → update env on platform and every app server process.
- OIDC: update Google client secret in env; callback URL must match `resolveLabFrontendUrl`.

## Logs

- Backend: Fastify logger to stdout; optional file via `LOG_OUTPUT_PATH` when `VITE_LOGGING_ENABLED=1`.
