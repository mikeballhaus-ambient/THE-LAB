# End-to-End (E2E) Tests

This directory contains Playwright E2E tests for the Forms Builder application. These tests verify complete user workflows from start to finish.

## Test Files

| File | Description |
|------|-------------|
| `form-management.spec.ts` | Form CRUD workflow tests (list, create, edit, delete) |
| `form-designer.spec.ts` | Form designer canvas interaction tests |
| `connectors.spec.ts` | Connector management workflow tests |

## How to Run

### Install Playwright Dependencies (First Time Only)

```bash
npx playwright install
```

### Run All E2E Tests

```bash
npx playwright test src/apps/forms-builder/front-end/tests/e2e/
```

### Run Specific Test File

```bash
# Form management tests
npx playwright test src/apps/forms-builder/front-end/tests/e2e/form-management.spec.ts

# Form designer tests
npx playwright test src/apps/forms-builder/front-end/tests/e2e/form-designer.spec.ts

# Connectors tests
npx playwright test src/apps/forms-builder/front-end/tests/e2e/connectors.spec.ts
```

### Run with Reporter (HTML Report)

```bash
npx playwright test --reporter=html --output=playwright-report/
```

### Run with Coverage

```bash
npx playwright test --reporter=junit --reporter=html
```

## Test Requirements

- **Playwright**: Install via `npx playwright install`
- **Chromium/Browser**: Playwright will download browsers automatically on first run
- **Application Server**: Required for E2E tests (must be running at http://localhost:3000)

## Running the Application Server

Before running E2E tests, ensure the application is running:

```bash
# Start backend and frontend concurrently
npm run dev

# Or start individually:
npm run back-end    # Backend server on port 3000
npm run front-end   # Frontend dev server
```

## Test Patterns

E2E tests follow these patterns:

1. **Navigation Tests** - Verify page navigation and routing
2. **UI Interaction Tests** - Click, type, select dropdowns
3. **State Verification Tests** - Check DOM elements after actions
4. **Error State Tests** - Verify error handling and user feedback

## Expected Output

```
[1/2] Installing dependencies...
[2/2] Running tests...

Running 15 tests using 1 worker

  ✓ src/apps/forms-builder/front-end/tests/e2e/form-management.spec.ts (3s)
    ✓ should display form list with pagination (1.2s)
    ✓ should select a form and navigate to designer (1.8s)
    ...

Test Files  3 passed (3)
Tests      15 passed (15)
```

## Test Structure

Each E2E test file follows this structure:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page
    await page.goto('/path')
  })

  test('should perform action', async ({ page }) => {
    // Click, type, verify
    await expect(element).toBeVisible()
  })
})
```

## Troubleshooting

### Browser Not Found

```bash
npx playwright install chromium
```

### Connection Refused

Ensure the application server is running:
- Backend on port 3000
- Frontend dev server accessible

### Timeout Errors

Increase timeout in test file:
```typescript
test.use({
  timeout: 60000, // 60 seconds
})
```

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test
```

## Notes

- E2E tests are slower than unit tests (typically 30s-60s per test)
- Tests run in a real browser environment
- All tests verify actual user interactions and UI states
- Playwright automatically handles cross-browser testing if configured
