# App demo data — when packs actually seed

Settings → **App demo data** lists one pack per catalog app. A pack reads as **Not present** until
that app's **own server process has started at least once**. That is expected behaviour, not a
missing seed or a failed migration.

## The mechanism

Each demo-pack app's server calls the shared helper in its `start()` body, immediately after its
tables are bootstrapped:

```ts
bootstrapTimeTables(db);
runDemoSeedOnBoot(db, 'app-time-tracking', timeTrackingDemoAdapter);
```

[`runDemoSeedOnBoot()`](../src/shared/server/demo-seed-boot.ts:22) applies the pack unless the admin
removed it (the boot flag in that app's `configs` table). So seeding is **per-app and lazy**: it
happens when the app runs, not when the platform starts.

## Why a fresh lab shows mostly "Not present"

Main backend warmup defaults to `LAB_APP_SERVER_WARMUP_SCOPE=platform`
([`lab-app-server-warmup.ts`](../src/shared/config/lab-app-server-warmup.ts:27)), which starts only the
protected platform apps and their dependency closure. Catalog apps start **on demand** — when a user
launches them, or when a workflow resolves a launch dependency. Until then their SQLite file exists
but has only the reserved table shells (`items`, `users`, `configs`, `logs`), with no domain tables and
no rows. A pack therefore reports Not present because the seed has genuinely never run.

Set `LAB_APP_SERVER_WARMUP_SCOPE=all` to boot every enabled catalog app at startup instead.

## This is self-healing for testing

**You do not need to pre-seed apps to test a workflow.** A workflow that calls an unseeded app starts
it as a launch dependency, and the seed runs during that boot — before the workflow's first request
reaches it. The same is true for launching the app from the Apps view. The one case that needs
attention is a workflow whose node reads an app that is not a declared dependency; that app will not
be started on demand, and its pack stays absent.

## Not to be confused with

- **Platform catalog packs** (`app-lab-workflow-studio`, `app-lab-approvals-policies`,
  `app-lab-financial-ledger`, `app-lab-app-builder`) — these seed from the **main** database at init
  via [`seedPlatformCatalogDemoForAppIfMissing()`](../src/backend/db/PlatformCatalog/platform-catalog-demo-seed.ts:385),
  so they are always present on a fresh lab.
- **Removing a pack** sets a boot flag, so it stays removed across restarts. Re-applying from Settings
  clears the flag first — that is why an explicit Apply repairs a pack the boot path skipped.
- **The workflow demo graphs** — seeded from code on every init; see
  [demo-workflow-db-seed-sync.md](demo-workflow-db-seed-sync.md).
