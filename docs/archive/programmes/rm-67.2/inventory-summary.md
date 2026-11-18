# rm-67.2 — Colour inventory (baseline)

**Generated:** 2026-11-11  
**Pattern:** `text-mist-*`, `bg-mist-*`, `border-mist-*`, `text-slate-*`, `bg-slate-*`, `border-slate-*`, `text-white` (Tailwind class tokens only; hex/rgb follow-up pass).

## By layer (files with ≥1 match)

| Layer | Files |
|-------|------:|
| `src/dashboard/**` | 13 |
| `src/shared/**` | 27 |
| `src/apps/**` | 31 |

## Top offenders (apps)

| Path | Approx. matches |
|------|----------------|
| `lab-formsbuilder/.../PropertyEditor.vue` | 46 |
| `shared/composables/mcp/utils/app-management-format-result.ts` | 42 |
| `lab-formsbuilder/.../ConnectorManagement.vue` | 34 |
| `lab-formsbuilder/back-end/db/platform-forms-seed-data.ts` | 10 |
| `lab-formsbuilder/.../ConnectorManager.vue` | 11 |
| `dashboard/settings/PersonaManagement.vue` | 24 |
| `dashboard/settings/UserManagement.vue` | 20 |
| `shared/composables/mcp/utils/base-utils.ts` | 17 |
| `ai-tunes/.../MP3Card.vue` | 8 |

## Exemptions (rm-67 carry-over)

- Game board / piece artwork chrome only — tokens on shell around boards
- `dnd-examples`, `ui-component-gallery` teaching palette (documented)
- Chart series colours via `lab-chart-theme.ts` where data viz requires fixed hues

## Next script (optional)

Add `src/scripts/verify-theme-colors.ts` mirroring rm-67.1 guard — allowlist `plans/`, test fixtures, exempt paths from `EXEMPT-REGISTER.md`.
