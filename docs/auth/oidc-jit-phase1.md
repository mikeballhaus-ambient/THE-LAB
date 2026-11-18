# OIDC / SSO (Phase 1.16–1.17, 1G)



**Status:** **Google**, **GitHub**, and **Microsoft Entra ID** sign-in routes are implemented. Configure each IdP under **Settings → Auth Providers**, or set matching `LAB_*_OIDC_*` keys in `.env` for empty rows (see boot-time seed below). End-to-end validation with real app registrations is tracked as **rm-47**.



## Database



- `user_auth_identities` — links `(provider, provider_subject)` → `users.id`

- `users.email_verified` — set when the IdP reports a verified email on sign-in



## Google sign-in



| Step | Behavior |

|------|----------|

| Login | `GET /auth/oidc/google/login` → Google → `GET /auth/oidc/google/callback` |

| JIT user | New users: no local password (`password_hash` NULL). When Google reports `email_verified`, JIT role is **`member`** with launch/teardown global permissions. If the IdP does not verify email, JIT role stays **`viewer`** (admin can upgrade). **`users.name`** stores the IdP display name (not a slug username). |

| Returning SSO | Same session model as password login (`LabSessionService` + `lab_session` cookie + JWT). Legacy JIT **viewer** rows are upgraded to **member** on login when Google still reports verified email. Legacy slug names from early JIT are upgraded to the IdP display name on sign-in when applicable. |

| Dashboard | After callback, redirect to `LAB_FRONTEND_URL` with `sso=1` query params; socket `USER_LOGIN` with `isAutoLogin` |



Password login is rejected for SSO-only users (no `passwordHash`).

## GitHub sign-in

| Step | Behavior |
|------|----------|
| Login | `GET /auth/oidc/github/login` → GitHub OAuth → `GET /auth/oidc/github/callback` |
| IdP type | **OAuth App** under GitHub Developer settings (not a GitHub App). |
| JIT user | Uses GitHub’s **verified primary email** (`user:email` scope). Verified email → **`member`** with launch/teardown; same promotion path as Google on return visits. |
| Redirect | Must match **Authorization callback URL** in the OAuth App exactly (default `{BACKEND_URL}/auth/oidc/github/callback`, port **3000**). |

### GitHub OAuth App checklist

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** lab dashboard in the browser (e.g. `http://localhost:5173` in local dev, or your production lab URL). Not the callback URL.
3. **Authorization callback URL:** `http://localhost:3000/auth/oidc/github/callback` (or your production backend URL + `/auth/oidc/github/callback`).
4. Copy **Client ID**; generate a **Client secret** (regenerate in GitHub if it expires).
5. **Settings → Auth Providers → GitHub:** enable, paste Client ID and secret, confirm redirect URI, **Save**.
6. Sign out and use **Continue with GitHub** on the lab login dialog.

## Microsoft Entra sign-in

| Step | Behavior |
|------|----------|
| JIT role | Successful Entra OAuth (valid id_token + resolvable email/`upn`) → **`member`** with launch/teardown permissions. Entra tokens often omit `email_verified`; workspace login is treated as verified. |
| Returning SSO | Existing Entra-linked **viewer** accounts are promoted to **member** on the next Entra login. |



There is **no separate lab email-verification link** — access is gated by **who can sign in** (admin-created users + configured OIDC), not by a second email round-trip.



## HTTP



| Route | Purpose |

|-------|---------|

| `GET /auth/oidc/config` | `{ providers: { google: boolean }, enabledProviderIds: string[] }` for UI |

| `GET /auth/oidc/google/login` | Start Google OAuth |

| `GET /auth/oidc/google/callback` | Code exchange + session + redirect to frontend |

| `GET /auth/oidc/:provider/login` | Start OAuth for `google`, `github`, or `microsoft-entra` |

| `GET /auth/oidc/:provider/callback` | OAuth callback + lab session |



## Configuration

**Settings → Auth Providers** always lists three IdPs: **Google**, **GitHub**, and **Microsoft Entra ID**. Each starts disabled until an owner/admin enables it and sets client ID, client secret (write-only in UI), and redirect URI. Values live in SQLite (`lab_oidc_providers`).

**Sign-in:** Each enabled provider with client ID and secret appears on the login screen via `GET /auth/oidc/config`.

All three IdPs use **Settings → Auth Providers** (SQLite `lab_oidc_providers`) only. The backend does **not** read client ID or secret from `.env` for login.

| Route | Purpose |
|-------|---------|
| `GET /auth/oidc/:provider/login` | Start OAuth (`google`, `github`, `microsoft-entra`) |
| `GET /auth/oidc/:provider/callback` | OAuth callback + lab session |
| `GET /auth/oidc/config` | Public flags for login UI |

| API | Role | Purpose |
|-----|------|---------|
| `GET /api/platform/oidc-providers` | owner/admin | All three providers (no secrets) |
| `PUT /api/platform/oidc-providers/:providerId` | owner/admin | Save settings for `google`, `github`, or `microsoft-entra` |

Suggested redirect URIs:

- `http://localhost:3000/auth/oidc/google/callback`
- `http://localhost:3000/auth/oidc/github/callback`
- `http://localhost:3000/auth/oidc/microsoft-entra/callback`

**Local `.env` seed (optional):** On backend bootstrap, `seedOidcProvidersFromEnv()` reads `LAB_*_OIDC_*` from `process.env` (`.env` via `dotenv/config`) and **upserts enabled providers into `lab_oidc_providers`** when that row has no client id and secret yet. **Settings → Auth Providers** wins once credentials exist in SQLite. Env vars do not override saved settings on later boots.



## Post-implementation



| DEV | Item |

|-----|------|

| **DEV-007** | Manual **Google** SSO smoke (env-based baseline) |

| **DEV-008** | **Auth Providers** tab + Google on registry (**1.30–1.31**, **1.34**) |

