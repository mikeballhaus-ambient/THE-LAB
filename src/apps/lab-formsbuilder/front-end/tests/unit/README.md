# Frontend Unit Tests

This directory contains unit tests for the Forms Builder frontend components, stores, and composables.

## Test Files

| File | Description |
|------|-------------|
| `stores/formStore.test.ts` | Tests for forms state management store |
| `stores/connectorsStore.test.ts` | Tests for connectors state management store |
| `stores/websocketStore.test.ts` | Tests for WebSocket event handling store |
| `composables/useConnectors.test.ts` | Tests for connectors composable functions |

## How to Run

### Run All Frontend Unit Tests

```bash
npm run test -- src/apps/forms-builder/front-end/tests/unit/
```

### Run Specific Test File

```bash
# Forms store tests
npm run test -- src/apps/forms-builder/front-end/tests/unit/stores/formStore.test.ts

# Connectors store tests
npm run test -- src/apps/forms-builder/front-end/tests/unit/stores/connectorsStore.test.ts

# WebSocket store tests
npm run test -- src/apps/forms-builder/front-end/tests/unit/stores/websocketStore.test.ts

# Connectors composable tests
npm run test -- src/apps/forms-builder/front-end/tests/unit/composables/useConnectors.test.ts
```

### Run with Coverage Report

```bash
npx jest --coverage src/apps/forms-builder/front-end/tests/unit/
```

## Test Requirements

- **Jest**: Already installed as a dev dependency
- **ts-jest**: For TypeScript transformation (already configured in `jest.config.cjs`)
- **No app server required**: These tests use mocked dependencies and can run standalone

## Test Patterns

All unit tests follow these patterns:

1. **State Initialization Tests** - Verify initial state values
2. **Getter Tests** - Test computed properties derived from state
3. **Action Tests** - Test async actions (API calls, mutations)
4. **Error Handling Tests** - Verify proper error states and recovery

## Mocking Strategy

- API calls are mocked using `global.fetch`
- Database operations use mock implementations
- External dependencies are stubbed with Jest mocks

## Expected Output

```
PASS src/apps/forms-builder/front-end/tests/unit/stores/formStore.test.ts
  formStore
    state initialization
      ✓ initializes with empty forms array (1 ms)
      ✓ initializes with null selectedFormId
      ...
    getters
      ✓ activeForm getter returns currentForm
      ...
```

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors, ensure:
- All imports use correct relative paths
- Type definitions are properly imported from `@jest/globals`

### Fetch Mock Issues

The tests use `global.fetch` for API mocking. If fetch is not available:

```bash
npm install --save-dev jest-fetch-mock
```

Then add to test files:
```typescript
import 'jest-fetch-mock'
```
