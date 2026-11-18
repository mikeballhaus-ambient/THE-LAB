# rm-46 Phase 2 metrics verification (2.6)

**Baseline:** [metrics-baseline.md](./metrics-baseline.md) (2026-10-04)  
**Scope:** Improvements from tasks **2.1–2.3** (+ **2.4** degraded Chroma) vs Phase 0 baseline.

## What changed (2.1–2.3)

| Task | Change | Expected signal |
|------|--------|-----------------|
| **2.1** | Template markdown cache (+ dev file watch) | Lower `[TEMPLATE-MANAGER] init() completed in …ms` on repeat chat turns |
| **2.2** | Repo file index with invalidation | Fewer full-tree walks; stable `fetchRepoFiles()` call count per session after first build |
| **2.3** | Chroma `nResults` caps | Bounded memory query latency; see `lab-chroma-limits` tests |
| **2.4** | Async Chroma write + degraded startup | Backend boots when Chroma down (non-prod); `memoryHealth` on `CHAT_INITIALIZED` |

## How to verify locally

### 1. Template init time (2.1)

1. Start stack: `npm run dev` (or `npm run back-end` only).
2. Open Lab Assistant, send one chat message (loads template for session).
3. In backend logs, find `[TEMPLATE-MANAGER] init() completed in …ms`.
4. Send another message in the **same** session — init time should drop sharply vs first load (cache hit).
5. Optional: edit a file under `src/shared/templates/` in dev — next init should refresh (watch).

**Automated check:** `npm run metrics:phase2-verify` — reports `coldMs` / `warmMs` (warm should be much lower than cold).

### 2. Repo file index (2.2)

1. With logging enabled, note `fetchRepoFiles(): … (call #N)` in logs on first provider data build.
2. Trigger MCP file tools or restart chat without restarting backend — call count should not grow on every message (index reuse until invalidation).

**Automated check:** `npm run metrics:phase2-verify` — reports `fetchRepoFilesCallsFor10Invocations` (expect **1**).

### 3. Chroma caps (2.3)

```bash
npm run test:path "lab-chroma-limits"
```

### 4. Chroma degraded / async (2.4)

```bash
npm run test:path "lab-chroma-write"
```

With Chroma stopped and `LAB_PRODUCTION_PROFILE` unset, backend should start (degraded); dashboard shows `memoryHealth` status on chat init.

### 5. Readiness (operability cross-check)

```bash
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/ready
```

`/ready` returns **503** when DB or Chroma checks fail; **200** when both OK.

## Gate checklist (2.6)

Phase gate sign-off and manual rows below → **post-implementation rework** (**DEV-006**). Automated checks may run anytime on branch.

- [x] Template init ms lower on warm cache vs cold (same machine as baseline) — verified 2026-10-05 (`npm run metrics:phase2-verify`: cold **~5 ms**, warm **~0.3 ms**)
- [x] `fetchRepoFiles` not invoked on every chat message — verified 2026-10-05 (10× `fetchRepoFiles()` → **1** full scan via index)
- [x] Chroma limit + write tests green (`lab-chroma-limits`, `lab-chroma-write`) — verified 2026-10-05
- [x] Document observed numbers below — **2026-10-05**

**Automated slice (2026-10-05):** `connector-discovery`, `provider-chat-paths`, `model-turn-recovery-metrics`, `platform-audit-log` — all green.

**Provider smoke (Phase 2 gate):** Manual chat smoke for **Ollama** (**DEV-004**) and **OpenAI-compatible / OpenAI** (**DEV-005**) — **closed 2026-10-05** (user). Automated tests (`provider-chat-paths`, `model-turn-recovery-metrics`) cover orchestration paths in CI/local Jest.

## Observed (fill at gate close)

| Signal | Phase 0 / cold | After 2.1–2.3 (warm) | Notes |
|--------|----------------|----------------------|-------|
| Template init (ms) | ~5 (first `init()` after cache clear) | ~0.3 (second `init()` same process) | `npm run metrics:phase2-verify` (2026-10-05); mirrors per-turn `TemplateManager.init()` with process-wide markdown cache |
| fetchRepoFiles calls / 10 messages | N/A (pre-index: often 10 scans) | **1** scan for 10 calls | Same script; logs show `[FILE-HELPER] fetchRepoFiles(): scanning repository (call #1)` only once |
| First token feel (subjective TTFT) | — | — | Not re-benchmarked this pass; provider smokes closed under DEV-004/005 |

---

_Update [metrics-baseline.md](./metrics-baseline.md) when re-running `npm run metrics:baseline` after large refactors._
