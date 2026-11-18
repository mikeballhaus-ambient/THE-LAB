# Getting Started

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Matches [CI](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/ci/ci-v1-contract.md) (Ubuntu 24.04, Node 20). |
| **npm** | Use `npm ci` (lockfile required). |
| **Git** | Clone from GitHub. |
| **ChromaDB** | Started by `npm run dev` / `lab:start`. On **Windows x64**, set `THE_LAB_CHROMA_BIN` to Python’s `chroma.exe` — see [.env.example](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/.env.example). |

Full walkthrough: [docs/setup/readme.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/setup/readme.md).

## Quick start

```bash
git clone https://github.com/mikeballhaus-ambient/THE-LAB.git
cd THE-LAB
npm ci
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Open the URL shown by Vite (typically **http://localhost:5173**). The main API is **http://localhost:3000**.

**Default admin:** user seeded as **Admin** with password `admin` on a fresh DB — change it before any shared or production use.

## What `npm run dev` starts

Chroma (with retries), Vite, and the main Fastify backend. Hybrid/server **catalog apps** spawn on demand (ports **4000–4999**), not all at once.

See [Stack and Ports](Stack-and-Ports) and [docs/operations/lab-stack.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/operations/lab-stack.md).

## Before you share the instance

Read [Environment and Secrets](Environment-and-Secrets) and [Production and Security](Production-and-Security). Localhost-only play is more forgiving; anything on a network needs production profile, secrets, and role awareness.