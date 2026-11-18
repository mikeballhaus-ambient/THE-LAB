# ADR: rm-46 auth spine (D-01, D-02, D-04, D-05)

**Status:** Accepted (implements team summary §2.1)  
**Date:** 2026-10-04

## Context

THE-LAB trusted client-supplied `userId` (HTTP body, `X-Lab-User-Id`, socket handshake) and CORS `origin: '*'`. rm-46 Gate A recorded **D-01 C** (cookie session + JWT), **D-02 B** (service token + user JWT on apps), **D-04 A** (no legacy auth), **D-05 B** (CORS allowlist in production).

## Decision

1. **Browser dashboard:** After password login, server creates a row in `lab_sessions`, sets **httpOnly** cookie `lab_session`, returns short-lived **user JWT** for `Authorization: Bearer` on API calls.
2. **Socket.IO:** Handshake must include **`labSessionId`** (server session id) or **`accessToken`** (JWT). Server validates; no trust of bare `userId` in `handshake.auth`.
3. **Platform HTTP** (`/app/launch`, `/platform/*`): `requirePlatformHttpUser` accepts session cookie or Bearer JWT only.
4. **App servers:** User JWT on app APIs; app→platform uses **`LAB_APP_SERVICE_TOKEN`** (injected by AppManager) plus acting user from validated JWT.
5. **Production:** `LAB_PRODUCTION_PROFILE=1` requires `LAB_ALLOWED_ORIGINS` and enforces MCP/tool policy (**D-03**).

## Consequences

- Clients must send `credentials: 'include'` on platform fetch/axios where cookies are used.
- OIDC/JIT (**1.16–1.17**) extends the same session/JWT issuance path later.
- No `LAB_AUTH_LEGACY` path.

## References

- [rm-46-team-review-summary.md](../../plans/roadmap/rm-46-team-review-summary.md) D-01–D-05
- [docs/platform/platform-identity.md](../platform/platform-identity.md)
- [IMPLEMENTATION-PLAN.md](../../plans/the-lab-optimization/IMPLEMENTATION-PLAN.md) Phase 1
