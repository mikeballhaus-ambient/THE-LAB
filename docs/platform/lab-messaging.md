# Lab messaging (team chat)

THE-LAB provides **human-to-human direct messages** on the main platform backend (port **3000**). This is separate from **Laboratory** / **Lab Sidecar** AI chat (personas, MCP tools, Dexie sessions, default Socket.IO namespace). See [lab-shell-terminology.md](lab-shell-terminology.md).

## Opening Messages

1. Sign in (same account as Settings and app launch).
2. In the **quick nav** (top left), open **Messages** (`fa-comments`) — immediately after **Laboratory**.
3. Pick a teammate from the list, or use an existing conversation tab.

Requires an active session; viewers may send and receive DMs if they can authenticate.

The teammate list uses **`GET /api/platform/users`** (any signed-in user), not the Settings user-management socket list (admin only).

The dialog header shows **your display name** and connection status (Connected / Reconnecting / Offline).

## Laboratory vs Messages

| | Laboratory (AI chat) | Messages |
|---|----------------------|----------|
| Icon | `fa-comment-dots` | `fa-comments` |
| Purpose | AI chat, tools, streaming | User ↔ user text |
| Storage | Dexie + Chroma (assistant) | Main SQLite + socket |
| Socket | Default `/` chat events | Namespace `/lab-comms` |

On the **apps workspace**, scoped AI chat uses the **Lab Sidecar** (**Lab Assistant** chip, top-right) on the same session — not Messages. See [lab-sidecar.md](lab-sidecar.md).

## THE-LAB automation (workflow notifications)

Workflows can DM assignees from the reserved **THE-LAB** platform user (`users.id` **12**). That thread appears when you have automation messages; the **composer is hidden** (read-only). You cannot start a new DM to THE-LAB from the teammate picker. See [platform-identity.md](platform-identity.md) (`showSystemUser` on platform user APIs).

## Conversation tabs

- One **tab per open partner** (PrimeVue Tabs in the Messages dialog).
- Click **×** on a tab to close it. Closed tabs stay hidden until you select that person again from the team list (history is preserved).
- Closing the **active** tab selects the next tab to the left, or the empty state if it was the only tab.

## Unread badges

- **Nav badge:** total unread incoming DMs (theme-styled pill after the **Messages** label). While the Messages dialog is open on a tab, that partner’s unread is excluded from the nav total.
- **Tab badge:** unread count for **other** partners only — not the tab you are currently viewing.
- **Active thread:** new messages in the open tab are **marked read** automatically (server read cursor + live `mark-read`).
- Counts restore after refresh once the Messages socket reconnects.

## Presence colors

Tracked on the **`/lab-comms`** connection only:

| Color | Meaning |
|-------|---------|
| Green | Connected and active within the last **10 minutes** |
| Yellow | Connected but idle **≥ 10 minutes** |
| Red | Not connected to Messages |

The user list shows **online (green) first**, then yellow, then red, then name.

## Display names

- Shown in the team list, tabs, thread header, and **Settings → User Management** (same formatter: `displayLabUserName()` in `src/shared/utils/lab-comms-ui.ts`).
- **OIDC / SSO:** new users store the IdP **display name** (not a slug username). Returning SSO users with legacy slug names are upgraded on login. GitHub logins without a profile name use a humanized login label.

## Composer

The message input and **Send** button sit on a **composer footer** (theme token `--lab-chat-composer-bg`) below the scrollable transcript so the input area is visually distinct from message history.

## Technical notes (v1)

- **Socket only** — send, history, inbox, unread, and presence use `/lab-comms`; there is no REST send/history API in v1.
- DMs use canonical channel ids `dm:lowerId:higherId` keyed by THE-LAB `users.id`.
- Plain text only (4,000 character max); rate limit 30 messages per minute per user.

Architecture and event names: `src/shared/types/lab-comms.ts`, `LAB_COMMS_EVENTS` in `src/shared/types/`.

## Game invites (hybrid game apps)

Registered game apps can send structured envelopes over the same `/lab-comms` channel (not Laboratory chat):

| Type | Purpose |
|------|---------|
| `game.invite` | Friend invite; payload includes **`appId`** (e.g. `app-word-tile`), `inviteId`, `gameId` |
| `game.invite.decline` / `game.invite.cancel` | Invite closed |
| `game.match.ready` | Match created; open the app via `appId` |

Legacy `tw.*` types are aliases of the `game.*` constants for stored messages. The dashboard resolves socket ack events from `src/shared/config/game-app-invite-registry.ts` and launches the target app with `launchGameApp(appId, displayName)`.
