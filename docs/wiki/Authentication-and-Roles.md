# Authentication and Roles

## Local password login

Sessions use an HTTP cookie + JWT ([Lab session](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/auth/oidc-jit-phase1.md)). Sign in from the dashboard login screen.

**First boot:** default **Admin** / `admin` — change the password before others use the instance.

## OIDC (Google, GitHub, Microsoft Entra)

Configure in **Settings → Auth Providers** (SQLite), not by hand-editing production secrets in the repo.

Guide: [docs/auth/oidc-jit-phase1.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/auth/oidc-jit-phase1.md).

JIT users from IdPs get roles based on email verification policy (e.g. verified → **member**, else **viewer** until an admin upgrades).

## Global roles

| Role | Launch apps | Typical use |
|------|-------------|-------------|
| **owner** | Yes | Full control |
| **admin** | Yes | Settings, users, themes |
| **member** | Yes | Day-to-day builders |
| **viewer** | **No** | Read-only / SSO guests |

**Viewers cannot launch apps** — if someone “cannot open apps,” check role first.

## Identity vs app databases

THE-LAB **platform user id** (`users` in main DB) is product identity. Per-app reserved `users` tables are **not** your SSO directory — see [platform identity](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/platform/platform-identity.md).