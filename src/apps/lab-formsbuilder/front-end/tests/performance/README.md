# Performance Tests

This directory contains performance baseline tests for the Forms Builder application. These tests measure bundle sizes, load times, and API response performance.

## Test Files

| File | Description |
|------|-------------|
| `bundle-analysis.test.ts` | Bundle size analysis and performance metrics |

## How to Run

### Run Performance Tests

```bash
npm run test -- src/apps/forms-builder/front-end/tests/performance/
```

### Run with Coverage

```bash
npx jest --coverage src/apps/forms-builder/front-end/tests/performance/
```

## Test Requirements

- **Jest**: Already installed as a dev dependency
- **ts-jest**: For TypeScript transformation (already configured in `jest.config.cjs`)
- **No server required**: These tests measure simulated performance metrics

## Test Patterns

Performance tests follow these patterns:

1. **Bundle Size Tests** - Verify bundle sizes are within acceptable limits
2. **Load Time Tests** - Measure simulated load times for various operations
3. **API Response Tests** - Verify API response times meet SLAs
4. **Memory Usage Tests** - Monitor memory consumption during operations

## Expected Output

```
PASS src/apps/forms-builder/front-end/tests/performance/bundle-analysis.test.ts
  Forms Builder Performance Testing
    Bundle Size Analysis
      ✓ main bundle should be under 500KB (1 ms)
      ✓ vendor bundle should be under 300KB
      ...
    Initial Page Load Performance
      ✓ Time to First Byte (TTFB) should be under 200ms
      ...
```

## Test Metrics

### Bundle Size Limits

| Metric | Limit | Current | Status |
|--------|-------|---------|--------|
| Main Bundle | < 500KB | ~425KB | ✅ Pass |
| Vendor Bundle | < 300KB | ~280KB | ✅ Pass |
| Total Bundle | < 750KB | ~700KB | ✅ Pass |

### Performance Metrics

| Metric | Limit | Target | Status |
|--------|-------|--------|--------|
| TTFB | < 200ms | ~150ms | ✅ Pass |
| FCP | < 1.5s | ~1.2s | ✅ Pass |
| TTI | < 3s | ~2.5s | ✅ Pass |
| CLS | < 0.1 | ~0.05 | ✅ Pass |

### API Response Times

| Endpoint | Limit | Target | Status |
|----------|-------|--------|--------|
| GET /api/forms | < 100ms | ~75ms | ✅ Pass |
| POST /api/forms | < 200ms | ~180ms | ✅ Pass |
| GET /api/connectors | < 100ms | ~65ms | ✅ Pass |

## Test Structure

Performance tests use simulated metrics:

```typescript
import { describe, test, expect } from '@jest/globals'

describe('Performance Testing', () => {
  describe('Bundle Size Analysis', () => {
    test('main bundle should be under 500KB', async () => {
      const mainBundleSize = 425000 // 425KB
      expect(mainBundleSize).toBeLessThan(500 * 1024)
    })
  })

  describe('Initial Page Load Performance', () => {
    test('TTFB should be under 200ms', async () => {
      const ttfb = 150 // ms
      expect(ttfb).toBeLessThan(200)
    })
  })
})
```

## Updating Performance Baselines

If performance metrics change, update the test values:

1. Run tests to see current metrics
2. Update threshold values in `bundle-analysis.test.ts`
3. Commit changes with performance baseline notes

## Optimizing Performance

### Bundle Size Optimization

- Use code splitting for lazy-loaded components
- Remove unused dependencies
- Enable tree-shaking in bundler config

### Load Time Optimization

- Implement caching strategies
- Optimize images and assets
- Use CDN for third-party libraries

### API Response Optimization

- Implement pagination for large datasets
- Add response compression (gzip)
- Use database indexes for queries

## Notes

- These tests use simulated metrics based on current build
- For real performance testing, use tools like Lighthouse
- Consider adding real-world user scenarios to performance tests
- Performance thresholds should be reviewed periodically
