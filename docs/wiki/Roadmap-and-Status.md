## What is “shipped” in this repo

THE-LAB is a **portfolio-grade platform**: Laboratory + Sidecar, catalog apps, Workflow Studio, Rules, integrations (Forms/Chart connectors), themes, messaging, games, Knowledge Base, and MCP tooling. The root [README](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/README.md) summarizes architecture; user guides are under [`docs/platform/`](https://github.com/mikeballhaus-ambient/THE-LAB/tree/main/docs/platform).

## Roadmap table

Living backlog (IDs like `rm-*` are maintainer labels): [docs/roadmap.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/roadmap.md) on `main`.

Examples of **in flight** at time of public launch:

- Workflow / KB automation enhancements  
- UI/UX polish  
- OSS hygiene (secrets audit, GitHub as canonical remote)

Completed programme closeouts are archived under [docs/archive/programmes/](https://github.com/mikeballhaus-ambient/THE-LAB/tree/main/docs/archive/programmes).

## In-product Knowledge Base vs this wiki

| | **GitHub Wiki / `docs/wiki/`** | **Knowledge Base app** |
|---|-------------------------------|-------------------------|
| Audience | Humans cloning the repo | Lab Assistant + RAG when stack runs |
| Content | Self-host, security, ops | Platform + app how-tos, `agent_view` for models |
| Updates | You copy/sync wiki from git | Publish articles in the app; seeds on demo tiers |

Running the lab **without** the Knowledge Base app is fine; you still have `docs/` and this wiki.

## Issues and feedback

Use **GitHub Issues** for bugs and ideas. Security: [SECURITY.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/SECURITY.md).