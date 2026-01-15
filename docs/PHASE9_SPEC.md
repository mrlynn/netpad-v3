# Phase 9 Specification: Contracts & Protection

**Status:** 🟡 In Progress  
**Dependencies:** Phase 4 (Releases & Templates) ✅  
**Implementation Date:** January 15, 2026  
**Status Doc:** `docs/PHASE9_IMPLEMENTATION_STATUS.md`

---

## Overview

Phase 9 implements application contracts and component protection to ensure application integrity during upgrades and customization. This phase enables:

- **Contract Definition**: Define stable API surfaces for applications
- **Component Protection**: Lock critical components from modification
- **Upgrade Safety**: Validate contracts during upgrades to prevent breaking changes
- **Breaking Change Detection**: Automatically detect and warn about incompatible changes

---

## Goals

1. **Application Contract Enforcement**
   - Define contracts that specify stable interfaces (inputs, outputs, events, extension points)
   - Enforce contracts during installation and upgrades
   - Validate contract compliance

2. **Locked vs Editable Components**
   - Mark forms and workflows as locked (protected) or editable
   - Prevent modifications to locked components
   - Allow customization of editable components
   - Visual indicators for locked components

3. **Contract Validation on Upgrades**
   - Compare contracts between versions
   - Validate compatibility before allowing upgrades
   - Warn or block incompatible upgrades
   - Provide migration guidance

4. **Breaking Change Detection**
   - Compare contract versions automatically
   - Identify breaking changes (removed fields, changed types, etc.)
   - Categorize changes (breaking, non-breaking, additive)
   - Generate change reports

---

## Architecture

### Core Principle: Public Surface vs Private Internals

**Contracts protect the public surface, not private internals.**

- **Public Surface (Protected by Contract):**
  - Published inputs (what external consumers must provide)
  - Documented outputs (what consumers can rely on)
  - Declared side effects (writes, API calls, notifications)
  - Events emitted (what consumers can subscribe to)
  - Behavioral guarantees (which workflows run, what happens)

- **Private Internals (Not Protected):**
  - Form layout and field order
  - Internal workflow nodes and connections
  - Helper workflows
  - UI styling
  - Internal validation rules (unless they affect public behavior)

**Enforcement happens at publish/deploy time, not edit time.**

Builders can experiment freely. Protection kicks in when:
- Publishing to marketplace
- Promoting to production
- Updating a live application
- Creating a new release

### Contract Model (Explicit Artifact)

```typescript
/**
 * Application Contract - Explicit, diffable, enforceable
 * 
 * This is NOT inferred from forms/workflows. It's explicitly declared
 * by the application builder to define the public API surface.
 */
interface ApplicationContract {
  _id?: ObjectId;
  contractId: string;              // "contract_abc123"
  applicationId: string;            // "app_xyz789"
  version: string;                  // Semantic version (1.0.0) - matches release version
  status: 'draft' | 'active' | 'deprecated';
  
  /**
   * Input Contract - What external consumers must provide
   * Only includes inputs that are part of the public API
   */
  inputs: {
    [key: string]: {
      type: string;                 // 'string', 'number', 'boolean', 'object', 'array'
      required: boolean;
      constraints?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
      };
      source?: 'form' | 'api' | 'webhook' | 'config';
      description?: string;
    };
  };
  
  /**
   * Output Guarantees - What consumers can rely on
   * Only includes outputs that are guaranteed to exist
   */
  outputs: {
    [key: string]: {
      type: string;
      guaranteed: boolean;           // Must always be present
      description?: string;
    };
  };
  
  /**
   * Side Effects - What the application does
   * Documents writes, API calls, notifications, etc.
   */
  sideEffects: Array<{
    type: 'write' | 'api_call' | 'notification' | 'workflow_trigger';
    target: string;                  // Collection name, API endpoint, etc.
    description?: string;
  }>;
  
  /**
   * Events - Events the application emits
   * What external systems can subscribe to
   */
  events: Array<{
    name: string;
    payloadSchema?: Record<string, any>;  // JSON Schema for event payload
    description?: string;
  }>;
  
  /**
   * Behavioral Guarantees - What workflows/behaviors run
   * Documents which workflows are part of the public contract
   */
  behaviors: Array<{
    workflowId: string;
    trigger: string;                 // What triggers this workflow
    description?: string;
  }>;
  
  /**
   * Stability Promises - What will NOT change without major version
   * Explicit promises about what remains stable
   */
  stability: {
    inputs: boolean;                 // Input contract is stable
    outputs: boolean;                // Output contract is stable
    sideEffects: boolean;            // Side effects are stable
    events: boolean;                 // Events are stable
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Design Decisions:**
1. **Explicit, not inferred** - Contract must be explicitly declared
2. **Diffable** - Can be compared between versions deterministically
3. **Public surface only** - Internal forms/workflows not in contract
4. **Immutable when active** - Active contracts cannot be modified (must create new version)

### Component Protection (Optional - For Explicit Locking)

**Note:** Component locking is OPTIONAL and separate from contract enforcement.

Contracts protect the public surface. Component locking protects specific forms/workflows
from modification (e.g., "this workflow is critical, don't let anyone change it").

```typescript
/**
 * Protected Component - Explicit lock on a form/workflow
 * 
 * This is separate from contract enforcement. Use this when you want
 * to prevent modification of specific components, regardless of contract.
 */
interface ProtectedComponent {
  componentId: string;
  componentType: 'form' | 'workflow';
  applicationId: string;
  contractId?: string;              // Optional: link to contract
  locked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  reason?: string;                  // Why it's locked
  
  // What can be customized even when locked
  editableFields?: string[];        // Specific fields that can be edited
  restrictions?: {
    canRename?: boolean;
    canDelete?: boolean;
    canModifyFields?: boolean;
    canModifyLogic?: boolean;
  };
}
```

**When to use component locking:**
- Critical workflows that must not be modified
- Forms that are part of compliance requirements
- System-generated components that should remain untouched

**When NOT to use component locking:**
- General application protection (use contracts instead)
- Preventing breaking changes (contracts handle this)

### Breaking Change Detection (Deterministic Diff)

**Breaking changes are detected by diffing contracts, not heuristics.**

```typescript
/**
 * Contract Comparison - Deterministic diff between two contract versions
 */
interface ContractComparison {
  fromVersion: string;
  toVersion: string;
  
  // Breaking changes (block upgrades or require major version)
  breakingChanges: BreakingChange[];
  
  // Non-breaking changes (safe to upgrade)
  nonBreakingChanges: Change[];
  
  // Additive changes (new features, always safe)
  additiveChanges: Change[];
  
  // Overall compatibility assessment
  compatibility: 'compatible' | 'incompatible' | 'requires-migration';
  
  // Migration guidance
  migrationGuide?: string;
}

/**
 * Breaking Change - Changes that break the public contract
 */
interface BreakingChange {
  type: 
    | 'removed-input'              // Input was removed
    | 'removed-output'             // Guaranteed output was removed
    | 'removed-event'              // Event was removed
    | 'removed-side-effect'        // Side effect was removed
    | 'input-type-change'          // Input type changed (string → number)
    | 'output-type-change'         // Output type changed
    | 'input-required-change'      // Optional → required (breaking for consumers)
    | 'output-guarantee-removed'   // Output no longer guaranteed
    | 'behavior-removed';          // Workflow/behavior was removed
  
  component: string;               // Which input/output/event/behavior
  description: string;             // Human-readable description
  impact: 'high' | 'medium' | 'low';
  migration?: string;              // How to migrate
}

/**
 * Non-Breaking Change - Changes that are safe but worth noting
 */
interface Change {
  type:
    | 'added-input'                // New optional input (safe)
    | 'added-output'               // New output (safe)
    | 'added-event'                // New event (safe)
    | 'added-side-effect'          // New side effect (safe)
    | 'input-optional-change'      // Required → optional (safe)
    | 'output-guarantee-added'     // Output now guaranteed (safe)
    | 'behavior-added';            // New workflow/behavior (safe)
  
  component: string;
  description: string;
}

/**
 * Breaking Change Detection Rules (Deterministic)
 * 
 * These rules are applied by diffing contracts:
 * 
 * BREAKING:
 * - Remove input → BREAKING (consumers can't provide it)
 * - Change input type → BREAKING (type mismatch)
 * - Optional → required → BREAKING (consumers may not provide)
 * - Remove guaranteed output → BREAKING (consumers rely on it)
 * - Change output type → BREAKING (consumers expect different type)
 * - Remove event → BREAKING (subscribers won't receive it)
 * - Remove side effect → BREAKING (consumers expect it)
 * - Remove behavior → BREAKING (workflow no longer runs)
 * 
 * NON-BREAKING:
 * - Add optional input → SAFE (backward compatible)
 * - Add output → SAFE (additive)
 * - Add event → SAFE (additive)
 * - Add side effect → SAFE (additive)
 * - Required → optional → SAFE (more permissive)
 * - Add behavior → SAFE (additive)
 * 
 * INTERNAL CHANGES (Not in contract, always safe):
 * - Form layout changes → SAFE (internal)
 * - Workflow node changes → SAFE (internal, unless in contract)
 * - Validation rule changes → SAFE (internal, unless affects public behavior)
 * - UI styling → SAFE (internal)
 */
```

---

## Enforcement Model

### When Enforcement Happens

**Enforcement occurs at publish/deploy time, NOT edit time.**

1. **Edit Time (No Enforcement)**
   - Builders can experiment freely
   - Forms/workflows can be modified
   - No contract validation
   - No blocking

2. **Publish Time (Enforcement Kicks In)**
   - Creating a new release
   - Publishing to marketplace
   - Promoting to production
   - Updating a live application

3. **Upgrade Time (Validation)**
   - Installing/upgrading an application
   - Comparing contracts between versions
   - Detecting breaking changes
   - Blocking or warning on incompatibility

### Upgrade Model

**Pull-based upgrades with explicit opt-in.**

- Applications are upgraded by the owner (pull-based)
- System validates contract compatibility before upgrade
- Breaking changes require:
  - Major version bump (1.0.0 → 2.0.0)
  - OR explicit override with warning
  - OR migration guide acceptance

**Not push-based:** Platform does not force upgrades on users.

**Not fork-based:** Old versions remain available, but upgrades are in-place.

### Protection Philosophy

**Protect consumers, not builders.**

Every protection rule answers: "Who would be surprised if this changed?"

- **Block if:** External consumers (workflows, APIs, embedded forms) would break
- **Allow if:** Only the builder would be affected (internal changes)

Examples:
- ✅ **Block:** Removing a required input (consumers can't provide it)
- ✅ **Block:** Changing output type (consumers expect different type)
- ✅ **Allow:** Renaming internal form field (not in contract)
- ✅ **Allow:** Changing workflow node order (internal implementation)

## Implementation Steps

### Step 1: Contract Definition & Storage

**Goal:** Enable defining and storing application contracts

**Files to Create:**
- `src/lib/platform/applicationContracts.ts` - Contract CRUD operations
- `src/types/contract.ts` - Contract-related types (if not in application.ts)

**Files to Modify:**
- `src/types/application.ts` - Enhance ApplicationContract interface
- `src/lib/platform/db.ts` - Add `application_contracts` collection and indexes

**Features:**
- ✅ Create contract explicitly (not inferred)
- ✅ Contract version matches release version (immutable)
- ✅ Get contract by version
- ✅ List contracts for application
- ✅ Validate contract structure
- ✅ Mark contract as active/deprecated
- ✅ Prevent modification of active contracts (must create new version)

**API Endpoints:**
- `POST /api/applications/[applicationId]/contracts` - Create contract
- `GET /api/applications/[applicationId]/contracts` - List contracts
- `GET /api/applications/[applicationId]/contracts/by-version/[version]` - Get specific contract by version
- `PATCH /api/applications/[applicationId]/contracts/[contractId]` - Update contract

**Database:**
- Collection: `application_contracts`
- Indexes:
  - `{ applicationId: 1, version: 1 }` (unique)
  - `{ applicationId: 1, status: 1 }`
  - `{ contractId: 1 }` (unique)

---

### Step 2: Contract Enforcement at Publish/Deploy Time

**Goal:** Enforce contracts when publishing or deploying applications

**Files to Create:**
- `src/lib/platform/contractEnforcement.ts` - Enforcement logic
- `src/lib/platform/contractValidation.ts` - Validation utilities

**Files to Modify:**
- `src/lib/platform/applicationReleases.ts` - Add contract validation on release creation
- `src/app/api/applications/[applicationId]/releases/route.ts` - Validate contract before creating release
- `src/lib/platform/installedApplications.ts` - Validate contract on upgrade

**Features:**
- ✅ Validate contract exists before publishing
- ✅ Compare contract with previous version (if upgrading)
- ✅ Detect breaking changes
- ✅ Block publish if breaking changes without version bump
- ✅ Warn on breaking changes (with override option)
- ✅ Allow publish if compatible or non-breaking

**Enforcement Rules:**
- Cannot publish without contract (or explicit "no contract" declaration)
- Cannot publish with breaking changes without major version bump
- Can publish with non-breaking changes (minor/patch version)
- Can publish with explicit override (requires acknowledgment)

**UI Changes:**
- Contract validation errors in publish dialog
- Breaking changes warning with details
- Version bump suggestion for breaking changes
- Override option with acknowledgment

**API Endpoints:**
- `POST /api/applications/[applicationId]/components/lock` - Lock component
- `POST /api/applications/[applicationId]/components/unlock` - Unlock component
- `GET /api/applications/[applicationId]/components/protected` - List protected components

---

### Step 3: Breaking Change Detection (Deterministic Diff)

**Goal:** Automatically detect breaking changes by diffing contracts

**Files to Create:**
- `src/lib/platform/breakingChangeDetection.ts` - Change detection logic
- `src/lib/platform/contractComparison.ts` - Contract diff utilities

**Files to Modify:**
- `src/app/api/applications/[applicationId]/contracts/compare/route.ts` - New endpoint
- `src/components/Applications/ApplicationUpgradeDialog.tsx` - Show breaking changes

**Features:**
- ✅ Compare two contract versions deterministically
- ✅ Detect breaking changes (removed inputs/outputs, type changes, etc.)
- ✅ Categorize changes (breaking, non-breaking, additive)
- ✅ Generate change report with migration guidance
- ✅ Visual diff UI for contracts

**Detection Rules (Deterministic):**
- **Breaking:** Remove input, change input type, optional→required, remove output, change output type, remove event, remove side effect
- **Non-Breaking:** Add optional input, add output, add event, required→optional, add side effect
- **Internal (Not in contract):** Form layout, workflow nodes, validation rules, UI styling (always safe)

**API Changes:**
- `POST /api/applications/[applicationId]/releases` - Returns validation result
- `POST /api/applications/installed/[id]/upgrade` - Validates contract before upgrade

---

### Step 4: Component Protection (Optional - Explicit Locking)

**Goal:** Optional explicit locking of specific forms/workflows

**Note:** This is separate from contract enforcement. Use for explicit protection
of critical components, not general application protection.

**Files to Create:**
- `src/lib/platform/componentProtection.ts` - Protection management

**Files to Modify:**
- `src/types/application.ts` - Add ProtectedComponent interface
- `src/types/form.ts` - Add `locked` and `contractId` fields (optional)
- `src/types/workflow.ts` - Add `locked` and `contractId` fields (optional)
- `src/components/FormBuilder/FormBuilder.tsx` - Show lock indicators, disable editing
- `src/components/WorkflowEditor/WorkflowEditor.tsx` - Show lock indicators, disable editing

**Features:**
- ✅ Lock/unlock forms and workflows (explicit action)
- ✅ Check if component is locked before editing
- ✅ Visual indicators (lock icons, disabled fields)
- ✅ Prevent deletion of locked components
- ✅ Allow selective field editing (if configured)

**UI Changes:**
- Lock icon on locked forms/workflows
- Disabled form builder for locked forms
- Disabled workflow editor for locked workflows
- Warning dialogs when attempting to edit locked components
- "Protected" badge

**When to Use:**
- Critical workflows that must not be modified
- Compliance-required forms
- System-generated components

---

### Step 5: Contract UI & Management

**Goal:** User interface for managing contracts

**Files to Create:**
- `src/components/Applications/ContractEditor.tsx` - Contract editor
- `src/components/Applications/ContractViewer.tsx` - Contract viewer
- `src/components/Applications/BreakingChangesDialog.tsx` - Breaking changes display
- `src/components/Applications/ComponentProtectionDialog.tsx` - Protection management

**Files to Modify:**
- `src/app/orgs/[orgId]/projects/[projectId]/applications/[applicationId]/page.tsx` - Add contract tab
- `src/components/Applications/ApplicationUpgradeDialog.tsx` - Show contract validation

**Features:**
- ✅ Contract editor (explicitly define inputs, outputs, side effects, events, behaviors)
- ✅ Contract viewer (read-only view)
- ✅ Contract diff viewer (side-by-side comparison)
- ✅ Breaking changes display (with migration guidance)
- ✅ Component protection UI (optional explicit locking)
- ✅ Publish validation UI (show contract validation errors)
- ✅ Upgrade validation UI (show breaking changes before upgrade)

**UI Pages:**
- Application detail page → "Contract" tab
- Contract editor modal
- Breaking changes dialog (during upgrades)
- Component protection settings

---

## Database Schema

### application_contracts Collection

```typescript
{
  _id: ObjectId,
  contractId: string,              // "contract_abc123"
  applicationId: string,            // "app_xyz789"
  version: string,                  // "1.0.0"
  status: 'draft' | 'active' | 'deprecated',
  
  // Input contract (explicit, not inferred)
  inputs: {
    [key: string]: {
      type: string,
      required: boolean,
      constraints?: {
        min?: number,
        max?: number,
        pattern?: string,
        enum?: any[]
      },
      source?: 'form' | 'api' | 'webhook' | 'config',
      description?: string
    }
  },
  
  // Output guarantees (explicit, not inferred)
  outputs: {
    [key: string]: {
      type: string,
      guaranteed: boolean,
      description?: string
    }
  },
  
  // Side effects (what the app does)
  sideEffects: Array<{
    type: 'write' | 'api_call' | 'notification' | 'workflow_trigger',
    target: string,
    description?: string
  }>,
  
  // Events (what the app emits)
  events: Array<{
    name: string,
    payloadSchema?: Record<string, any>,
    description?: string
  }>,
  
  // Behavioral guarantees (which workflows run)
  behaviors: Array<{
    workflowId: string,
    trigger: string,
    description?: string
  }>,
  
  // Stability promises
  stability: {
    inputs: boolean,
    outputs: boolean,
    sideEffects: boolean,
    events: boolean
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ applicationId: 1, version: 1 }` (unique)
- `{ applicationId: 1, status: 1 }`
- `{ contractId: 1 }` (unique)

### Forms Collection (Add Fields)

```typescript
{
  // ... existing fields ...
  locked?: boolean,
  contractId?: string,
  lockedAt?: Date,
  lockedBy?: string,
  editableFields?: string[]         // Fields that can be edited even when locked
}
```

### Workflows Collection (Add Fields)

```typescript
{
  // ... existing fields ...
  locked?: boolean,
  contractId?: string,
  lockedAt?: Date,
  lockedBy?: string,
  editableFields?: string[]         // Fields that can be edited even when locked
}
```

---

## API Specification

### Contract Management

#### Create Contract
```
POST /api/applications/[applicationId]/contracts
Body: {
  version: string,                    // Must match release version
  inputs?: { [key: string]: {...} },  // Explicit input contract
  outputs?: { [key: string]: {...} }, // Explicit output contract
  sideEffects?: Array<{...}>,
  events?: Array<{...}>,
  behaviors?: Array<{...}>,
  stability?: { inputs, outputs, sideEffects, events }
}
Response: { success: true, contract: ApplicationContract }

Note: Contract is explicit, not inferred. Builder must declare public surface.
```

#### List Contracts
```
GET /api/applications/[applicationId]/contracts?status=active
Response: { success: true, contracts: ApplicationContract[] }
```

#### Get Contract
```
GET /api/applications/[applicationId]/contracts/by-version/[version]
Response: { success: true, contract: ApplicationContract }
```

#### Update Contract
```
PATCH /api/applications/[applicationId]/contracts/[contractId]
Body: { ...partial contract... }
Response: { success: true, contract: ApplicationContract }
```

#### Compare Contracts
```
GET /api/applications/[applicationId]/contracts/compare?from=1.0.0&to=2.0.0
Response: { 
  success: true, 
  comparison: ContractComparison 
}
```

### Contract Enforcement

#### Validate Contract on Publish
```
POST /api/applications/[applicationId]/releases
Body: {
  version: string,
  changelog?: string
}
Response: {
  success: boolean,
  release?: ApplicationRelease,
  validation?: {
    contractExists: boolean,
    breakingChanges?: BreakingChange[],
    compatibility: 'compatible' | 'incompatible' | 'requires-migration',
    requiresVersionBump?: boolean
  },
  error?: string
}

Note: If breaking changes detected, publish is blocked unless:
- Major version bump (1.0.0 → 2.0.0)
- OR explicit override with acknowledgment
```

#### Compare Contracts
```
GET /api/applications/[applicationId]/contracts/compare?from=1.0.0&to=2.0.0
Response: {
  success: true,
  comparison: ContractComparison
}

Note: Deterministic diff, not heuristics. Compares explicit contract fields.
```

### Component Protection (Optional)

#### Lock Component
```
POST /api/applications/[applicationId]/components/lock
Body: {
  componentId: string,
  componentType: 'form' | 'workflow',
  reason?: string,
  editableFields?: string[]
}
Response: { success: true, component: ProtectedComponent }

Note: Optional explicit locking, separate from contract enforcement.
```

#### Unlock Component
```
POST /api/applications/[applicationId]/components/unlock
Body: {
  componentId: string,
  componentType: 'form' | 'workflow'
}
Response: { success: true }
```

#### List Protected Components
```
GET /api/applications/[applicationId]/components/protected
Response: { 
  success: true, 
  protected: ProtectedComponent[] 
}
```

---

## Testing Strategy

### Unit Tests
- Contract creation and validation
- Breaking change detection
- Component protection enforcement
- Contract comparison logic

### Integration Tests
- Contract validation during upgrades
- Lock enforcement in form/workflow editors
- Breaking changes detection during release creation

### E2E Tests
- Create contract for application
- Lock form and attempt to edit (should be blocked)
- Upgrade application with breaking changes (should warn/block)
- Upgrade application with non-breaking changes (should succeed)

---

## Acceptance Criteria

### Contract Definition (Explicit)
- ✅ Can create contract explicitly (not inferred)
- ✅ Contract includes explicit inputs, outputs, side effects, events, behaviors
- ✅ Contract version matches application release version (immutable)
- ✅ Active contracts cannot be modified (must create new version)
- ✅ Can view contract in UI
- ✅ Contract is diffable between versions

### Contract Enforcement (Publish/Deploy Time)
- ✅ No enforcement at edit time (builders can experiment)
- ✅ Contract validated when creating release
- ✅ Breaking changes detected and reported
- ✅ Breaking changes block publish (unless version bump or override)
- ✅ Non-breaking changes allow publish
- ✅ Internal changes (not in contract) always allowed

### Breaking Change Detection (Deterministic)
- ✅ Automatically compares contract versions by diff
- ✅ Categorizes changes correctly (breaking, non-breaking, additive)
- ✅ Provides migration guidance
- ✅ Visual diff shows what changed
- ✅ Detection is deterministic (not heuristic)

### Component Protection (Optional)
- ✅ Can explicitly lock forms and workflows (optional feature)
- ✅ Locked components show lock icon
- ✅ Cannot edit locked components (or specific fields)
- ✅ Cannot delete locked components
- ✅ Unlock requires appropriate permissions

### Upgrade Validation
- ✅ Contract validated before upgrade (pull-based)
- ✅ Breaking changes detected and reported
- ✅ Incompatible upgrades blocked or warned
- ✅ Compatible upgrades proceed normally
- ✅ Version bump required for breaking changes

---

## Future Enhancements (Out of Scope)

- Contract versioning strategy (semantic versioning for contracts)
- Contract testing framework
- Automated contract generation from code
- Contract marketplace (share contracts)
- Contract compliance monitoring
- Contract migration automation

---

## References

- Phase 4 Spec: `docs/PHASE4_SPEC.md`
- Application Types: `src/types/application.ts`
- Release System: `src/lib/platform/applicationReleases.ts`
