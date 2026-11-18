# Implementation tracker — rm-68.1

| Field | Value |
|-------|--------|
| **Roadmap** | [rm-68.1-sidecar-shell-features-awareness.md](../roadmap/rm-68.1-sidecar-shell-features-awareness.md) |
| **Status** | `closed` |
| **Opened** | 2026-11-12 |

## Locked v1 scope

| Surface | Overlay state | Prompt / automation |
|---------|---------------|---------------------|
| Settings | `showSettingsModal` + `activeTab` + persona sub-tabs | `formatLabShellOverlayGuidance` — `.lab-settings-nav__btn`, admin gates |
| Messages | `showMessagesModal` + partner ids | lab-comms / `lab-messages-dialog` |
| Notifications | `notificationsDialogVisible` + expanded titles + bulk selection | `lab-notifications-dialog` |
| Quarks | `quarksDialogVisible` | read-only wallet guidance |
| About | `showAboutModal` + `aboutActiveTopicTab` | read-only; topic tab in context |

Precedence when stacked: Settings → Messages → Notifications → Quarks → About. Ignored when full Laboratory focused.

## Checklist

| Step | Done | Notes |
|------|------|-------|
| Shell overlay state → `LabSidecarViewContext` | [x] | `shellOverlay`, `resolveLabShellOverlay`, `LabDashboard` watchEffect |
| Prompt appendix per surface | [x] | `format-lab-shell-overlay-guidance.ts` |
| Sidecar subtitle | [x] | `formatLabSidecarScopeSubtitle` |
| CI tests | [x] | context, resolver, prompt, subtitle |
| Owner QA (Settings change via Sidecar) | [x] | Programme closed 2026-11-12 per owner direction |
| Roadmap close | [x] | |

## Closeout

- [EXECUTOR-CLOSEOUT.md](../../docs/archive/programmes/rm-68.1/EXECUTOR-CLOSEOUT.md) (2026-11-12)
