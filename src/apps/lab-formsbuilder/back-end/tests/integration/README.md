# Backend Integration Tests

This directory contains integration tests for the Forms Builder API endpoints.

## Test Files

| File | Description |
|------|-------------|
| `forms.test.ts` | Tests for forms CRUD API endpoints |
| `connectors.test.ts` | Tests for connectors management API endpoints |
| `load.test.ts` | Load testing scenarios for concurrent requests |

## How to Run

### Run All Integration Tests

```bash
npm run test -- src/apps/forms-builder/back-end/tests/integration/
```

### Run Specific Test File

```bash
# Forms API integration tests
npm run test -- src/apps/forms-builder/back-end/tests/integration/forms.test.ts

# Connectors API integration tests
npm run test -- src/apps/forms-builder/back-end/tests/integration/connectors.test.ts

# Load testing scenarios
npm run test -- src/apps/forms-builder/back-end/tests/integration/load.test.ts
```

### Run with Coverage Report

```bash
npx jest --coverage src/apps/forms-builder/back-end/tests/integration/
```

## Test Requirements

- **Jest**: Already installed as a dev dependency
- **ts-jest**: For TypeScript transformation (already configured in `jest.config.cjs`)
- **No server required**: These tests simulate API responses and don't require a running server

## Test Patterns

Integration tests follow these patterns:

1. **GET Requests** - Test data retrieval endpoints
2. **POST Requests** - Test resource creation endpoints
3. **PUT/PATCH Requests** - Test resource update endpoints
4. **DELETE Requests** - Test resource deletion endpoints
5. **Error Responses** - Test proper HTTP status codes and error messages

## Mocking Strategy

- API responses are mocked to simulate backend behavior
- Database operations use mock implementations
- No actual network calls are made during tests

## Expected Output

```
PASS src/apps/forms-builder/back-end/tests/integration/forms.test.ts
  Forms API Integration
    GET /api/forms
      ✓ returns list of forms with pagination (1 ms)
      ✓ filters by connector_id
      ...
    POST /api/forms
      ✓ creates new form successfully
      ...
```

## Test Structure

Each integration test file follows this structure:

```typescript
import { describe, test, expect } from '@jest/globals'

describe('API Endpoint Tests', () => {
  describe('GET /api/resource', () => {
    test('returns resource list', async () => {
      // Test implementation
    })
  })

  describe('POST /api/resource', () => {
    test('creates new resource', async () => {
      // Test implementation
    })
  })
})
```

## Notes

- These tests verify API contract compliance
- Tests simulate HTTP request/response cycles
- All tests can run without the application server being up
- Load tests verify performance under concurrent requests
