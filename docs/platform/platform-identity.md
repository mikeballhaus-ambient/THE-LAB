# THE-LAB platform identity

Apps that need people (assignees, owners, agents) use **one identity source**: main SQLite `users` in `db/the_lab.db`. Store **`lab_user_id`** (`users.id`) in app data — do not duplicate email/name into per-app `users` tables.

**Team DMs (rm-50.4, complete):** Direct messages and read cursors in main DB key participants by `users.id`. Messaging roster uses `GET /api/platform/users`; display names match Settings (OIDC-aware). See [lab-messaging.md](lab-messaging.md).

## Three layers

| Layer | Where | Purpose |
|-------|--------|---------|
| **Identity** | `users` | id, name, email, avatar, status, global `role` |
| **Lab shell** | `user_global_permissions`, `user_app_permissions` | Launch/teardown/update app, view logs, manage users (settings UI) |
| **In-app domain** | `user_app_domain_roles` (main DB) | Product roles per app, e.g. `crm_agent`, `help_desk_supervisor` (API/UI TBD) |

`user_app_permissions` answers “can this person open the app in THE-LAB?” It does **not** mean “can be assigned this CRM deal.”

Per-app reserved table `users` (app SQLite template) is for legacy/template use only — **not** CRM, Task List, or help desk staff directories.

## HTTP API (main backend, port 3000)

Browser and hybrid app clients authenticate with **session cookie** (`lab_session`) and/or **`Authorization: Bearer`** (short-lived JWT from login). App servers call the same APIs with **`X-Lab-App-Service-Token`** plus **`X-Lab-User-Id`** (acting user validated on the app server).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Username/password → session cookie + access token |
| `POST` | `/auth/change-password` | Authenticated user changes password (required when `mustChangePassword`) |
| `POST` | `/auth/logout` | Clears session |

Platform JSON routes under `/api/platform/**` use the middleware in `platform-http-auth.ts` (no spoofed `X-Lab-User-Id` alone).

Legacy header **`X-Lab-User-Id`** without session/JWT/service token is rejected for platform APIs.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/platform/users` | Paginated list (`status`, `role`, `limit`, `offset`, `showSystemUser`) |
| `GET` | `/api/platform/users/:id` | Single public user DTO (`showSystemUser` optional) |
| `GET` | `/api/platform/users/lookup?q=` | Picker options `{ value, label, email? }[]` (`showSystemUser` optional) |

**Automation account:** reserved user **THE-LAB** (`users.id` **12**, workflow Messages sender). Omitted from list/lookup/`GET :id` unless `showSystemUser=true`. Lab **Messages** loads the roster with that flag so DM tabs can show the correct name; the new-DM picker still excludes this account. Settings user management never lists it.
| `GET` | `/api/platform/apps/server-urls` | Registry base URLs for server/hybrid apps (`?ids=app-lab-formsbuilder,app-lab-tasklist` optional) |

**App-scoped filter:** query `appId=app-lab-crm` or header `X-Host-App-Id` limits list/lookup to users with a `user_app_permissions` row for that app.

### Dependency app server URLs

Hybrid/server apps expose HTTP on their own ports. Any app that integrates with another (Forms Builder, Task List, Help Desk, future connectors) should call the platform endpoint instead of hard-coding ports or relying on shell-injected props:

```typescript
import { fetchPlatformAppServerUrls, getPlatformAppServerUrl } from '@/shared/services/platform-app-server-client';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';

const entries = await fetchPlatformAppServerUrls({
  ids: [FORMS_BUILDER_APP_ID],
});
const formsBuilderUrl = getPlatformAppServerUrl(entries, FORMS_BUILDER_APP_ID);
```

In Vue apps, `usePlatformAppServers({ ids: [...] })` loads the same data on mount. URLs are derived from the apps registry (`server.port`) and `VITE_API_BASE_URL` / `BACKEND_URL` host — adding a new connector app only requires registry metadata and listing its id in the consuming app’s dependency fetch list.

### Example (from lab shell or hybrid app)

```typescript
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';

const base = 'http://localhost:3000';

const res = await fetch(`${base}/api/platform/users?status=active&limit=50`, labPlatformFetchInit());
const body = await res.json();
// body.data.users — PlatformUserPublic[]
```

Lookup for typeahead:

```typescript
const res = await fetch(
  `${base}/api/platform/users/lookup?q=adm&appId=app-lab-crm`,
  labPlatformFetchInit({ headers: { 'X-Host-App-Id': 'app-lab-crm' } }),
);
// body.data — { value: number, label: string }[]
```

### Forced admin password change (production)

When `REQUIRE_ADMIN_PASSWORD_RESET=1` or `LAB_PRODUCTION_PROFILE=1`, user **1** keeps the default password `admin` only until first change; login sets `mustChangePassword` until `POST /auth/change-password` succeeds.

Types: `src/shared/types/platform-users.ts`.

## App servers

Hybrid apps on ports 4000–4999 may call port **3000** directly (CORS allows `X-Lab-User-Id`) or add a **proxy** route on the app server that forwards to the platform API with the caller’s user id.

## Demo users (local dev)

On every main backend startup, `ensureSeedDemoUsers()` upserts **10 test users** with fixed ids **2–11** (`src/backend/db/Auth/seed-demo-users.ts`). Password for all demo accounts (and default admin) is documented in auth seed: admin **`admin`**, demo users **`demo`**.

Use these ids in assignee/owner pickers and CRM `labUser` fields. User **1** remains the default admin.

## Related roadmap

- [rm-40](../../plans/roadmap/rm-40-platform-identity-api.md) — this delivery
- [rm-41](../../plans/roadmap/rm-41-task-list-platform-users.md) — Task List assignee
- [rm-42](../../plans/roadmap/rm-42-crm-platform-users.md) — CRM owner/assignee fields
