## Fixed layout

| Piece | Port / path | Purpose |
|-------|-------------|---------|
| **Main backend** | **3000** | Fastify + platform Socket.IO chat, auth, MCP, app launch |
| **Vite dashboard** | **5173** (dev) | Browser UI |
| **App servers** | **4000–4999** | Per hybrid/server app (`props.serverUrl`) |
| **Main SQLite** | `db/the_lab.db` (or `DATABASE_PATH`) | Users, personas, apps registry, providers |
| **Chroma** | `chroma-data/` | Conversation memory (vectors) |
| **Per-app DB** | `src/apps/{id}/db/the_lab.db` | Isolated app data |

**Rule:** App HTTP/WebSocket from the browser uses the **app port**, not 3000, unless you intentionally call platform APIs.

## Data you should not commit

- `.env` — local secrets and machine paths  
- `*.db`, `chroma-data/`, `logs/` — runtime state  
- `.neuralmemory/` — local agent tooling, not the product  

`.env.example` is the template only (no real keys).

## Stopping cleanly

Use `Ctrl+C` on `npm run dev`, or [lab:stop](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/operations/lab-stack.md) if you use the lab stack scripts.

## Optional: Knowledge Base RAG

When enabled, published KB articles embed into Chroma (`kb-chunks`). That needs a configured **chat + embed provider** in Settings — see [Environment and Secrets](Environment-and-Secrets).