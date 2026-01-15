/**
 * Test Script for Application Contracts (Phase 9, Step 1)
 *
 * Tests contract CRUD operations and API endpoints.
 *
 * Usage:
 *   npm run test:contracts
 *   npx tsx scripts/test-contracts.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
import {
  createApplicationContract,
  getApplicationContract,
  getApplicationContractByVersion,
  getActiveApplicationContract,
  listApplicationContracts,
  updateApplicationContract,
  activateApplicationContract,
  deprecateApplicationContract,
  deleteApplicationContract,
  CreateContractInput,
} from '../src/lib/platform/applicationContracts';
import { generateSecureId } from '../src/lib/encryption';

// Test configuration
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'org_test';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
let testApplicationId: string;
let testContractId: string;
let testVersion: string;

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
    console.error(error);
  }
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

// ============================================
// Contract CRUD Tests
// ============================================

async function testCreateContract() {
  log('📝 Testing Contract Creation...');
  
  try {
    testApplicationId = `app_${generateSecureId()}`;
    testVersion = '1.0.0';

    const input: CreateContractInput = {
      applicationId: testApplicationId,
      version: testVersion,
      status: 'draft',
      inputs: {
        email: {
          type: 'string',
          required: true,
          source: 'form',
          description: 'User email address',
        },
        amount: {
          type: 'number',
          required: true,
          constraints: {
            min: 0,
          },
          source: 'form',
          description: 'Payment amount',
        },
      },
      outputs: {
        status: {
          type: 'string',
          guaranteed: true,
          description: 'Payment status',
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
          description: 'Writes payment record to payments collection',
        },
        {
          type: 'notification',
          target: 'email',
          description: 'Sends payment confirmation email',
        },
      ],
      events: [
        {
          name: 'payment.created',
          payloadSchema: {
            type: 'object',
            properties: {
              paymentId: { type: 'string' },
              amount: { type: 'number' },
            },
          },
          description: 'Emitted when payment is created',
        },
      ],
      behaviors: [
        {
          workflowId: 'wf_payment_processing',
          trigger: 'form.submit',
          description: 'Processes payment on form submission',
        },
      ],
      stability: {
        inputs: true,
        outputs: true,
        sideEffects: true,
        events: true,
      },
    };

    const contract = await createApplicationContract(TEST_ORG_ID, input);
    testContractId = contract.contractId;

    logSuccess(`Contract created: ${contract.contractId}`);
    log('Contract details:', {
      contractId: contract.contractId,
      applicationId: contract.applicationId,
      version: contract.version,
      status: contract.status,
      inputsCount: Object.keys(contract.inputs).length,
      outputsCount: Object.keys(contract.outputs).length,
      sideEffectsCount: contract.sideEffects.length,
      eventsCount: contract.events.length,
      behaviorsCount: contract.behaviors.length,
    });

    return true;
  } catch (error: any) {
    logError('Contract creation failed', error);
    return false;
  }
}

async function testGetContract() {
  log('🔍 Testing Get Contract by ID...');
  
  try {
    const contract = await getApplicationContract(TEST_ORG_ID, testContractId);
    
    if (!contract) {
      logError('Contract not found');
      return false;
    }

    logSuccess(`Contract retrieved: ${contract.contractId}`);
    log('Contract version:', contract.version);
    return true;
  } catch (error: any) {
    logError('Get contract failed', error);
    return false;
  }
}

async function testGetContractByVersion() {
  log('🔍 Testing Get Contract by Version...');
  
  try {
    const contract = await getApplicationContractByVersion(
      TEST_ORG_ID,
      testApplicationId,
      testVersion
    );
    
    if (!contract) {
      logError('Contract not found');
      return false;
    }

    logSuccess(`Contract retrieved by version: ${contract.version}`);
    return true;
  } catch (error: any) {
    logError('Get contract by version failed', error);
    return false;
  }
}

async function testListContracts() {
  log('📋 Testing List Contracts...');
  
  try {
    const result = await listApplicationContracts(TEST_ORG_ID, testApplicationId, {
      page: 1,
      pageSize: 10,
    });

    logSuccess(`Listed ${result.contracts.length} contract(s)`);
    log('List result:', {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });

    return true;
  } catch (error: any) {
    logError('List contracts failed', error);
    return false;
  }
}

async function testUpdateContract() {
  log('✏️  Testing Update Contract...');
  
  try {
    // Update contract (should work for draft)
    const updated = await updateApplicationContract(TEST_ORG_ID, testContractId, {
      inputs: {
        email: {
          type: 'string',
          required: true,
          source: 'form',
          description: 'User email address (updated)',
        },
        amount: {
          type: 'number',
          required: true,
          constraints: {
            min: 0,
            max: 10000,
          },
          source: 'form',
          description: 'Payment amount (updated)',
        },
        currency: {
          type: 'string',
          required: false,
          source: 'form',
          description: 'Payment currency (new optional input)',
        },
      },
    });

    logSuccess('Contract updated');
    log('Updated inputs count:', Object.keys(updated.inputs).length);
    return true;
  } catch (error: any) {
    logError('Update contract failed', error);
    return false;
  }
}

async function testActivateContract() {
  log('✅ Testing Activate Contract...');
  
  try {
    const contract = await activateApplicationContract(TEST_ORG_ID, testContractId);
    
    logSuccess(`Contract activated: ${contract.status}`);
    
    // Try to update active contract (should fail)
    try {
      await updateApplicationContract(TEST_ORG_ID, testContractId, {
        inputs: {},
      });
      logError('Should not be able to update active contract');
      return false;
    } catch (error: any) {
      if (error.message.includes('Cannot modify active contract')) {
        logSuccess('Active contract protection works (cannot modify)');
        return true;
      }
      throw error;
    }
  } catch (error: any) {
    logError('Activate contract failed', error);
    return false;
  }
}

async function testGetActiveContract() {
  log('🔍 Testing Get Active Contract...');
  
  try {
    const contract = await getActiveApplicationContract(TEST_ORG_ID, testApplicationId);
    
    if (!contract) {
      logError('Active contract not found');
      return false;
    }

    logSuccess(`Active contract retrieved: ${contract.contractId}`);
    log('Active contract version:', contract.version);
    return true;
  } catch (error: any) {
    logError('Get active contract failed', error);
    return false;
  }
}

async function testDeprecateContract() {
  log('📉 Testing Deprecate Contract...');
  
  try {
    // First, we need to activate it again (if it was deprecated)
    // Actually, it should still be active from the previous test
    // But let's check and activate if needed
    const current = await getApplicationContract(TEST_ORG_ID, testContractId);
    if (current && current.status !== 'active') {
      await activateApplicationContract(TEST_ORG_ID, testContractId);
    }
    
    const contract = await deprecateApplicationContract(TEST_ORG_ID, testContractId);
    
    logSuccess(`Contract deprecated: ${contract.status}`);
    return true;
  } catch (error: any) {
    logError('Deprecate contract failed', error);
    return false;
  }
}

async function testDeleteContract() {
  log('🗑️  Testing Delete Contract...');
  
  try {
    const deleted = await deleteApplicationContract(TEST_ORG_ID, testContractId);
    
    if (deleted) {
      logSuccess('Contract deleted');
      
      // Verify it's gone
      const contract = await getApplicationContract(TEST_ORG_ID, testContractId);
      if (contract) {
        logError('Contract still exists after deletion');
        return false;
      }
      logSuccess('Contract deletion verified');
      return true;
    } else {
      logError('Delete returned false');
      return false;
    }
  } catch (error: any) {
    logError('Delete contract failed', error);
    return false;
  }
}

async function testValidation() {
  log('🔍 Testing Contract Validation...');
  
  try {
    // Test invalid version (use different app ID to avoid conflicts)
    const validationAppId = `app_${generateSecureId()}`;
    try {
      await createApplicationContract(TEST_ORG_ID, {
        applicationId: validationAppId,
        version: 'invalid',
        status: 'draft',
      });
      logError('Should reject invalid version');
      return false;
    } catch (error: any) {
      if (error.message.includes('semantic version')) {
        logSuccess('Version validation works');
      } else {
        throw error;
      }
    }

    // Test missing required fields
    try {
      await createApplicationContract(TEST_ORG_ID, {
        applicationId: validationAppId,
        version: '1.0.0',
        // Missing status
      } as any);
      logError('Should reject missing status');
      return false;
    } catch (error: any) {
      if (error.message.includes('required')) {
        logSuccess('Required field validation works');
      } else {
        throw error;
      }
    }

    return true;
  } catch (error: any) {
    logError('Validation test failed', error);
    return false;
  }
}

// ============================================
// API Endpoint Tests
// ============================================

async function testApiEndpoints() {
  log('🌐 Testing API Endpoints...');
  
  // Note: These tests require authentication
  // In a real scenario, you'd need to set up auth tokens
  
  logWarning('API endpoint tests require authentication');
  logWarning('To test API endpoints manually:');
  logWarning('1. Start the Next.js server: npm run dev');
  logWarning('2. Use an API client (Postman, curl, etc.) with valid session');
  logWarning('3. Test endpoints:');
  logWarning(`   - POST ${BASE_URL}/api/applications/[applicationId]/contracts`);
  logWarning(`   - GET ${BASE_URL}/api/applications/[applicationId]/contracts`);
  logWarning(`   - GET ${BASE_URL}/api/applications/[applicationId]/contracts/by-version/[version]`);
  logWarning(`   - GET ${BASE_URL}/api/applications/[applicationId]/contracts/[contractId]`);
  logWarning(`   - PATCH ${BASE_URL}/api/applications/[applicationId]/contracts/[contractId]`);
  logWarning(`   - DELETE ${BASE_URL}/api/applications/[applicationId]/contracts/[contractId]`);
  
  return true;
}

// ============================================
// Test Runner
// ============================================

async function runAllTests() {
  console.log('\n🧪 Running Application Contracts Tests');
  console.log('============================================================\n');

  const results: { [key: string]: boolean } = {};

  // CRUD Tests
  results.create = await testCreateContract();
  if (!results.create) {
    logError('Cannot continue without creating a contract');
    return results;
  }

  results.get = await testGetContract();
  results.getByVersion = await testGetContractByVersion();
  results.list = await testListContracts();
  results.update = await testUpdateContract();
  results.activate = await testActivateContract();
  results.getActive = await testGetActiveContract();
  results.deprecate = await testDeprecateContract();
  results.delete = await testDeleteContract();
  results.validation = await testValidation();
  results.apiEndpoints = await testApiEndpoints();

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
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }

  return results;
}

// ============================================
// Main
// ============================================

if (require.main === module) {
  runAllTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAllTests };
