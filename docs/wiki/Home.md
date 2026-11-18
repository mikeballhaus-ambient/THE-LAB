# THE-LAB — running it yourself

Welcome. This wiki is for **operators and contributors** who clone [THE-LAB](https://github.com/mikeballhaus-ambient/THE-LAB) and run it on their own machine or server — not the in-app Knowledge Base (that’s for agents when the stack is up).

## Start here

| Topic | Page |
|-------|------|
| Install and first run | [Getting Started](Getting-Started) |
| Ports, processes, data on disk | [Stack and Ports](Stack-and-Ports) |
| `.env`, secrets, LLM keys | [Environment and Secrets](Environment-and-Secrets) |
| Login, roles, SSO | [Authentication and Roles](Authentication-and-Roles) |
| Exposing beyond localhost | [Production and Security](Production-and-Security) |
| Pull updates, CI expectations | [Updating from GitHub](Updating-from-GitHub) |
| Common failures | [Troubleshooting](Troubleshooting) |
| What’s shipped vs planned | [Roadmap and Status](Roadmap-and-Status) |

## What you are running

THE-LAB is **one agentic workspace**: Laboratory (full-screen assistant with MCP tools) plus an **apps workspace** (catalog + hybrid/server apps). Both views stay loaded; focus is visual only. Specialized **personas** and **MCP** do implementation work on the same shell you use.

**License:** [AGPL-3.0](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/LICENSE). Commercial terms: [COMMERCIAL.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/COMMERCIAL.md). Security reports: [SECURITY.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/SECURITY.md).

## Full documentation in the repo

Detailed guides live under [`docs/`](https://github.com/mikeballhaus-ambient/THE-LAB/tree/main/docs) (platform, apps, CI, operations). This wiki is the **self-host checklist**; follow links into `docs/` when you need depth.