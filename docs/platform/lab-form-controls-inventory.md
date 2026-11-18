# Form controls inventory (rm-67.5 snapshot)

Live theming contract: [platform-theming.md](./platform-theming.md). Programme closeout: [rm-67.5 EXECUTOR-CLOSEOUT](../archive/programmes/rm-67.5/EXECUTOR-CLOSEOUT.md).

| Pattern | Token source | Status (2026-11-11) |
|---------|----------------|----------------------|
| Prime Select/MultiSelect overlay (body) | `--lab-select-*` + `lab-prime-form-controls.css` | Done |
| Integration `form-control-pt.ts` | `--lab-form-control-*`, `--lab-select-overlay-bg` | Done |
| Global PrimeVue PT (`lab-primevue-pt.ts`) | Form control + select overlay PT | Done |
| `lab-form-runtime` + Rules/Workflow dialogs | `--lab-select-*` | Done |
| Settings `.lab-settings-field` | `--lab-form-control-bg` | Done |
| Laboratory composer Select | `chatComposerSelectPt` + `lab-chat-shell.css` | Done |
| Laboratory micro-buttons | `lab-chat-micro-button` + `.app-light` overrides | OK (pre-existing) |
| Prime Badge/Tag | `lab-prime-badges.css` (67.2 follow-on) | Done |
| Settings DataTable | `lab-settings-shell.css` (67.2 follow-on) | Done |
| Theme editor fields | `ThemeManagement.vue` — spot-check pending | QA |
| Catalog app native dialogs | `lab-app-dialog` + form runtime | QA per app |

**Remaining:** Theme editor edge cases, Listbox in niche panels, verify 4 presets before roadmap close.
