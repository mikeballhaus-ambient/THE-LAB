# rm-72 — Implementation tracker

**Plan:** [rm-72-workflow-automation-expansion.md](../roadmap/rm-72-workflow-automation-expansion.md)

## Workflow Studio browse (pre–72.2)

| Item | Status |
|------|--------|
| `tags_json` on `lab_workflows` + create/update API | ✅ |
| Card grid + tag filter chips (`LabWorkflowListCard`) | ✅ |
| Demo seed tags (CRM, Approvals, Platform, …) | ✅ |

## rm-72.2 — Workflow Studio + Quarks guinea pig

| Step kind | Status |
|-----------|--------|
| `virtual_bank_get_wallet` (read + eligibility fields) | ✅ |
| `virtual_bank_credit_daily_allotment` | ✅ |
| `show_user_toast` (+ socket + shell listener) | ✅ |
| `platform.auth.session.established` | ✅ |
| Demo graph: get → **if_condition** → credit → toast (success / skip) | ✅ |
| Tests + docs + `DEMO_AUTOMATION_DEFINITION_REVISION` bump | ✅ |

## Pre-PR

- [x] Owner verification (Workflow Studio + login Quarks path) **2026-11-19**
- [ ] `npm run test:pipeline` (batch before PR if shipping platform diff)

## rm-72.3 — Follow-on (planning only)

See [rm-72.3-additional-workflow-opportunities.md](../roadmap/rm-72.3-additional-workflow-opportunities.md).