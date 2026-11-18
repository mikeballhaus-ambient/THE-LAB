# THE-LAB — initial setup

Step-by-step guide for a new developer or operator bringing up THE-LAB locally. For day-to-day commands after install, see the root [README.md](../../README.md) and [lab stack](../operations/lab-stack.md).

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Matches Azure CI (`ubuntu-24.04`, Node 20.x). |
| **npm** | Use `npm ci` in the repo root (lockfile required). |
| **Git** | Clone the repository. |
| **ChromaDB server** | Conversation memory; started automatically by `npm run dev` / `lab:start`. On **Windows x64**, set `THE_LAB_CHROMA_BIN` to Python’s `chroma.exe` — see [.env.example](../../.env.example) and [lab stack](../operations/lab-stack.md). |
Optional: **Python 3** + `pip install neural-memory` if you use the **mcp-neuralmemory** MCP server in Cursor — [neural memory for agents](./neural-memory-for-agents.md).

---

## 2. Install

```bash
git clone <your-repo-url> the-lab
cd the-lab
npm ci
```

Copy environment template and edit as needed:

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Minimum for local dev (see [.env.example](../../.env.example) for the full list):

| Variable | Typical local value |
|----------|---------------------|
| `VITE_API_BASE_URL` | `http://localhost` |
| `VITE_API_BASE_PORT` | `3000` |
| `VITE_CHROMA_URL` | `localhost` |
| `LAB_FRONTEND_URL` | `http://localhost:5173` |
| `THE_LAB_CHROMA_BIN` | Path to `chroma.exe` on Windows (often required) |

Do **not** put OIDC client secrets in `.env` for normal operation — register IdPs in **Settings → Auth Providers** ([OIDC guide](../auth/oidc-jit-phase1.md)).

---

## 3. Start the lab

**Recommended (one terminal):**

```bash
npm run dev
```

This syncs app folders, starts Chroma, the main backend (**port 3000**), and Vite (**port 5173**).

**Alternative (orchestrated stack / smoke parity):**

```bash
npm run lab:start -- --wait-ready --detach
# … work …
npm run lab:stop
```

Details: [docs/operations/lab-stack.md](../operations/lab-stack.md).

Open the dashboard: **http://localhost:5173**

| Service | Port |
|---------|------|
| Main backend + Socket.IO | **3000** |
| Vite shell | **5173** |
| Chroma | **8000** |
| Hybrid/server apps | **4000–4999** (per app registry) |

---

## 4. First sign-in

1. Use the lab login dialog on the dashboard.
2. **Bootstrap admin** (seeded on first DB init): check your environment’s seed/bootstrap docs or operator notes for credentials. In dev, policy may force a password change when `REQUIRE_ADMIN_PASSWORD_RESET=1` or `LAB_PRODUCTION_PROFILE=1` — see [platform identity](../platform/platform-identity.md).
3. **Optional demo users** (local/testing): seeded users may use password `demo` when enabled — see `ensureSeedDemoUsers` in `src/backend/db/Auth/seed-demo-users.ts`.
4. **SSO**: configure **Settings → Auth Providers**, then use **Continue with Google/GitHub/Microsoft** — [OIDC JIT phase 1](../auth/oidc-jit-phase1.md).

Roles (`owner` / `admin` / `member` / `viewer`) control launch, settings, and catalog tag permissions. **Viewers cannot launch apps.**

---

## 5. Post-install configuration (UI)

Complete these in the running lab (order is flexible; providers before heavy chat use).

| Area | Where | Doc |
|------|--------|-----|
| **LLM provider** | Settings → Provider — Ollama, OpenAI-compatible, or OpenAI cloud; pick chat/embed models | [providers README](../../src/backend/ai/providers/README.md) |
| **Platform theme** | Settings → Administration → Themes (admin) | [platform theming](../platform/platform-theming.md) |
| **Auth providers** | Settings → Auth Providers | [OIDC](../auth/oidc-jit-phase1.md) |
| **MCP servers** | Settings → MCP Servers — enable defaults (`datetime`, `the-lab-db`, etc.) or add stdio/HTTP servers | Platform MCP in [AGENTS.md](../../AGENTS.md) |
| **Personas & tools** | Settings → Personas; tool allowlists seeded from `persona-tools-config.json` | [persona allowed tools](./persona-allowed-tools.md) |
| **Users & roles** | Settings → User Management | [platform identity](../platform/platform-identity.md) |
| **App order / tags** | Settings → Apps; catalog tags under app admin flows | [roadmap](../roadmap.md) (rm-51 / rm-51.5) |
| **Demo data packs** | Settings → App Demo Data (admin) | [rm-48.5 plan](../../plans/seed-data/rm-48-5-app-seed-data-settings.md) |

---

## 6. Optional integrations

### Environment-only keys (`.env`)

| Integration | Variables | If unused |
|-------------|-----------|-----------|
| **Context7** | `VITE_CONTEXT7_BASEURL`, `VITE_CONTEXT7_KEY` | Leave empty |
| **Web query (Ollama search, etc.)** | `VITE_WEB_QUERY_BASEURL`, `VITE_WEB_QUERY_API_KEY` | Leave empty |

### Neural Memory (Cursor MCP)

`pip install neural-memory`; enable **mcp-neuralmemory** in Cursor MCP config — [neural memory for agents](./neural-memory-for-agents.md).

---

## 7. Verify your environment

Match CI before pushing to `master`:

```bash
npm run lint && npm run type-check && npm run test && npm run build
```

Contract: [docs/ci/ci-v1-contract.md](../ci/ci-v1-contract.md).

Optional smoke (stack must be up or use `lab:start`):

```bash
npm run test:smoke
```

---

## 8. Related documentation

| Topic | Location |
|-------|----------|
| Architecture & agents | [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md) |
| Production / operator | [operator runbook](../operations/operator-runbook.md), [deploy checklist](../operations/production-deploy-checklist.md) |
| Lab messaging | [lab messaging](../platform/lab-messaging.md) |
| Apps (generate, ports) | Root README, `npm run generate:app` |

---

*Roadmap: [rm-52](../roadmap.md) — keep this folder aligned when bootstrap, auth, or stack behavior changes.*
