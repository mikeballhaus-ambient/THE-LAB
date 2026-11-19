# Lab stack (local dev)

Unified start/stop for THE-LAB on your machine. Design: [lab-stack-lifecycle.md](../../plans/the-lab-optimization/lab-stack-lifecycle.md).

## Requirements

- **Node 20+**, `npm ci`
- **Chroma server** — set **`THE_LAB_CHROMA_BIN`** in a root **`.env`** file (see below) if auto-detect fails. On **Windows x64**, never use the npm `chromadb` CLI (ARM64-only); use Python’s **`chroma.exe`**. `lab-stack` loads `.env` via dotenv and on Windows tries `where chroma` (skipping `node_modules`) and common `Python3xx\Scripts\chroma.exe` paths.

Chroma data directory: `./chroma-data` (port **8000**).

**Optional `.env` (gitignored):**

```env
THE_LAB_CHROMA_BIN=C:\Users\YOU\AppData\Local\Programs\Python\Python312\Scripts\chroma.exe
```

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run lab` | Full stack in one terminal (Chroma, backend, Vite). **Ctrl+C** runs full stop. |
| `npm run lab:start` | Same as `lab` with your flags (e.g. `--detach`, `--wait-ready`) |
| `npm run lab:services` | Detached Chroma only — for **Run and Debug → The LAB (debug)** |
| `npm run lab:stop` | Idempotent: tracked PIDs, listeners on **5173 / 3000 / 8000**, `kill:app-servers` |

Examples:

```bash
npm run lab:start -- --wait-ready --detach
npm run lab:stop
```

## VS Code

**Run and Debug** (each runs the matching npm script in a terminal):

| Launch configuration | npm |
|----------------------|-----|
| **THE-LAB: Start (full stack)** | `npm run lab` |
| **THE-LAB: Start (services only)** | `npm run lab:services` |
| **THE-LAB: Stop** | `npm run lab:stop` |

Same labels are available under **Tasks: Run Task** for keyboard-bound workflows.

**Services only:** Chroma detached; run backend/Vite yourself (e.g. `npm run back-end` + `npm run front-end`) if you need separate terminals. **Stop** always uses `lab:stop`.

## State

`.lab-stack/state.json` (gitignored) stores PIDs the orchestrator started. Detached Vite logs: `.lab-stack/vite.log`.

**Orphan windows after smoke or a failed start (Windows):** run `npm run lab:stop` — it kills by port as well as tracked PIDs. Detached services use hidden consoles (no extra `cmd` windows during `lab:start --detach`).

### Port still in use after `lab:stop` (Windows)

`netstat` can show a listener PID that `taskkill` / `tasklist` cannot see — common when **Vite or the backend were started under the VS Code debugger** (Js Debug Terminal) or in another elevated session. `lab:stop` retries by port, matches **node.exe** command lines (`vite.js`, `backend-entry`), and warns if **5173 / 3000 / 8000** stay busy.

1. **Stop debugging** in VS Code (red square) or close the terminal that started `npm run lab` / `npm run dev`.
2. Run `npm run lab:stop` again from a normal terminal in `the-lab/`.
3. If **5173** is still taken: Task Manager → end **Node.js JavaScript Runtime** whose command line includes `vite`.
4. Last resort: `taskkill /F /IM node.exe` (kills every Node process on the machine).

## App server warm-up

When the **main backend** (port **3000**) finishes starting, it **warm-ups** enabled **hybrid** and **server** apps that have `isServerSideEnabled` and a server entry/port. Processes spawn in **dependency order** (same graph as launch). Already-healthy listeners on the registered port are reused.

- Logs: `[AppManager] warmUp — …` on the backend terminal.
- Disable: `LAB_APP_SERVER_WARMUP=0` in `.env`.
- Closing an app tab in the dashboard **does not** tear down its server; warm-up matches that model (backends stay up for integrations and workflows).

`npm run lab:stop` / `kill:app-servers` still cleans app ports **4000–4999** when you shut the lab down.
