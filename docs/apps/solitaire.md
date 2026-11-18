# Solitaire (Klondike)

**Registry id:** `app-solitaire` · **Catalog tag:** games · **Type:** hybrid (UI + app server)

Classic **Klondike** solitaire in THE-LAB. Wins are scored by **elapsed time** (primary) and **move count** (secondary). Runs can update your **personal best** for this app.

## Launch

1. Sign in with a role that can launch apps.
2. Open the **apps workspace** and find **Solitaire** in the catalog (diamond icon).
3. Launch the app. THE-LAB starts the app server (default port **4101**) and mounts the UI.

If launch fails, check that the app is enabled in registry and that port **4101** is free.

## How to play

- **Goal:** Move all cards to the four foundation piles (Ace → King, same suit).
- **Tableau:** Build down in alternating colors; only Kings go on empty columns.
- **Stock / waste:** Tap **Draw** to flip cards from the stock; you may move cards from the waste to tableau or foundations.
- **Shortcuts:** Double-click a face-up card to send it toward a valid foundation when possible.
- **Drag-and-drop:** Move cards and stacks between tableau, waste, and foundations.

When you win, a **You won!** dialog shows time and moves. If you are signed in and the app server is connected, the run is saved and may update your **personal best**.

Use **New game** (header) or **Play again** (dialog) to reset the board.

## Personal bests

When you are signed in, winning runs are saved in the app database keyed by your **THE-LAB user id**. The win dialog can note a new **personal best** (faster time / fewer moves). There is no lab-wide global leaderboard UI.

Solitaire is **solo only** — there is no vs-AI or multiplayer mode in v1.

## Lab Assistant and automation

- **Lab Sidecar:** While Solitaire is focused in the apps workspace, the Sidecar can answer questions about rules and UI; it receives app context from the mounted shell.
- **UI automation:** Agents scope discovery to the outer class **`solitaire-app`**. Interactive controls use generated unique ids (prefixes such as `solitaire-new-game`, `solitaire-play-again`).

## Technical reference (operators)

| Item | Value |
|------|--------|
| UI entry | `src/apps/solitaire/front-end/App.vue` |
| Server entry | `src/apps/solitaire/back-end/entry.ts` |
| Health | `GET {serverUrl}/health` |
| Socket events | `solitaire:games:list`, `solitaire:run:submit` |
| Internal slug / DB | `solitaire` → `src/apps/solitaire/db/the_lab.db` |

See [lab-games.md](../platform/lab-games.md) for shared hybrid-app patterns.
