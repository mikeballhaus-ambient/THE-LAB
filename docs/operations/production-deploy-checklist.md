# Production deploy checklist

Operator checklist before exposing THE-LAB outside a trusted dev machine. Phase **1.14** — aligns with [rm-46 ADR](../adr/rm-46-auth-spine.md) and [IMPLEMENTATION-PLAN Phase 1](../../plans/the-lab-optimization/IMPLEMENTATION-PLAN.md).

Copy into your runbook and check items at deploy time. See also [production-readiness.md](../../plans/the-lab-optimization/production-readiness.md) (full draft).

## Required environment

| Variable | When | Notes |
|----------|------|--------|
| `LAB_PRODUCTION_PROFILE=1` | Staging/prod | Enables MCP policy + non-dev chat + CORS strict mode |
| `LAB_ALLOWED_ORIGINS` | Required if production profile | Comma-separated; startup fails if empty (`lab-cors.ts`) |
| `LAB_JWT_SECRET` | Required if production profile | Session/API JWT signing |
| `LAB_APP_SERVICE_TOKEN` | Required if production profile | App servers → platform `:3000` |
| `REQUIRE_ADMIN_PASSWORD_RESET=1` | Recommended | Or rely on production profile for default-admin reset |
| `LAB_FORMS_PUBLIC_SUBMIT_MAX` / `_WINDOW_MS` | Optional | Public form abuse; defaults 60/min — [forms-public-submit-rate-limit.md](../forms/forms-public-submit-rate-limit.md) |

Do **not** commit secrets; avoid putting secrets in `VITE_*`.

## Verify after deploy

### Authentication (code in tree — spot-check)

- [ ] Login sets cookie + Bearer; platform calls work without `X-Lab-User-Id` alone
- [ ] Spoofed `X-Lab-User-Id` on `/api/platform/*` without session/JWT/service token → **401**
- [ ] App API without user JWT → **401**; `/health` and public form submit still work
- [ ] `/app/launch` rejects body `userId` mismatch with authenticated user
- [ ] Forced password change flow if admin still on default password (when policy env set)

### Google OIDC (**DEV-007** — before **DEV-008**)

See [`oidc-jit-phase1.md`](../auth/oidc-jit-phase1.md).

- [ ] Settings → **Auth Providers** → Google enabled with client ID/secret; redirect URI registered in Google Cloud Console
- [ ] Settings → **Sign in with Google** completes OAuth; dashboard session works (cookie + chat)
- [ ] New JIT user with Google `email_verified` is **member** (can launch/teardown); unverified IdP email stays **viewer**
- [ ] SSO-only user cannot password-login

### MCP production matrix (`LAB_PRODUCTION_PROFILE=1`)

Enforced in `src/backend/utils/mcp-production-enforcer.ts` (see [mcp-production-policy.md](../mcp/mcp-production-policy.md)).

| Tool class | Policy |
|------------|--------|
| `run_terminal_command`, `app_management_execute_raw` | **owner/admin** only |
| File/app code-change tools | **owner/admin** OR `canUpdate` on resolved app id |
| `ui_automation` | Allowed (persona allowlist still applies) |
| HTTP MCP servers | Allowed for all roles |
| Stdio MCP (non-admin) | Blocked unless approved in **Settings → MCP → Request stdio access** (admin approves); see [mcp-production-policy.md](../mcp/mcp-production-policy.md) |

- [ ] Confirm member cannot run terminal in production profile
- [ ] Confirm member with app `canUpdate` can run scoped file tools for that app
- [ ] Developer mode toggle has no effect on system prompt when production profile is on

### Network & forms

- [ ] CORS only allows listed origins (browser + Socket.IO)
- [ ] Form submit rate limit returns **429** when exceeded (optional load test)

### Still manual / future phases

- [ ] Chroma `/ready`, backups, helmet/CSP, connector SSRF allowlist
- [x] Stdio MCP approval UI (**1.18**) — Settings → MCP servers
- [ ] CI green on release branch; smoke E2E per [playwright-smoke-v1.md](../../plans/the-lab-optimization/playwright-smoke-v1.md)

## Regression tests (local/CI)

```bash
npm run test
```

Auth/MCP coverage: `role-manager-matrix`, `auth-permission-matrix`, `platform-http-auth`, `lab-app-http-auth`, `mcp-production-enforcer` under `src/tests/`.
