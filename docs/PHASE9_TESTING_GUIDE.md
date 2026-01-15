# Phase 9 Testing Guide - Contracts & Protection

This guide explains how to test all Phase 9 functionality: contracts, enforcement, breaking change detection, and component protection.

## Quick Start

### 1. Test Contract CRUD Operations

```bash
npm run test:contracts
```

This runs the comprehensive test suite for contract management (11 tests).

### 2. Manual UI Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to an application:
   - Go to: `http://localhost:3000/orgs/[orgId]/projects/[projectId]/applications/[applicationId]`
   - Click on the **"Contracts"** tab

3. Test contract viewing:
   - View existing contracts
   - Click "View" to see contract details
   - Check all sections (inputs, outputs, side effects, events, behaviors, stability)

---

## Testing Scenarios

### Scenario 1: Create and Manage Contracts

**Via API:**

```bash
# 1. Create a draft contract
curl -X POST http://localhost:3000/api/applications/[applicationId]/contracts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orgId": "your-org-id",
    "version": "1.0.0",
    "status": "draft",
    "inputs": {
      "email": {
        "type": "string",
        "required": true,
        "source": "form",
        "description": "User email address"
      }
    },
    "outputs": {
      "status": {
        "type": "string",
        "guaranteed": true,
        "description": "Operation status"
      }
    },
    "sideEffects": [
      {
        "type": "write",
        "target": "users",
        "description": "Creates user record"
      }
    ],
    "events": [
      {
        "name": "user.created",
        "description": "Emitted when user is created"
      }
    ],
    "behaviors": [],
    "stability": {
      "inputs": true,
      "outputs": true,
      "sideEffects": true,
      "events": true
    }
  }'
```

**Via UI:**
- Navigate to application → Contracts tab
- Click "Create Contract" (currently shows alert - editor coming soon)
- For now, use API to create contracts, then view them in UI

**Expected Results:**
- ✅ Contract created with status "draft"
- ✅ Contract appears in contracts list
- ✅ Can view contract details
- ✅ Can activate contract
- ✅ Active contract cannot be modified
- ✅ Can deprecate active contract
- ✅ Can delete deprecated contract

---

### Scenario 2: Contract Enforcement at Publish Time

**Test Release Creation with Contract Validation:**

```bash
# 1. Create a contract (version 1.0.0)
# (Use API from Scenario 1)

# 2. Activate the contract
curl -X PATCH http://localhost:3000/api/applications/[applicationId]/contracts/[contractId]?orgId=[orgId] \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"action": "activate"}'

# 3. Create a release WITH contract validation
curl -X POST http://localhost:3000/api/applications/[applicationId]/releases \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orgId": "[orgId]",
    "projectId": "[projectId]",
    "version": "1.0.0",
    "validateContract": true,
    "requireContract": false,
    "allowBreakingChanges": false
  }'
```

**Expected Results:**
- ✅ Release created successfully if contract exists
- ✅ Validation result returned in response
- ✅ If breaking changes detected, release blocked (unless `allowBreakingChanges: true`)
- ✅ Warnings shown for non-breaking changes

**Test Breaking Changes:**

```bash
# 1. Create contract v1.0.0 with input "email"
# 2. Activate it
# 3. Create contract v2.0.0 with input "email" removed (BREAKING)
# 4. Try to create release v2.0.0 with validateContract: true

# Expected: Release blocked with error about breaking changes
```

---

### Scenario 3: Breaking Change Detection

**Test Contract Comparison:**

```bash
# Compare two contract versions
curl http://localhost:3000/api/applications/[applicationId]/contracts/compare?orgId=[orgId]&from=1.0.0&to=2.0.0 \
  -H "Cookie: your-session-cookie"
```

**Expected Response:**
```json
{
  "success": true,
  "comparison": {
    "fromVersion": "1.0.0",
    "toVersion": "2.0.0",
    "breakingChanges": [
      {
        "type": "removed-input",
        "component": "email",
        "description": "Input 'email' was removed",
        "impact": "high",
        "migration": "Update consumers to remove 'email' from input"
      }
    ],
    "nonBreakingChanges": [],
    "additiveChanges": [],
    "compatibility": "incompatible",
    "migrationGuide": "# Migration Guide: 1.0.0 → 2.0.0\n\n..."
  }
}
```

**Test Cases:**

1. **Breaking Change: Remove Input**
   - v1.0.0: `{ inputs: { email: {...} } }`
   - v2.0.0: `{ inputs: {} }`
   - Expected: Breaking change detected

2. **Breaking Change: Change Input Type**
   - v1.0.0: `{ inputs: { amount: { type: "number" } } }`
   - v2.0.0: `{ inputs: { amount: { type: "string" } } }`
   - Expected: Breaking change detected

3. **Non-Breaking: Add Optional Input**
   - v1.0.0: `{ inputs: { email: {...} } }`
   - v2.0.0: `{ inputs: { email: {...}, name: { required: false, ... } } }`
   - Expected: Non-breaking change (additive)

4. **Breaking Change: Remove Guaranteed Output**
   - v1.0.0: `{ outputs: { status: { guaranteed: true } } }`
   - v2.0.0: `{ outputs: {} }`
   - Expected: Breaking change detected

---

### Scenario 4: Component Protection

**Test Locking a Form:**

```bash
# Lock a form
curl -X POST http://localhost:3000/api/applications/[applicationId]/components/lock \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orgId": "[orgId]",
    "componentId": "[formId]",
    "componentType": "form",
    "contractId": "[optional-contract-id]",
    "editableFields": ["name", "description"]
  }'
```

**Test Locking a Workflow:**

```bash
# Lock a workflow
curl -X POST http://localhost:3000/api/applications/[applicationId]/components/lock \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orgId": "[orgId]",
    "componentId": "[workflowId]",
    "componentType": "workflow"
  }'
```

**Test Unlocking:**

```bash
# Unlock a component
curl -X POST http://localhost:3000/api/applications/[applicationId]/components/unlock \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orgId": "[orgId]",
    "componentId": "[formId]",
    "componentType": "form"
  }'
```

**List Protected Components:**

```bash
# List all protected components
curl http://localhost:3000/api/applications/[applicationId]/components/protected?orgId=[orgId] \
  -H "Cookie: your-session-cookie"
```

**Expected Results:**
- ✅ Form/workflow locked successfully
- ✅ Component appears in protected list
- ✅ Can unlock component
- ✅ Editable fields work (if specified)

---

### Scenario 5: Contract Validation on Upgrades

**Test Upgrade Validation:**

```typescript
// Using the library function directly
import { validateContractForUpgrade } from '@/lib/platform/contractEnforcement';

const result = await validateContractForUpgrade(
  orgId,
  applicationId,
  '1.0.0',  // from version
  '2.0.0'   // to version
);

// Check result
if (!result.valid) {
  console.log('Breaking changes:', result.breakingChanges);
  console.log('Errors:', result.errors);
}
```

**Expected Results:**
- ✅ Breaking changes detected
- ✅ Compatibility status returned
- ✅ Migration guide generated
- ✅ Upgrade blocked if incompatible

---

## UI Testing Checklist

### Contracts Tab

- [ ] Navigate to application detail page
- [ ] Click "Contracts" tab
- [ ] View contracts list (if any exist)
- [ ] Click "View" on a contract
- [ ] Verify contract details display correctly:
  - [ ] Inputs section
  - [ ] Outputs section
  - [ ] Side effects section
  - [ ] Events section
  - [ ] Behaviors section
  - [ ] Stability promises
  - [ ] Metadata
- [ ] Test contract actions:
  - [ ] Activate draft contract
  - [ ] Deprecate active contract
  - [ ] Delete deprecated contract
- [ ] Verify status chips display correctly
- [ ] Test empty state (when no contracts exist)

### Contract Enforcement

- [ ] Create a release with `validateContract: true`
- [ ] Verify validation results in response
- [ ] Test with breaking changes (should block)
- [ ] Test with non-breaking changes (should allow)
- [ ] Test with `allowBreakingChanges: true` (should allow)

### Component Protection

- [ ] Lock a form via API
- [ ] Verify form appears in protected list
- [ ] Unlock form via API
- [ ] Verify form removed from protected list
- [ ] Test with editable fields
- [ ] Lock a workflow via API
- [ ] Verify workflow appears in protected list

---

## Automated Test Script

The existing test script (`scripts/test-contracts.ts`) tests:

1. ✅ Contract creation
2. ✅ Get contract by ID
3. ✅ Get contract by version
4. ✅ Get active contract
5. ✅ List contracts
6. ✅ Update contract (draft only)
7. ✅ Activate contract
8. ✅ Deprecate contract
9. ✅ Delete contract
10. ✅ Validation (invalid inputs)
11. ✅ API endpoints

**Run it:**
```bash
npm run test:contracts
```

---

## Troubleshooting

### "MONGODB_URI environment variable is not set"

**Solution:**
- Ensure `.env.local` exists in project root
- Add: `MONGODB_URI=your-mongodb-connection-string`
- The test script loads from `.env.local`

### "Contract already exists"

**Solution:**
- The test script generates random application IDs
- If you see this, it might be a race condition
- Try running the test again

### "Cannot modify active contract"

**Solution:**
- This is expected behavior
- Active contracts are immutable
- Create a new version instead

### "Cannot delete active contract"

**Solution:**
- This is expected behavior
- Deprecate the contract first, then delete

### API Returns 401 Unauthorized

**Solution:**
- Ensure you're logged in
- Check session cookie is valid
- Verify `orgId` matches your organization

### Contracts Tab Shows Empty

**Solution:**
- Create a contract first (via API or future UI)
- Ensure `applicationId` in URL matches the contract's application
- Check browser console for errors

---

## Next Steps

After testing Phase 9:

1. **Test Contract Editor** (when implemented)
   - Create contracts via UI
   - Edit draft contracts
   - Define inputs/outputs visually

2. **Test Breaking Changes Dialog** (when implemented)
   - View breaking changes during upgrades
   - See migration guide
   - Acknowledge and proceed

3. **Test Component Protection UI** (when implemented)
   - Lock/unlock components via UI
   - See lock indicators in form/workflow editors
   - Manage editable fields

---

## Quick Reference

### API Endpoints

- `POST /api/applications/[applicationId]/contracts` - Create contract
- `GET /api/applications/[applicationId]/contracts` - List contracts
- `GET /api/applications/[applicationId]/contracts/[contractId]` - Get contract
- `GET /api/applications/[applicationId]/contracts/by-version/[version]` - Get by version
- `PATCH /api/applications/[applicationId]/contracts/[contractId]` - Update/activate/deprecate
- `DELETE /api/applications/[applicationId]/contracts/[contractId]` - Delete contract
- `GET /api/applications/[applicationId]/contracts/compare?from=X&to=Y` - Compare contracts
- `POST /api/applications/[applicationId]/components/lock` - Lock component
- `POST /api/applications/[applicationId]/components/unlock` - Unlock component
- `GET /api/applications/[applicationId]/components/protected` - List protected components

### Test Scripts

- `npm run test:contracts` - Run contract CRUD tests

### UI Pages

- `/orgs/[orgId]/projects/[projectId]/applications/[applicationId]` - Application detail (Contracts tab)
