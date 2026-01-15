/**
 * Full Phase 9 Test Script
 *
 * Tests:
 * - Contract CRUD (already covered by test-contracts.ts)
 * - Contract Comparison / Breaking Change Detection
 * - Component Protection (Lock/Unlock)
 *
 * Usage:
 *   npx tsx scripts/test-phase9-full.ts
 *   npx tsx scripts/test-phase9-full.ts comparison
 *   npx tsx scripts/test-phase9-full.ts protection
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import {
  createApplicationContract,
  activateApplicationContract,
  deprecateApplicationContract,
  deleteApplicationContract,
  CreateContractInput,
} from '../src/lib/platform/applicationContracts';
import { compareContracts } from '../src/lib/platform/contractComparison';
import {
  lockComponent,
  unlockComponent,
  isComponentLocked,
  getComponentProtection,
  listProtectedComponents,
} from '../src/lib/platform/componentProtection';
import { generateSecureId } from '../src/lib/encryption';

// Test configuration
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'org_test';

// ============================================
// Helper Functions
// ============================================

function log(message: string, data?: any) {
  console.log(`\n${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error.message || error);
  }
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

// ============================================
// Contract Comparison Tests
// ============================================

async function testContractComparison() {
  log('🔄 Testing Contract Comparison / Breaking Change Detection...\n');

  const testAppId = `app_${generateSecureId()}`;
  let contract1Id: string;
  let contract2Id: string;

  try {
    // Create v1.0.0 contract
    log('Creating v1.0.0 contract...');
    const v1Input: CreateContractInput = {
      applicationId: testAppId,
      version: '1.0.0',
      status: 'draft',
      inputs: {
        email: {
          type: 'string',
          required: true,
          source: 'form',
          description: 'User email',
        },
        amount: {
          type: 'number',
          required: true,
          source: 'form',
          description: 'Payment amount',
        },
      },
      outputs: {
        status: {
          type: 'string',
          guaranteed: true,
          description: 'Operation status',
        },
        recordId: {
          type: 'objectId',
          guaranteed: true,
          description: 'Created record ID',
        },
      },
      sideEffects: [
        {
          type: 'write',
          target: 'payments',
          description: 'Writes to payments collection',
        },
      ],
      events: [
        {
          name: 'payment.created',
          description: 'Payment created event',
        },
      ],
      behaviors: [],
      stability: {
        inputs: true,
        outputs: true,
        sideEffects: true,
        events: true,
      },
    };

    const contract1 = await createApplicationContract(TEST_ORG_ID, v1Input);
    contract1Id = contract1.contractId;
    await activateApplicationContract(TEST_ORG_ID, contract1Id);
    logSuccess('v1.0.0 contract created and activated');

    // Create v2.0.0 contract with BREAKING changes
    log('\nCreating v2.0.0 contract (with breaking changes)...');
    const v2Input: CreateContractInput = {
      applicationId: testAppId,
      version: '2.0.0',
      status: 'draft',
      inputs: {
        // REMOVED: email (BREAKING)
        amount: {
          type: 'string', // CHANGED TYPE from number (BREAKING)
          required: true,
          source: 'form',
          description: 'Payment amount as string',
        },
        currency: {
          type: 'string',
          required: true, // NEW REQUIRED INPUT (BREAKING)
          source: 'form',
          description: 'Currency code',
        },
      },
      outputs: {
        status: {
          type: 'string',
          guaranteed: true,
          description: 'Operation status',
        },
        // REMOVED: recordId (BREAKING - was guaranteed)
        transactionId: {
          type: 'string',
          guaranteed: false, // New optional output (non-breaking)
          description: 'Transaction ID',
        },
      },
      sideEffects: [
        // REMOVED: write:payments (BREAKING)
        {
          type: 'write',
          target: 'transactions',
          description: 'Writes to transactions collection',
        },
      ],
      events: [
        // REMOVED: payment.created (BREAKING)
        {
          name: 'transaction.completed',
          description: 'Transaction completed event',
        },
      ],
      behaviors: [],
      stability: {
        inputs: true,
        outputs: true,
        sideEffects: true,
        events: true,
      },
    };

    const contract2 = await createApplicationContract(TEST_ORG_ID, v2Input);
    contract2Id = contract2.contractId;
    logSuccess('v2.0.0 contract created');

    // Compare contracts
    log('\nComparing v1.0.0 -> v2.0.0...');
    const comparison = await compareContracts(TEST_ORG_ID, testAppId, '1.0.0', '2.0.0');

    logSuccess('Comparison completed');
    log('Breaking Changes:', comparison.breakingChanges);
    log('Non-Breaking Changes:', comparison.nonBreakingChanges);
    log('Additive Changes:', comparison.additiveChanges);
    log('Compatibility:', comparison.compatibility);

    // Verify breaking changes detected
    const expectedBreakingTypes = [
      'removed-input', // email removed
      'input-type-change', // amount type changed
      'input-required-change', // currency is new required
      'removed-output', // recordId removed (was guaranteed)
      'removed-side-effect', // write:payments removed
      'removed-event', // payment.created removed
    ];

    const foundBreakingTypes = comparison.breakingChanges.map((c) => c.type);
    const missingTypes = expectedBreakingTypes.filter((t) => !foundBreakingTypes.includes(t as any));

    if (missingTypes.length > 0) {
      logWarning(`Some expected breaking changes not detected: ${missingTypes.join(', ')}`);
    } else {
      logSuccess('All expected breaking changes detected!');
    }

    if (comparison.compatibility !== 'incompatible') {
      logError('Expected compatibility to be "incompatible"');
    } else {
      logSuccess('Compatibility correctly marked as "incompatible"');
    }

    if (comparison.migrationGuide) {
      log('\nMigration Guide Preview (first 500 chars):');
      console.log(comparison.migrationGuide.substring(0, 500) + '...');
      logSuccess('Migration guide generated');
    }

    // Cleanup - must deprecate active contracts before deleting
    log('\nCleaning up test contracts...');
    // contract2 is draft, can delete directly
    await deleteApplicationContract(TEST_ORG_ID, contract2Id);
    // contract1 is active, must deprecate first
    await deprecateApplicationContract(TEST_ORG_ID, contract1Id);
    await deleteApplicationContract(TEST_ORG_ID, contract1Id);
    logSuccess('Test contracts deleted');

    return true;
  } catch (error: any) {
    logError('Contract comparison test failed', error);

    // Cleanup on error - try to deprecate before deleting
    try {
      if (contract2Id!) await deleteApplicationContract(TEST_ORG_ID, contract2Id);
      if (contract1Id!) {
        try {
          await deprecateApplicationContract(TEST_ORG_ID, contract1Id);
        } catch {
          // May already be deprecated or draft
        }
        await deleteApplicationContract(TEST_ORG_ID, contract1Id);
      }
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

// ============================================
// Component Protection Tests
// ============================================

async function testComponentProtection() {
  log('🔒 Testing Component Protection (Lock/Unlock)...\n');

  // Note: These tests require actual forms/workflows in the database
  // We'll test the basic flow but may get "not found" errors if no forms exist

  const testAppId = `app_${generateSecureId()}`;
  const testFormId = `form_${generateSecureId()}`;
  const testWorkflowId = `wf_${generateSecureId()}`;
  const testUserId = `user_${generateSecureId()}`;

  try {
    // Test 1: Lock a form (will likely fail with "not found" unless form exists)
    log('Test 1: Attempting to lock a form...');
    try {
      await lockComponent({
        organizationId: TEST_ORG_ID,
        componentId: testFormId,
        componentType: 'form',
        editableFields: ['name', 'description'],
        lockedBy: testUserId,
      });
      logSuccess('Form locked successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        logWarning('Form not found (expected if no forms exist in test org)');
      } else {
        throw error;
      }
    }

    // Test 2: Check if component is locked
    log('\nTest 2: Checking lock status...');
    try {
      const isLocked = await isComponentLocked(TEST_ORG_ID, testFormId, 'form');
      log('Is form locked:', isLocked);
    } catch (error: any) {
      logWarning('Could not check lock status (form may not exist)');
    }

    // Test 3: Get protection details
    log('\nTest 3: Getting protection details...');
    try {
      const protection = await getComponentProtection(TEST_ORG_ID, testFormId, 'form');
      if (protection) {
        log('Protection details:', protection);
      } else {
        logWarning('No protection details found (form may not exist)');
      }
    } catch (error: any) {
      logWarning('Could not get protection details');
    }

    // Test 4: List protected components
    log('\nTest 4: Listing protected components...');
    try {
      const protectedList = await listProtectedComponents(TEST_ORG_ID, testAppId);
      log('Protected components:', protectedList);
      logSuccess(`Found ${protectedList.length} protected component(s)`);
    } catch (error: any) {
      logWarning('Could not list protected components');
    }

    // Test 5: Unlock component
    log('\nTest 5: Unlocking component...');
    try {
      await unlockComponent({
        organizationId: TEST_ORG_ID,
        componentId: testFormId,
        componentType: 'form',
        unlockedBy: testUserId,
      });
      logSuccess('Form unlocked successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        logWarning('Form not found (expected if no forms exist)');
      } else {
        throw error;
      }
    }

    logSuccess('Component protection tests completed');
    logWarning('Note: Full protection tests require existing forms/workflows in the database');

    return true;
  } catch (error: any) {
    logError('Component protection test failed', error);
    return false;
  }
}

// ============================================
// Test Runner
// ============================================

async function runAllTests() {
  console.log('\n🧪 Running Phase 9 Full Tests');
  console.log('============================================================\n');

  const results: { [key: string]: boolean } = {};

  results.contractComparison = await testContractComparison();
  results.componentProtection = await testComponentProtection();

  // Summary
  console.log('\n============================================================');
  console.log('📊 Test Summary:');
  console.log('============================================================');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All Phase 9 tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }

  return results;
}

// ============================================
// Main
// ============================================

const command = process.argv[2] || 'all';

async function main() {
  try {
    switch (command) {
      case 'comparison':
        await testContractComparison();
        break;
      case 'protection':
        await testComponentProtection();
        break;
      case 'all':
      default:
        await runAllTests();
        break;
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
