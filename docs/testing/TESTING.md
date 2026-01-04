# Testing Guide

This document describes the testing infrastructure, test organization, and how to run tests for the MongoDB Form Builder application.

## Test Architecture

The test suite is organized into three layers:

### 1. Unit Tests (`tests/unit/`)
Fast, isolated tests for individual functions and modules.

- **`utils/`** - Tests for utility functions
  - `conditionalLogic.test.ts` - Conditional visibility logic
- **`lib/`** - Tests for library modules
  - `formulaEngine.test.ts` - Formula parsing and evaluation
  - `formRuntime.test.ts` - Form state management
  - `formStorage.test.ts` - Browser-side storage
  - `formAnalytics.test.ts` - Analytics calculations

### 2. Integration Tests (`tests/integration/`)
Tests for API routes and service interactions.

- **`api/`** - API route tests (planned)

### 3. E2E Tests (`tests/e2e/`)
Full end-to-end tests using Playwright.

- `form-builder.spec.ts` - Complete user flows

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

## Test Coverage

The project aims for the following coverage thresholds:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 50%       |
| Functions  | 50%       |
| Lines      | 50%       |
| Statements | 50%       |

## Writing Tests

### Unit Test Example

```typescript
import { evaluateCondition } from '@/utils/conditionalLogic';
import { FieldCondition } from '@/types/form';

describe('evaluateCondition', () => {
  it('should return true for matching values', () => {
    const condition: FieldCondition = {
      field: 'status',
      operator: 'equals',
      value: 'active',
    };

    expect(evaluateCondition(condition, { status: 'active' })).toBe(true);
  });
});
```

### Using Test Utilities

```typescript
import {
  createMockFormConfig,
  createMockField,
  createMockResponse,
  resetCounters,
} from '../../utils/testUtils';

beforeEach(() => {
  resetCounters();
});

it('should handle form configuration', () => {
  const form = createMockFormConfig({ name: 'Test Form' });
  expect(form.name).toBe('Test Form');
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should create a new form', async ({ page }) => {
  await page.goto('/builder');

  // Fill in form details
  await page.fill('[data-testid="form-name"]', 'My Test Form');

  // Save the form
  await page.click('[data-testid="save-form"]');

  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Key Testing Areas

### Form Builder Core
- Form configuration CRUD operations
- Field management (add, remove, reorder)
- Validation rules

### Conditional Logic
- Show/hide based on field values
- All operators (equals, contains, greaterThan, etc.)
- AND/OR logic combinations

### Formula Engine
- Arithmetic operations
- String functions
- Date functions
- Conditional functions (if, coalesce)
- Field references

### Form Analytics
- Completion rate calculation
- Response trends
- Device breakdown
- Drop-off analysis

### Form Runtime
- State initialization per mode (create, edit, view, clone)
- Field visibility/editability per mode
- Validation
- Document preparation for submission

## Mocking

### LocalStorage
Jest setup includes a localStorage mock. Use the mock functions directly:

```typescript
(global.localStorage.getItem as jest.Mock).mockReturnValue('...');
```

### MongoDB
For integration tests requiring MongoDB, use the test utilities or mock the MongoDB client.

### API Routes
Use the `createMockRequest` utility for testing API route handlers.

## Debugging Tests

### Jest
```bash
# Run specific test file
npx jest tests/unit/lib/formulaEngine.test.ts

# Run tests matching a pattern
npx jest -t "should evaluate"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright
```bash
# Debug mode
npx playwright test --debug

# Generate traces
npx playwright test --trace on

# View traces
npx playwright show-trace trace.zip
```

## CI/CD Integration

The test suite is configured for CI with:
- JUnit reporter for test results
- Coverage reports
- Parallel test execution (where supported)
- Automatic retries for flaky E2E tests

## Test Dependencies

### Jest Stack
- `jest` - Test runner
- `ts-jest` - TypeScript support
- `jest-environment-jsdom` - DOM environment
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/react` - React component testing
- `@testing-library/user-event` - User interaction simulation

### Playwright Stack
- `@playwright/test` - E2E testing framework

## Troubleshooting

### Tests timing out
Increase the timeout in Jest config or individual tests:
```typescript
jest.setTimeout(30000);
// or
it('slow test', async () => { ... }, 30000);
```

### Module resolution errors
Ensure the `@/` path alias is correctly configured in `jest.config.js`.

### E2E tests failing to start server
Check that port 3000 is available and the dev server starts correctly.

### Coverage not generated
Run with `npm run test:coverage` and check the `coverage/` directory.
