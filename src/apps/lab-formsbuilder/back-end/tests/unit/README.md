# Backend Unit Tests

This directory contains unit tests for the Forms Builder backend services.

## Test Files

| File | Description |
|------|-------------|
| `FormService.test.ts` | Tests for form CRUD operations and business logic |
| `ConnectorVerificationService.test.ts` | Tests for connector verification and contract validation |

## How to Run

### Run All Backend Unit Tests

```bash
npm run test -- src/apps/forms-builder/back-end/tests/unit/
```

### Run Specific Test File

```bash
# Form service tests
npm run test -- src/apps/forms-builder/back-end/tests/unit/FormService.test.ts

# Connector verification service tests
npm run test -- src/apps/forms-builder/back-end/tests/unit/ConnectorVerificationService.test.ts
```

### Run with Coverage Report

```bash
npx jest --coverage src/apps/forms-builder/back-end/tests/unit/
```

## Test Requirements

- **Jest**: Already installed as a dev dependency
- **ts-jest**: For TypeScript transformation (already configured in `jest.config.cjs`)
- **No database required**: Tests use mock database implementations

## Test Patterns

All backend unit tests follow these patterns:

1. **Method Signature Tests** - Verify function signatures and return types
2. **Success Path Tests** - Test happy path scenarios
3. **Error Handling Tests** - Test error conditions and edge cases
4. **Validation Tests** - Test input validation logic

## Mocking Strategy

- Database operations use mock implementations
- External API calls are mocked with `global.fetch`
- Repository methods return mock data

## Expected Output

```
PASS src/apps/forms-builder/back-end/tests/unit/FormService.test.ts
  FormService
    getAllForms
      ✓ returns forms with pagination (1 ms)
      ✓ filters by connector_id
      ...
    getFormByKey
      ✓ returns form when found by key
      ...
```

## Test Structure

Each test file follows this structure:

```typescript
import { describe, test, expect } from '@jest/globals'

describe('ServiceName', () => {
  describe('methodName', () => {
    test('success case', () => {
      // Test implementation
    })

    test('error case', () => {
      // Test implementation
    })
  })
})
```

## Notes

- These tests are simplified versions that focus on business logic verification
- Full integration with real database requires separate integration tests
- All tests can run without the application server being up
