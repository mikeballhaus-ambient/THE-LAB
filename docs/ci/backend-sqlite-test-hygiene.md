# Backend SQLite tests — hygiene

**Audience:** Agents and contributors writing `src/tests/**` against the main DB.

THE-LAB uses **Jest** (`npm run test` / `npm run test:path "pattern"`). Tests live under `src/tests/**/*.test.ts`.

---

## 1. Do not change production patterns to “fix” tests

| Forbidden | Use instead |
|-----------|-------------|
| New `resetInstance()` / `new Service()` per test | Singleton `getInstance()` + shared `repository` like production |
| Pointing tests at `db/the_lab.db` | In-memory SQLite (`betterSqlite3(':memory:')`) |
| Skipping cleanup and re-bootstrapping DB every test | `beforeAll` bootstrap once + `beforeEach` delete rows |

Platform code uses **singletons** (`labEventsService`, `labEventsRepository`, `labCommsService`, …). Tests wire the singleton repository to a **test database** once, then **clear data** between cases.

---

## 2. Standard layout (main DB domain tests)

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labEventsService } from '@/backend/db/LabEvents/lab-events-service';

describe('lab-events service', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
  });

  beforeEach(() => {
    labEventsRepository.clearAllEventDataForTests();
  });

  afterAll(() => {
    labEventsRepository.close();
    db.close();
  });

  test('…', async () => {
    // act + assert
  });
});
```

**Reference:** `src/tests/regression/backend/lab-events-service.test.ts` (if present), `lab-comms-repository` patterns under `src/tests/`.

---

## 3. Cleanup strategies

| Strategy | When |
|----------|------|
| **Repository helper** `clearAll*ForTests()` | Preferred — deletes from domain tables in FK-safe order |
| **Per-test `DELETE FROM … WHERE …`** | When test needs partial state |
| **Fresh `:memory:` DB per `describe` block** | Rare — only if bootstrap is expensive and isolation still fails |

---

## 4. Row mapping

SQLite returns **snake_case** columns. Repositories map to **camelCase** before services consume rows. Do not re-map in tests.

---

## 5. Commands (after test changes)

```bash
npm run test:path "<file-or-pattern>"
npm run type-check-file "src/tests/.../<file>.test.ts"
npm run lint-file "src/tests/.../<file>.test.ts"
```

Import test globals from `@jest/globals`. **Never** `vitest`.

---

## 6. Test tier placement

Tests that import `@/backend/**`, real SQLite, or boot MCP/AppManager belong in **`src/tests/regression/**`**, not `src/tests/ci/**`. Run `npm run verify:test-tiers` after moving or adding suites. See [ci-v1-contract.md](./ci-v1-contract.md).
