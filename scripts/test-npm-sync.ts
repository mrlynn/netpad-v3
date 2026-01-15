/**
 * Test npm Registry Sync Service
 * 
 * Tests Step 3: npm Registry Sync Service
 * 
 * Usage:
 *   npx tsx scripts/test-npm-sync.ts [command]
 * 
 * Commands:
 *   search          - Test package search
 *   metadata        - Test fetching package metadata
 *   discover        - Test package discovery
 *   sync            - Test full registry sync
 *   sync-status     - Test getting sync status
 *   sync-package    - Test syncing a specific package
 *   all             - Run all tests (default)
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import {
  searchNpmRegistry,
  fetchPackageMetadata,
  fetchPackageJson,
  packageExists,
  getPackageVersions,
} from '../src/lib/npm/registry-client';

import {
  discoverNetPadPackages,
  discoverPackagesByCriteria,
  checkPackageUpdate,
} from '../src/lib/npm/package-discovery';

import {
  syncNpmRegistry,
  getSyncStatus,
  syncSpecificPackage,
} from '../src/lib/npm/sync-service';

const command = process.argv[2] || 'all';

async function testSearch() {
  console.log('\n🔍 Testing npm Registry Search...\n');
  
  try {
    // Search for NetPad packages
    // Note: npm registry doesn't support OR operators, so we search for "netpad"
    const query = 'netpad';
    console.log(`Search query: ${query}`);
    
    const results = await searchNpmRegistry(query, { size: 10 });
    
    console.log(`\n✅ Found ${results.total} total packages (showing ${results.objects.length}):\n`);
    
    results.objects.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. ${result.package.name}@${result.package.version}`);
      console.log(`   Description: ${result.package.description || 'N/A'}`);
      console.log(`   Keywords: ${result.package.keywords?.join(', ') || 'N/A'}`);
      console.log(`   Score: ${result.score.final.toFixed(2)}`);
      console.log('');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Search test failed:', error);
    return false;
  }
}

async function testMetadata() {
  console.log('\n📦 Testing Package Metadata Fetch...\n');
  
  try {
    // Test with a known package (if it exists)
    const testPackage = '@netpad/forms';
    console.log(`Fetching metadata for: ${testPackage}`);
    
    const metadata = await fetchPackageMetadata(testPackage);
    
    if (metadata) {
      console.log('\n✅ Package metadata:');
      console.log(JSON.stringify(metadata, null, 2));
      return true;
    } else {
      console.log(`\n⚠️  Package ${testPackage} not found (this is okay if it doesn't exist yet)`);
      return true; // Not an error, just doesn't exist
    }
  } catch (error) {
    console.error('❌ Metadata test failed:', error);
    return false;
  }
}

async function testPackageJson() {
  console.log('\n📄 Testing Package.json Fetch...\n');
  
  try {
    // Test with a known package
    const testPackage = '@netpad/forms';
    console.log(`Fetching package.json for: ${testPackage}`);
    
    const packageJson = await fetchPackageJson(testPackage);
    
    if (packageJson) {
      console.log('\n✅ Package.json:');
      console.log(`   Name: ${packageJson.name}`);
      console.log(`   Version: ${packageJson.version}`);
      console.log(`   Description: ${packageJson.description || 'N/A'}`);
      console.log(`   Has netpad field: ${!!packageJson.netpad}`);
      
      if (packageJson.netpad) {
        console.log(`   NetPad type: ${packageJson.netpad.type}`);
      }
      
      return true;
    } else {
      console.log(`\n⚠️  Package ${testPackage} not found (this is okay if it doesn't exist yet)`);
      return true;
    }
  } catch (error) {
    console.error('❌ Package.json test failed:', error);
    return false;
  }
}

async function testPackageExists() {
  console.log('\n🔎 Testing Package Existence Check...\n');
  
  try {
    const testPackages = ['@netpad/forms', 'react', 'nonexistent-package-12345'];
    
    for (const pkg of testPackages) {
      const exists = await packageExists(pkg);
      console.log(`${pkg}: ${exists ? '✅ Exists' : '❌ Not found'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Package exists test failed:', error);
    return false;
  }
}

async function testDiscovery() {
  console.log('\n🔍 Testing Package Discovery...\n');
  
  try {
    console.log('Discovering NetPad packages from npm registry...');
    console.log('(This may take a minute as it searches npm registry)\n');
    
    const discovered = await discoverNetPadPackages({
      includeOfficial: true,
      includeCommunity: true,
      limit: 20, // Limit for testing
    });
    
    console.log(`\n✅ Discovered ${discovered.length} NetPad packages:\n`);
    
    discovered.slice(0, 10).forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}@${pkg.version}`);
      console.log(`   Type: ${pkg.netpad.type}`);
      console.log(`   Official: ${pkg.isOfficial ? 'Yes' : 'No'}`);
      console.log(`   Verified: ${pkg.isVerified ? 'Yes' : 'No'}`);
      console.log(`   Description: ${pkg.description || 'N/A'}`);
      console.log('');
    });
    
    if (discovered.length === 0) {
      console.log('⚠️  No NetPad packages found in npm registry yet.');
      console.log('   This is expected if no packages have been published yet.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Discovery test failed:', error);
    return false;
  }
}

async function testDiscoveryByCriteria() {
  console.log('\n🎯 Testing Discovery by Criteria...\n');
  
  try {
    console.log('Discovering applications only...');
    const applications = await discoverPackagesByCriteria({
      type: 'application',
      limit: 10,
    });
    
    console.log(`Found ${applications.length} applications`);
    
    console.log('\nDiscovering plugins only...');
    const plugins = await discoverPackagesByCriteria({
      type: 'plugin',
      limit: 10,
    });
    
    console.log(`Found ${plugins.length} plugins`);
    
    return true;
  } catch (error) {
    console.error('❌ Discovery by criteria test failed:', error);
    return false;
  }
}

async function testSyncStatus() {
  console.log('\n📊 Testing Sync Status...\n');
  
  try {
    const status = await getSyncStatus();
    
    console.log('✅ Sync Status:');
    console.log(`   Last Sync: ${status.lastSyncAt ? status.lastSyncAt.toISOString() : 'Never'}`);
    console.log(`   Packages Discovered: ${status.packagesDiscovered}`);
    console.log(`   Errors: ${status.errors.length}`);
    
    if (status.errors.length > 0) {
      console.log(`   Error Details:`, status.errors);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Sync status test failed:', error);
    return false;
  }
}

async function testSyncPackage() {
  console.log('\n🔄 Testing Sync Specific Package...\n');
  
  try {
    // Try to sync a known package (if it exists)
    const testPackage = '@netpad/forms';
    console.log(`Syncing package: ${testPackage}`);
    
    const result = await syncSpecificPackage(testPackage);
    
    if (result.success && result.package) {
      console.log('\n✅ Package synced successfully:');
      console.log(`   Name: ${result.package.name}`);
      console.log(`   Version: ${result.package.version}`);
      console.log(`   Type: ${result.package.netpad.type}`);
      console.log(`   Official: ${result.package.isOfficial}`);
    } else {
      console.log(`\n⚠️  ${result.error || 'Package not found or not a NetPad package'}`);
      console.log('   This is okay if the package doesn\'t exist or isn\'t a NetPad package yet.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Sync package test failed:', error);
    return false;
  }
}

async function testFullSync() {
  console.log('\n🔄 Testing Full Registry Sync...\n');
  console.log('⚠️  This will sync all packages from npm registry to marketplace database.');
  console.log('   This may take several minutes and will update the database.\n');
  
  try {
    const result = await syncNpmRegistry({
      force: true, // Force sync even if recently synced
      includeOfficial: true,
      includeCommunity: true,
    });
    
    console.log('\n✅ Sync completed:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Packages Discovered: ${result.status.packagesDiscovered}`);
    console.log(`   New Packages: ${result.status.packagesNew}`);
    console.log(`   Updated Packages: ${result.status.packagesUpdated}`);
    console.log(`   Errors: ${result.status.errors.length}`);
    
    if (result.status.errors.length > 0) {
      console.log('\n   Error Details:');
      result.status.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (result.status.lastSyncAt) {
      console.log(`   Last Sync: ${result.status.lastSyncAt.toISOString()}`);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Full sync test failed:', error);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('\n🌐 Testing API Endpoint...\n');
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Test GET sync status
    console.log('Testing GET /api/marketplace/npm/sync (status)...');
    const statusResponse = await fetch(`${baseUrl}/api/marketplace/npm/sync`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status endpoint works:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      console.log(`⚠️  Status endpoint returned ${statusResponse.status}`);
      const errorText = await statusResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Note: POST endpoint requires authentication, so we'll skip it in this test
    console.log('\n⚠️  POST endpoint requires authentication - test manually via API client');
    
    return true;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error);
    console.error('   Make sure the dev server is running (npm run dev)');
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running All npm Sync Tests\n');
  console.log('=' .repeat(60));
  
  const results: Record<string, boolean> = {};
  
  results.search = await testSearch();
  results.metadata = await testMetadata();
  results.packageJson = await testPackageJson();
  results.packageExists = await testPackageExists();
  results.discovery = await testDiscovery();
  results.discoveryCriteria = await testDiscoveryByCriteria();
  results.syncStatus = await testSyncStatus();
  results.syncPackage = await testSyncPackage();
  results.apiEndpoint = await testAPIEndpoint();
  
  // Skip full sync by default (requires database write)
  console.log('\n⚠️  Skipping full sync test (requires database write)');
  console.log('   Run with: npx tsx scripts/test-npm-sync.ts sync\n');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:\n');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Main
async function main() {
  try {
    switch (command) {
      case 'search':
        await testSearch();
        break;
      case 'metadata':
        await testMetadata();
        break;
      case 'package-json':
        await testPackageJson();
        break;
      case 'exists':
        await testPackageExists();
        break;
      case 'discover':
        await testDiscovery();
        break;
      case 'discover-criteria':
        await testDiscoveryByCriteria();
        break;
      case 'sync-status':
        await testSyncStatus();
        break;
      case 'sync-package':
        await testSyncPackage();
        break;
      case 'sync':
        await testFullSync();
        break;
      case 'api':
        await testAPIEndpoint();
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
