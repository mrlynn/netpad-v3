# NetPad Testing Sprint Plan

## Executive Summary

NetPad has a solid testing foundation with **385+ passing tests** across unit, integration, and E2E layers. This sprint focuses on expanding coverage to match the complexity of the platform: 100+ API endpoints, 25+ field types, 25+ workflow nodes, and AI features.

## Current State

### Existing Infrastructure ✅

| Component | Status | Details |
|-----------|--------|---------|
| Jest | ✅ Configured | v29.7.0, ts-jest, jsdom |
| Playwright | ✅ Configured | Multi-browser + mobile |
| Test Scripts | ✅ Complete | `test:unit`, `test:integration`, `test:e2e` |
| Coverage | ✅ Set up | 50% threshold |
| Auth Setup | ✅ Working | Playwright global setup with session caching |
| Mocks | ✅ Present | MongoDB, localStorage, matchMedia |

### Existing Test Coverage

| Test Area | Tests | Files |
|-----------|-------|-------|
| Conditional Logic | ~60 | `conditionalLogic.test.ts` |
| Form Runtime | ~50 | `formRuntime.test.ts` |
| Formula Engine | ~80 | `formulaEngine.test.ts` |
| Form Analytics | ~20 | `formAnalytics.test.ts` |
| Validation Patterns | ~40 | `validationGenerator.test.ts` |
| AI Prompts | ~36 | `prompts.test.ts` |
| RAG Integration | ~45 | `ragIntegration.test.ts`, `promptEnhancement.test.ts` |
| Project Export | ~15 | `project-export.test.ts` |
| E2E Basics | ~15 | `form-builder.spec.ts` |
| @netpad/forms | ~70 | Package tests |
| **Total** | **~385+** | |

### Gaps Identified

1. **API Route Tests** - 0 of 100+ endpoints tested
2. **Workflow Engine** - No execution tests
3. **Field Type Validators** - Only partial coverage
4. **Component Tests** - No React component tests
5. **E2E Critical Journeys** - Basic landing page only

---

## Sprint Plan

### Phase 1: Quick Wins (Days 1-3)

#### 1.1 Field Type Validators
Create comprehensive tests for all 25+ field types.

**File:** `tests/unit/lib/validators/fieldValidation.test.ts`

```typescript
// Test each field type's validation
const FIELD_TYPES = [
  'short_text', 'long_text', 'email', 'phone', 'url', 'number',
  'date', 'time', 'datetime', 'dropdown', 'multiple_choice',
  'checkboxes', 'yes_no', 'rating', 'scale', 'slider', 'nps',
  'file', 'image', 'signature', 'matrix', 'ranking',
  'address', 'tags', 'color', 'payment'
];
```

**Priority tests:**
- Email format validation
- Phone number formats (international)
- Number min/max/step validation
- File type/size restrictions
- Required field handling for each type

#### 1.2 Form Submission Validation
**File:** `tests/unit/lib/forms/submission.test.ts`

- Test full form validation with multiple fields
- Test conditional field validation
- Test computed field exclusion from submission

### Phase 2: API Integration Tests (Days 4-7)

#### 2.1 Core Form APIs
**File:** `tests/integration/api/forms.integration.test.ts`

```typescript
describe('Forms API', () => {
  // CRUD operations
  describe('POST /api/forms', () => {});
  describe('GET /api/forms/[formId]', () => {});
  describe('PUT /api/forms/[formId]', () => {});
  describe('DELETE /api/forms/[formId]', () => {});

  // Submissions
  describe('POST /api/forms/[formId]/submit', () => {});
  describe('GET /api/forms/[formId]/responses', () => {});

  // Analytics
  describe('GET /api/forms/[formId]/analytics', () => {});
});
```

#### 2.2 Organization & Auth APIs
**File:** `tests/integration/api/organizations.integration.test.ts`

```typescript
describe('Organizations API', () => {
  describe('POST /api/organizations', () => {});
  describe('GET /api/organizations/[orgId]', () => {});
  describe('Vault Management', () => {
    describe('POST /api/organizations/[orgId]/vault', () => {});
    describe('Connection Testing', () => {});
  });
});
```

#### 2.3 Workflow APIs
**File:** `tests/integration/api/workflows.integration.test.ts`

```typescript
describe('Workflows API', () => {
  describe('CRUD', () => {});
  describe('Execution', () => {});
  describe('Versioning', () => {});
});
```

### Phase 3: Workflow Execution Tests (Days 8-10)

#### 3.1 Workflow Node Tests
**File:** `tests/unit/lib/workflows/nodes.test.ts`

Test each of the 25+ workflow node types:

```typescript
const NODE_TYPES = [
  // Triggers
  'form-trigger', 'webhook-trigger', 'schedule-trigger',
  // Logic
  'condition', 'switch', 'loop', 'delay',
  // Data
  'set-variable', 'transform', 'aggregate',
  // Actions
  'email-send', 'http-request', 'mongodb-query',
  // AI
  'ai-prompt', 'ai-classify', 'ai-extract'
];
```

#### 3.2 Workflow Engine Integration
**File:** `tests/integration/workflows/engine.test.ts`

```typescript
describe('Workflow Execution Engine', () => {
  it('executes form-trigger → email workflow');
  it('evaluates conditional branches correctly');
  it('handles loop nodes with proper iteration');
  it('processes AI nodes with mocked responses');
  it('handles errors and retries gracefully');
});
```

### Phase 4: E2E Critical Journeys (Days 11-14)

#### 4.1 Form Builder Journey
**File:** `tests/e2e/journeys/form-builder.spec.ts`

```typescript
test.describe('Form Builder', () => {
  test('creates form from scratch');
  test('creates form from template');
  test('adds all field types');
  test('configures conditional logic');
  test('previews form');
  test('publishes form');
});
```

#### 4.2 Form Submission Journey
**File:** `tests/e2e/journeys/form-submission.spec.ts`

```typescript
test.describe('Form Submission', () => {
  test('completes multi-step form');
  test('handles validation errors');
  test('uploads files');
  test('submits with conditional fields');
  test('shows success screen');
});
```

#### 4.3 Workflow Builder Journey
**File:** `tests/e2e/journeys/workflow-builder.spec.ts`

```typescript
test.describe('Workflow Builder', () => {
  test('creates form-to-email workflow');
  test('adds conditional branching');
  test('tests workflow execution');
  test('views execution history');
});
```

#### 4.4 Response Management Journey
**File:** `tests/e2e/journeys/responses.spec.ts`

```typescript
test.describe('Response Management', () => {
  test('views response list');
  test('opens response detail');
  test('exports responses to CSV');
  test('deletes responses');
});
```

### Phase 5: CI/CD Pipeline (Days 15-16)

#### 5.1 GitHub Actions Workflow
**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data Factories

### Form Factory
**File:** `tests/factories/formFactory.ts`

```typescript
import { faker } from '@faker-js/faker';

export const FormFactory = {
  create: (overrides = {}) => ({
    name: faker.company.catchPhrase(),
    slug: faker.helpers.slugify(faker.company.buzzNoun()),
    fieldConfigs: [],
    organizationId: faker.string.uuid(),
    projectId: faker.string.uuid(),
    ...overrides
  }),

  withEmailField: () => FormFactory.create({
    fieldConfigs: [FieldFactory.email()]
  }),

  withAllFieldTypes: () => FormFactory.create({
    fieldConfigs: Object.values(FieldFactory)
      .filter(fn => typeof fn === 'function' && fn.name !== 'create')
      .map(fn => fn())
  })
};
```

### Field Factory
**File:** `tests/factories/fieldFactory.ts`

```typescript
export const FieldFactory = {
  shortText: (overrides = {}) => ({
    type: 'short_text',
    path: faker.helpers.slugify(faker.word.noun()),
    label: faker.word.words(2),
    required: false,
    included: true,
    ...overrides
  }),

  email: (overrides = {}) => ({
    type: 'email',
    path: 'email',
    label: 'Email Address',
    required: true,
    included: true,
    validation: { validateFormat: true },
    ...overrides
  }),

  // ... factories for all 25+ field types
};
```

### Workflow Factory
**File:** `tests/factories/workflowFactory.ts`

```typescript
export const WorkflowFactory = {
  formToEmail: (formId: string) => ({
    name: 'Form to Email',
    nodes: [
      { id: 'trigger', type: 'form-trigger', data: { formId } },
      { id: 'email', type: 'email-send', data: { to: 'test@example.com' } }
    ],
    edges: [{ source: 'trigger', target: 'email' }]
  }),

  withCondition: (condition) => ({
    // Conditional workflow template
  })
};
```

---

## Coverage Goals

| Phase | Target Coverage |
|-------|-----------------|
| Phase 1 | 60% |
| Phase 2 | 70% |
| Phase 3 | 75% |
| Phase 4 | 80% |
| Phase 5 | 80% + CI enforcement |

---

## Commands Reference

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=conditionalLogic

# Run tests in watch mode
npm run test:watch
```

---

## Success Metrics

1. **All tests pass** on every PR
2. **Coverage >= 80%** for core modules
3. **E2E tests** cover 10+ critical user journeys
4. **CI pipeline** runs in < 10 minutes
5. **Zero flaky tests** in the main suite

---

## Next Steps

1. [ ] Create `tests/factories/` directory with factories
2. [ ] Add field type validator tests (Phase 1)
3. [ ] Set up mongodb-memory-server for integration tests
4. [ ] Create GitHub Actions workflow
5. [ ] Document test patterns for team

---

## Appendix: Files to Create

```
tests/
├── factories/
│   ├── formFactory.ts
│   ├── fieldFactory.ts
│   ├── workflowFactory.ts
│   └── index.ts
├── integration/
│   ├── setup.ts
│   └── api/
│       ├── forms.integration.test.ts
│       ├── organizations.integration.test.ts
│       └── workflows.integration.test.ts
├── unit/
│   ├── lib/
│   │   ├── validators/
│   │   │   └── fieldValidation.test.ts
│   │   └── workflows/
│   │       └── nodes.test.ts
│   └── utils/
└── e2e/
    └── journeys/
        ├── form-builder.spec.ts
        ├── form-submission.spec.ts
        ├── workflow-builder.spec.ts
        └── responses.spec.ts
```
