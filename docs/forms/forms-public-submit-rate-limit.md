# Forms Builder — public submit rate limit

Unauthenticated submissions use **`POST /api/v1/forms/submit/:key`** (and v2) on the Forms Builder app server (default port **3011**). These routes skip user JWT but are rate-limited per client IP.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `LAB_FORMS_PUBLIC_SUBMIT_MAX` | `60` | Max submissions per window per client |
| `LAB_FORMS_PUBLIC_SUBMIT_WINDOW_MS` | `60000` | Window length in milliseconds |

Client key: `X-Forwarded-For` first hop when present, else Fastify `request.ip`.

## Response when limited

HTTP **429**, body `{ success: false, error: 'RATE_LIMIT_EXCEEDED', ... }`, header **`Retry-After`** (seconds).

## Code

- Config: `src/shared/config/forms-public-rate-limit.ts`
- Enforcer: `src/shared/server/forms-public-rate-limit.ts`
- Wired in: `src/apps/forms-builder/back-end/routes/load.ts` (submit handler only)

Load routes (`GET /api/v1/forms/load/:key`) require the normal app user Bearer JWT.
