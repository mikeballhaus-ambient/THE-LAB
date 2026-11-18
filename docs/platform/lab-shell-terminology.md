# Lab shell terminology

Use these names consistently in UI copy, user guides, and agent system prompts.

| Term | Meaning |
|------|---------|
| **Laboratory** | Full-screen AI chat workspace. Quick nav **Laboratory** (`fa-comment-dots`) or the comment-dots control beside **THE-LAB**. Code: `focusedAssistant`, `lab-assistant-container`, Sidecar `lab_assistant_full`. **Former name:** Lab Assistant view. |
| **Apps workspace** | App catalog and mounted apps (not full-screen chat). Click the app/catalog area to focus. **Lab Sidecar** (**Lab Assistant** chip, top-right) lives here. |
| **Lab Sidecar** | Top-right **Lab Assistant** panel on the apps workspace — same Dexie sessions as Laboratory, view-scoped system prompt. UI label: **Lab Assistant** (`LAB_SHELL_SIDECAR_LAB_ASSISTANT_LABEL`). |
| **Lab Assistant** | The AI personas + MCP chat product. Surfaces: **Lab Sidecar** (in-app, apps workspace) and **Laboratory** (full-screen heavy lifting). |
| **Messages** | Human team DMs (`/lab-comms`) — not Laboratory or Sidecar. Quick nav **Messages** (`fa-comments`). |
| **Minimize** | Park one open app: its pane leaves the workspace, the app keeps running, and its tab moves to the **Running apps** rail. `LAB_SHELL_MINIMIZE_APP_ARIA`. |
| **Minimize all** | Park every open app at once (workspace-tabbar button) so the full app catalog reclaims the screen. `LAB_SHELL_MINIMIZE_ALL_APPS_ARIA`. |
| **Running apps** | Collapsible left rail listing parked apps with restore/close actions — same interaction as the app launcher: a vertical tab when collapsed, sliding panel when expanded (`LAB_SHELL_OPEN_RUNNING_APPS_ARIA` / `LAB_SHELL_COLLAPSE_RUNNING_APPS_ARIA`, persisted as `labRunningAppsRailExpanded`). The workspace renders as **parked** (`app-view-layout--parked`) so mounted app instances survive. `LAB_SHELL_RUNNING_APPS_LABEL`. |

When users or docs say **“Lab Assistant view”**, they mean **Laboratory**. **Lab Assistant** is the AI teammate; **Laboratory** is where you open it full-screen for deep work; the **Sidecar** chip is the same assistant while you stay on apps.

Constants for UI labels: `src/shared/constants/lab-shell-naming.ts`.

Related: [lab-sidecar.md](lab-sidecar.md) · [lab-messaging.md](lab-messaging.md)
