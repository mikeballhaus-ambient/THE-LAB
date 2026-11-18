# Model turn recovery metrics (rm-46 **2.21**)

Counters live in `src/shared/config/lab-model-turn-recovery-metrics.ts` and increment whenever `applyStreamTurnRecoveryMessages` or `applyAgentTurnRecoveryMessages` takes a non-`none` action.

## Read counters

- **HTTP:** `GET /ready` includes `modelTurnRecoveryMetrics` alongside database and Chroma checks.
- **In-process:** `getModelTurnRecoveryMetrics()` for tests or diagnostics.

## Fields

| Field | Meaning |
|-------|---------|
| `streamRecoveryInvocations` | Stream path entered recovery (any retry action) |
| `streamRetryUserMessage` | Stream path pushed a synthetic user retry message |
| `streamRetryErrorChunk` | Stream path re-pushed an error chunk |
| `agentRecoveryInvocations` | Batch path entered recovery |
| `agentRetryUserMessage` | Batch path pushed a synthetic user retry message |
| `agentRetryErrorChunk` | Batch path re-pushed an error chunk |

Use before/after comparisons when validating **2.12** recovery behavior under load or flaky local models.
