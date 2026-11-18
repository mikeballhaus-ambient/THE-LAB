# Feature plan packages

Multi-phase roadmap work lives under `plans/{feature-id}/`. **Agents start at [AGENT-HANDOFF.md](../../AGENT-HANDOFF.md)** — not paste prompts or a separate executor flow.

**Rules:** [AGENTS.md](../../AGENTS.md)

---

## When to use a plan folder

Several phases with distinct verify gates (example: [rm-67](../rm-67/README.md)).

---

## Folder layout

```text
plans/{feature-id}/
├── README.md
├── IMPLEMENTATION-PLAN.md
├── IMPLEMENTATION-TRACKER.md   # section B = what to do next
├── PLAN-REVIEW.md
├── phases/
│   ├── 00-agent-rules.md
│   └── 01-….md …
```

Copy [implementation-tracker.template.md](./implementation-tracker.template.md) for new programmes.

Roadmap stub: `plans/roadmap/rm-NN-….md`.

---

## Related docs

| Topic | Location |
|-------|----------|
| CI & test tiers | [docs/ci/ci-v1-contract.md](../../docs/ci/ci-v1-contract.md) |
| Main DB test hygiene | [docs/ci/backend-sqlite-test-hygiene.md](../../docs/ci/backend-sqlite-test-hygiene.md) |
| Neural Memory MCP (optional) | [docs/setup/neural-memory-for-agents.md](../../docs/setup/neural-memory-for-agents.md) |
