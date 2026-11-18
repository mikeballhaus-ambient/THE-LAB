# rm-67 — Tailwind-first CSS audit (Vue + platform UI)

**Status:** 📋 Pending  
**Roadmap:** [docs/roadmap.md](../../docs/roadmap.md) (rm-67)  
**Handoff package:** [plans/rm-67/](../rm-67/README.md) · agents start at [AGENT-HANDOFF.md](../../AGENT-HANDOFF.md)  
**Opened:** 2026-11-11

## Problem

Over multiple agent-led app builds, many Vue SFCs gained **scoped `<style>` blocks** with **custom class names** used for layout, spacing, color, and typography. THE-LAB standardizes on **Tailwind 4** plus **platform tokens** (`lab-*` utilities backed by `--lab-*` on `:root`). Component-local CSS that duplicates Tailwind:

- Drifts from **theme presets** (hard-coded colors, non-token borders).
- Hides layout in `<style>` instead of on the element (harder review and UI automation).
- Forks patterns that already exist in shared stylesheets (`lab-form-section`, `platform-catalog-app.css`, `lab-app-shell.css`, …).

**Goal:** Audit **all lab UI code** — `src/dashboard/**`, `src/shared/**` (Vue + composable UI), and `src/apps/**` — and rework **replaceable** custom classes to **Tailwind + canonical platform classes**. Keep only CSS that **cannot** be expressed safely in Tailwind without harming product behavior.

---

## Policy — what stays vs what migrates

### Keep (do not delete in the name of rm-67)

| Category | Where | Why |
|----------|--------|-----|
| **Platform stylesheets** | `src/assets/styles/*.css` | Canonical contracts: `lab-theme.css`, `platform-catalog-app.css`, `lab-form-runtime.css`, shell CSS |
| **Canonical markup classes** | Templates | `lab-form-section`, `lab-app-header`, `lab-platform-catalog-app`, `catalog-accordion-item-list`, `lab-app-dialog`, … — defined in platform CSS, not duplicated per app |
| **PrimeVue `:deep()` / `:global()`** | Vue SFC | **Reduce when low-risk** (`:pt`, wrappers, platform CSS). **Keep when unsure** — see [§ `:deep()` programme policy](#deep--global--programme-policy-important) below. Prefer `form-control-pt` / `lab-primevue-pt.ts` before *new* `:deep`. |
| **Simulation / canvas UI** | Games, billiards, maps | 3D felt, physics overlays, board grids, card dealing animations — **minimize** but allow scoped CSS that targets geometry, not chrome |
| **`@keyframes` / complex motion** | Shared or local | Prefer Tailwind `animate-*` when trivial; otherwise keep keyframes but use **`var(--lab-*)`** for colors |
| **Third-party DOM** | Charts, map tiles | External libraries that inject non-Vue markup |

### Migrate (default for audit findings)

| Smell | Target |
|-------|--------|
| Custom class for `display`, `flex`, `gap`, `padding`, `margin`, `width`, `max-height` | Tailwind utilities on the element |
| Custom class for font size/weight/color | `text-sm`, `font-semibold`, `text-lab-general-text-muted`, … |
| Background/border using hex, `rgb()`, or raw `slate-*` / `cyan-*` | `bg-lab-*`, `border-lab-*`, or `color-mix(in srgb, var(--lab-…) …)` via arbitrary property only when no utility exists |
| Duplicate of catalog workspace pattern (filter bar bleed, accordion list) | Use shared platform CSS or existing catalog patterns — **no new** `.{app}-filters` unless promoted to platform |
| Empty or single-rule blocks after migration | Remove `<style>` entirely |

### Forbidden after rm-67 (new code)

- New **layout/presentation** classes in `<style scoped>` when Tailwind + tokens suffice.
- New **fixed palette** colors in component CSS (use tokens — [platform theming](../../docs/platform/platform-theming.md), `src/shared/theme/`, `--lab-*` utilities).
- New per-app **card/section** chrome — use **`lab-form-section`** (AGENTS.md rule 13).

---

## Scope (directories)

| Layer | Path | Notes |
|-------|------|--------|
| Lab shell | `src/dashboard/**`, `src/App.vue` | Settings, chat, apps workspace, workflows designer |
| Shared UI | `src/shared/**/*.vue` | Forms runtime, game shell chrome, integration host |
| Catalog + platform apps | `src/apps/**/front-end/**` | All product Vue; **exclude** `back-end/` |
| Templates | `src/templates/front-end/**` | Generator baseline for **new** apps |
| **Out of scope** | `src/backend/**`, `node_modules`, `dist` | No UI |
| **Low priority** | `src/apps/dnd-examples/**` | Teaching samples; migrate last unless touched |

**Stylesheets under `src/assets/styles/`** are **not** bulk-deleted in rm-67; they are the **source of truth**. Optional follow-up: trim dead selectors after inventory proves zero template references.

---

## Phase 0 — Discovery (inventory)

### 0.1 Automated file census

Produce a machine-readable inventory (committed under `plans/rm-67/`):

1. **Vue files with `<style>`** — path, `scoped` yes/no, line count of style block.
2. **Custom class selectors** — regex extract from `<style>`: `\.[a-zA-Z0-9_-]+` (dedupe per file).
3. **Template usage** — for each custom class, grep `class="…"` / `:class` in the same SFC (flag **orphan CSS**).
4. **Hard-coded color smell** — within style blocks: `#[0-9a-fA-F]{3,8}`, `\brgb\(`, `\bslate-`, `\bcyan-`, `\bzinc-` (in CSS, not Tailwind in template).
5. **`:deep` / `:global` count** — triage PrimeVue vs layout.

**Suggested commands (baseline; wrap in `src/scripts/audit-vue-style-blocks.ts` in phase 0.2):**

```bash
# Files containing a style block (manual spot-check until script lands)
rg -l "<style" src/dashboard src/shared src/apps --glob "*.vue"

# Heavy style blocks (sort by size)
rg --count-matches "." src/apps --glob "*.vue" -g "*<style*"  # refine with script

# Hard-coded hex in Vue styles (broad)
rg "#[0-9a-fA-F]{3,6}" src --glob "*.vue"
```

### 0.2 Inventory script (deliverable)

Add **`npm run audit:vue-styles`** (name TBD) that writes:

- `plans/rm-67/inventory.json` — array of `{ path, styleLines, selectors[], colors[], deepCount, bucket }`
- `plans/rm-67/inventory-summary.md` — sorted tables: **top 30 by style line count**, **by app-id**, **dashboard vs shared vs apps**

**Bucket assignment (automatic heuristics):**

| Bucket | Heuristic |
|--------|-----------|
| **S** (small) | `styleLines < 40`, no hex, ≤2 selectors |
| **M** (medium) | layout + token mix, catalog app `App.vue` |
| **L** (large) | `styleLines ≥ 120` or many `:deep` (e.g. time-tracking, knowledge-base, weather-dashboard, billiards) |
| **X** (exempt candidate) | filename matches `*Table*`, `*Canvas*`, `*Board*`, `*3D*`, `Billiards*`, `Klondike*`, `WeatherMap*` — human confirms |

### 0.3 Manual classification pass

Owner or agent reviews **L** and **X** rows once:

- Confirm **exempt** (simulation) vs **migrate** (chrome only).
- Record in `plans/rm-67/IMPLEMENTATION-TRACKER.md` per-surface log (per path: `pending` | `exempt` | `done`).

### 0.4 Discovery exit gate

- [ ] Inventory script runs in CI or as `npm run audit:vue-styles` (non-failing report only).
- [ ] Every app under `src/apps` with a `front-end/` appears in summary.
- [ ] `src/dashboard` and `src/shared/**/*.vue` fully listed.
- [ ] Exempt list written (games/simulation) with one-line rationale each.

---

## `:deep()` / `:global()` — programme policy (important)

**Owner stance (2026-11-11):** rm-67 targets **layout/chrome in Tailwind + `lab-*` tokens**, not a crusade against scoped piercing. **Fewer `:deep()` rules when safe** is good; **keeping them to avoid subtle PrimeVue / teleport / third-party bugs is explicitly OK.**

| Principle | Guidance |
|-----------|----------|
| **Default** | **Err on the side of caution.** If removal needs guessing internal PrimeVue DOM, **leave `:deep()` in place** and still migrate colors to `var(--lab-*)` where you touch the rule. |
| **Try removal** only when the rule clearly styles **your** markup, or **Pass Through (`:pt`)** / `form-control-pt` / `lab-primevue-pt.ts` is a known match in-repo, and you can **smoke-test** the control (open dialog, focus input, menu overlay) in the same session. |
| **Prefer keep** for teleported Dialog/Overlay/Menu, Vue Flow graph CSS, maps/charts, dense DataTable/Accordion innards, and any file with high `deepCount` until a dedicated pass with UI verification. |
| **Not a completion gate** | `inventory.json` `deepCount` is **triage only**. Programme can complete with intentional `:deep()` / `:global()` left in place — document in tracker notes (`deep retained — teleport/PT risk`). |
| **Do not** | Mass-delete `:deep()` to empty `<style>` blocks, swap to fragile one-off PT, or “equate” every deep rule to Tailwind on the parent (Tailwind does not pierce child roots). |

**Order when considering removal:** (1) Tailwind on your wrappers → (2) `:pt` / shared PT → (3) one platform CSS rule → (4) `:global(.dialog-class …)` for teleports per AGENTS.md rule 6 → (5) **keep** `:deep()` if still needed.

Agents: also read [plans/rm-67/phases/00-agent-rules.md](../rm-67/phases/00-agent-rules.md) § `:deep()` and [PLAN-REVIEW.md](../rm-67/PLAN-REVIEW.md).

---

## Phase 1 — Rework playbook (per file)

Use for **every** non-exempt SFC.

1. **Read** template + style together; list selectors tied to layout/visual chrome.
2. **For each selector rule:**
   - Move declarations to **Tailwind classes** on the matching element(s) **you own in the template**.
   - If the rule exists because of **PrimeVue structure**, try **`formSelectPt` / `lab-primevue-pt`** before changing `:deep` — **only remove `:deep()` when low-risk** (see programme policy above).
   - If the pattern is **reused across apps**, promote **one** rule to `platform-catalog-app.css` (or existing shell CSS) — do **not** copy-paste utilities across 15 apps.
   - **Skip** rewriting existing `:deep()` blocks in this pass if unsure; tokenize colors and migrate non-deep layout first.
3. **Tokens:** replace colors with `text-lab-*` / `bg-lab-*` / `border-lab-*`; see [platform-theming.md](../../docs/platform/platform-theming.md) and preset sources in `src/shared/theme/presets/`.
4. **Teleported dialogs:** use `:global(.your-dialog-class …)` per AGENTS.md rule 6 — after migration, dialog chrome should still use `lab-app-dialog` + integration tokens.
5. **Delete** unused selectors; remove empty `<style>`.
6. **Verify**
   - `npm run lint-file <path>`
   - `npm run type-check-file <path>` when TS in SFC
   - Spot-check **2 dark + 2 light** presets on the affected surface
   - App: launch in lab, smoke the touched route

**Do not** change behavior-only CSS (e.g. `pointer-events`, `transform` for game pieces) unless equivalence is proven in manual or existing tests.

---

## Phase 2 — Execution waves (order)

Execute **one bounded PR per wave slice** (app, subsystem, or ≤15 files same bucket). Gates: `lint` on touched files + `npm run build`.

| Wave | Target | Rationale |
|------|--------|-----------|
| **W1** | `src/templates/front-end/App.vue` | New apps inherit Tailwind-first baseline |
| **W2** | `src/dashboard/components/settings/**` (non-workflow) | High-traffic admin UI |
| **W3** | `src/dashboard/components/chat/**`, `LabDashboard.vue`, shell dialogs | Laboratory + Sidecar chrome |
| **W4** | `src/shared/forms/**`, `CatalogIntegrationHost.vue`, game **shell** (`GamePlayShell`, `GameBoardRow`, `PlayerTurnsPanel`) | Shared kit — fix once, many apps benefit |
| **W5** | Catalog **`App.vue`** files (Wave C portfolio) | Often largest scoped blocks; use catalog patterns |
| **W6** | Platform apps: `lab-crm`, `lab-formsbuilder`, `lab-helpdesk`, `lab-tasklist` | Complex but standardized layouts |
| **W7** | Remaining apps alphabetically by `app-id` | Drain inventory |
| **W8** | **Exempt review** — billiards, solitaire, chess boards, weather map, workflow graph canvas | Reduce chrome CSS only; keep simulation CSS documented |
| **W9** | `dnd-examples`, `ui-component-gallery`, `ai-tunes` | Lowest product priority |

Within each wave, process **S → M → L** files to build muscle memory before the largest files.

---

## Mapping cheat sheet (agent)

| CSS intent | Tailwind / platform approach |
|------------|------------------------------|
| Muted secondary text | `text-lab-general-text-muted` |
| Page background / border | `bg-lab-general-bg`, `border-lab-general-border` |
| Section card | `lab-form-section` + title/lead markup (rule 13) |
| Full catalog workspace root | `lab-platform-catalog-app app-loaded-container` + flex column utilities (see peer `App.vue`) |
| Filter strip full-bleed | Prefer shared catalog pattern; if one-off, `w-[calc(100%+1.5rem)] -mx-3 …` with **token** border via arbitrary: `border-b border-[color-mix(in_srgb,var(--lab-general-border)_60%,transparent)]` |
| Prime input filled look | `form-control-pt` / transparent filter bars — match [CityPickerDialog.vue](../../src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue) |
| Prime inner DOM / teleport | **Keep** `:deep()` / `:global()` when cautious; use `:pt` only with a known preset + manual test — not “Tailwind equivalent” |
| Scrollable flex child | `min-h-0 flex-1 overflow-auto` on template |
| Icon button spacing | `gap-2`, `p-2`, Prime `Button` PT density from shared theme |

When Tailwind cannot express a **dynamic** value (rare), prefer **inline style** with `var(--lab-*)` over a new class — still better than a named selector in `<style>`.

---

## Phase 3 — Prevention (after bulk migration)

| Item | Action |
|------|--------|
| **App generator** | `src/templates/front-end/App.vue` — Tailwind-only example; comment “no layout in `<style>`” |
| **AGENTS.md / .cursorrules** | Point agents to this plan + “no new scoped layout classes” |
| **Optional ESLint** | `vue-scoped-style-policy` (future): warn on `padding|margin|display|flex` in `<style scoped>` except `exempt` file list |
| **PR checklist** | If PR adds `<style>` block, require rm-67 exemption note in description |

---

## Tracking & completion

| Artifact | Path |
|----------|------|
| Inventory (generated) | `plans/rm-67/inventory.json` |
| Human summary | `plans/rm-67/inventory-summary.md` |
| Per-file status | `plans/rm-67/IMPLEMENTATION-TRACKER.md` (section B + per-surface log) |
| Exempt register | `plans/rm-67/EXEMPT-REGISTER.md` |

**Program complete when:**

- [ ] All non-exempt SFCs in tracker = `done`
- [ ] Exempt register reviewed and minimal
- [ ] `audit:vue-styles` shows **zero** `colors[]` hex hits in non-exempt files (or documented exceptions); **remaining `:deep()` is OK** when noted in tracker
- [ ] `npm run build` green
- [ ] Roadmap rm-67 → ✅ Completed

---

## Risks

| Risk | Mitigation |
|------|------------|
| Visual regressions across 20 theme presets | Spot-check 4 presets per wave; prioritize token-based utilities |
| PrimeVue teleport / `:deep` removal breaks dialogs | **Do not require `:deep` removal**; migrate dialog **shell** via `lab-app-dialog` + tokens; test open/close; keep piercing CSS if PT/global is uncertain |
| Billiards/games break | Exempt simulation CSS; only migrate trays/aside chrome |
| Huge single PR | Hard limit: one wave slice or one `app-id` per PR |
| Duplicating platform CSS into Tailwind strings | Prefer **one** platform class addition over 10 app copies — owner review for new platform CSS |

---

## References

- [Platform theming (user)](../../docs/platform/platform-theming.md) · tokens: `src/shared/theme/`, mounted apps: `src/shared/theme/lab-app-theme.ts`
- [Catalog workspace UI pattern](../../docs/apps/catalog-workspace-ui-pattern.md)
- [CityPickerDialog](../../src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue) — integration dialog + tokens reference
- [platform-catalog-app.css](../../src/assets/styles/platform-catalog-app.css) — canonical section/list/shell rules
