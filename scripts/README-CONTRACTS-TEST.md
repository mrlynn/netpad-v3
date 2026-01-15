# Testing Application Contracts (Phase 9, Step 1)

This guide explains how to test the Application Contracts functionality.

## Quick Start

```bash
npm run test:contracts
```

Or directly:

```bash
npx tsx scripts/test-contracts.ts
```

## Prerequisites

1. **Environment Setup**
   - Ensure `.env.local` is configured with `MONGODB_URI`
   - Set `TEST_ORG_ID` in `.env.local` (or it defaults to `org_test`)

2. **Database**
   - The script will use the organization database specified by `TEST_ORG_ID`
   - Contracts are stored in the `applicationContracts` collection

## What Gets Tested

### Contract CRUD Operations

1. **Create Contract**
   - Creates a contract with inputs, outputs, side effects, events, and behaviors
   - Validates contract structure
   - Tests version format validation

2. **Get Contract**
   - Get contract by ID
   - Get contract by version
   - Get active contract

3. **List Contracts**
   - List all contracts for an application
   - Pagination support
   - Status filtering

4. **Update Contract**
   - Update draft contracts
   - Verify active contracts cannot be modified

5. **Activate Contract**
   - Activate a draft contract
   - Verify active contracts are protected from modification

6. **Deprecate Contract**
   - Deprecate an active contract

7. **Delete Contract**
   - Delete deprecated contracts
   - Verify active contracts cannot be deleted

8. **Validation**
   - Test invalid version format rejection
   - Test missing required fields rejection

## Test Data

The script creates:
- A test application ID (randomly generated)
- A contract with version `1.0.0`
- Sample inputs (email, amount)
- Sample outputs (status, recordId)
- Side effects (writes, notifications)
- Events (payment.created)
- Behaviors (workflow triggers)

## Expected Output

```
🧪 Running Application Contracts Tests
============================================================

📝 Testing Contract Creation...
✅ Contract created: contract_abc123
...

============================================================
📊 Test Summary:
============================================================
✅ create
✅ get
✅ getByVersion
✅ list
✅ update
✅ activate
✅ getActive
✅ deprecate
✅ delete
✅ validation
✅ apiEndpoints

11/11 tests passed
🎉 All tests passed!
```

## Manual API Testing

The script tests the library functions directly. To test the API endpoints:

1. **Start the Next.js server:**
   ```bash
   npm run dev
   ```

2. **Get a session token** (via browser login or API)

3. **Test endpoints using curl or Postman:**

   **Create Contract:**
   ```bash
   curl -X POST http://localhost:3000/api/applications/app_123/contracts \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "orgId": "org_test",
       "version": "1.0.0",
       "status": "draft",
       "inputs": {
         "email": {
           "type": "string",
           "required": true,
           "source": "form"
         }
       },
       "outputs": {
         "status": {
           "type": "string",
           "guaranteed": true
         }
       },
       "sideEffects": [],
       "events": [],
       "behaviors": []
     }'
   ```

   **List Contracts:**
   ```bash
   curl http://localhost:3000/api/applications/app_123/contracts?orgId=org_test \
     -H "Cookie: your-session-cookie"
   ```

   **Get Contract by Version:**
   ```bash
   curl http://localhost:3000/api/applications/app_123/contracts/1.0.0?orgId=org_test \
     -H "Cookie: your-session-cookie"
   ```

   **Update Contract:**
   ```bash
   curl -X PATCH http://localhost:3000/api/applications/app_123/contracts/contract_abc?orgId=org_test \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "inputs": {
         "email": {
           "type": "string",
           "required": true,
           "description": "Updated description"
         }
       }
     }'
   ```

   **Activate Contract:**
   ```bash
   curl -X PATCH http://localhost:3000/api/applications/app_123/contracts/contract_abc?orgId=org_test \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "action": "activate"
     }'
   ```

   **Delete Contract:**
   ```bash
   curl -X DELETE http://localhost:3000/api/applications/app_123/contracts/contract_abc?orgId=org_test \
     -H "Cookie: your-session-cookie"
   ```

## Troubleshooting

### "Contract already exists"
- The test application ID might already have a contract
- Change `TEST_ORG_ID` or use a different application ID

### "Cannot modify active contract"
- This is expected behavior
- Active contracts are immutable
- Create a new version instead

### "Cannot delete active contract"
- This is expected behavior
- Deprecate the contract first, then delete

### Database connection errors
- Check `MONGODB_URI` in `.env.local`
- Ensure MongoDB is accessible
- Verify organization database exists

## Next Steps

After Step 1 tests pass:
- Proceed to Step 2: Contract Enforcement at Publish/Deploy Time
- Test contract validation during release creation
- Test breaking change detection
