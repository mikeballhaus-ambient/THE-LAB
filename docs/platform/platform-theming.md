# Platform theming

THE-LAB applies one **platform-wide theme** to the dashboard, Lab Assistant, Settings/About dialogs, and every mounted app. Themes are semantic **tokens** (colors, gradients, shadows) exposed as CSS variables `--lab-*` on `:root`.

## Who can change the theme

| Role | View active theme | Edit / Save |
|------|-------------------|-------------|
| owner, admin | Yes | **Settings → Administration → Themes** |
| member, viewer | Yes | No (inherits saved theme) |

## Quick start (admins)

1. Open **Settings** (gear, top left) → **Themes**.
2. Choose **Dark** or **Light** color scheme.
3. Pick a **preset** (10 built-ins per mode — ids in `LAB_THEME_PRESET_IDS`, files under `src/shared/theme/presets/`).
4. Fine-tune groups (General, Button, Card, Chat, …). Color fields use **Tailwind palette selects**; values are stored as resolved hex/rgb in SQLite.
5. Changes apply **live** to the whole lab while you edit. Use **Save theme** (panel or bottom banner) to persist for all users, or **Discard** to revert.

## Custom themes

- **Duplicate to custom** copies the current built-in (or edits) into a saved custom preset (`custom:{uuid}`).
- Custom presets can be renamed, edited, and deleted. **Built-in presets cannot be deleted.**

API: `GET /api/platform/theme` (authenticated), `PUT /api/platform/theme` (admin). Optional socket event `theme:updated` refreshes open sessions.

## Defaults

| Mode | Default preset |
|------|----------------|
| Dark | `cloud-grey-dark` (Cloud Grey) |
| Light | `slate-lab-light` (Slate Lab) |

## Apps and charts

- **Every mounted app** (including multi-screen apps such as **Time Wasters** — Game Manager lobby **and** each mini-game) must honor the active preset: chrome via `text-lab-general-*`, `bg-lab-*`, `lab-app-header` / `lab-app-body`, not fixed `slate-*` / `cyan-*` skins. App mount applies tokens via `src/shared/theme/lab-app-theme.ts`.
- **Catalog game apps:** same token rules on lobby and in-game screens; overview: [lab-games.md](lab-games.md).
- Chart Builder and embedded charts read **`lab-chart-theme`** helpers so series and labels follow active tokens.

## Drag and drop (apps)

**All drag-and-drop in `src/apps/**` must use `@vue-dnd-kit/core`** (`makeDraggable`, `makeDroppable`, `DnDProvider`, etc.). Do not use HTML5 `draggable`, SortableJS, or other DnD libraries for product features. Reference: `src/apps/dnd-examples/`, `forms-builder`, `help-desk` kanban.

## For developers and agents

| Topic | Location |
|-------|----------|
| Token keys ↔ CSS ↔ utilities | `src/shared/theme/`, `src/assets/styles/` (`--lab-*` on `:root`) |
| Chat surface layers | Theme group **Chat** in Settings → Themes; shell styles under `src/dashboard/` |
| Adding a built-in preset | New file under `src/shared/theme/presets/`, register in `LAB_THEME_PRESET_IDS` + `presets/index.ts`; run `lab-theme-presets` tests |
| Migration matrix | `node scripts/generate-theme-migration-matrix.mjs` |

## Colour utilities (rm-67.2 policy)

**Use in product UI** (`src/dashboard`, `src/shared` components, `src/apps/**`):

| Prefer | Examples |
|--------|----------|
| `text-lab-*`, `bg-lab-*`, `border-lab-*` | `text-lab-general-text`, `bg-lab-general-bg-muted`, `border-lab-general-border` |

**Avoid in new UI:** structural aliases `text-lab-text`, `text-lab-text-muted`, `text-lab-muted`, `bg-lab-surface-base`, `border-lab-border` — use `lab-general-*` instead (`lab-theme.css` keeps shims only).
| Chat tool surfaces | `text-lab-chat-tool-result`, `bg-lab-chat-tool-result` |
| Form actions | `lab-form-action-primary`, `lab-form-action-secondary` |
| CSS | `var(--lab-general-text)`, `color-mix(in srgb, var(--lab-general-border) 40%, transparent)` |

**Avoid for new chrome:** `text-mist-*`, `bg-slate-*`, fixed `text-white` on non-overlay surfaces, ad-hoc `cyan-*` / `sky-*` panels (use button/general tokens).

**Guard:** `npm run verify:theme-colors` (exempt: `dnd-examples`, `ui-component-gallery`, theme preset sources).

**Bridge:** `src/assets/styles/lab-app-palette.css` still aliases legacy Tailwind `mist-*` / `slate-*` to preset-tuned `--lab-legacy-mist-*` for gradual migration; prefer explicit `lab-*` in app source.

## Derived aliases (rm-67.5 — form controls)

Set at runtime by `applyLabTheme()` (not preset JSON keys). Use in PT/CSS instead of raw `prime-surface-*` for controls:

| CSS variable | Role |
|--------------|------|
| `--lab-form-control-bg` | Input, Select trigger, textarea fill |
| `--lab-form-control-border` | Control outline |
| `--lab-select-overlay-bg` | Teleported Select/MultiSelect/Listbox panel |
| `--lab-select-option-hover-bg` | Focused/hovered option |
| `--lab-select-option-selected-bg` | Selected option |

**Shell CSS:** `lab-prime-form-controls.css` (global overlays), `lab-form-runtime.css`, `lab-settings-shell.css`, `form-control-pt.ts`, `lab-primevue-pt.ts`.
