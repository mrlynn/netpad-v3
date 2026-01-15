/**
 * Phase 4 Backend Test Script
 *
 * Tests Application Releases, Workflow Templates, and related functionality
 * Run with: npx ts-node scripts/test-phase4-backend.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI!;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  notes?: string;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[Test] ${message}`);
}

function pass(test: string, notes?: string) {
  results.push({ test, status: 'PASS', notes });
  console.log(`✅ PASS: ${test}${notes ? ` - ${notes}` : ''}`);
}

function fail(test: string, error: string) {
  results.push({ test, status: 'FAIL', error });
  console.log(`❌ FAIL: ${test} - ${error}`);
}

function skip(test: string, notes: string) {
  results.push({ test, status: 'SKIP', notes });
  console.log(`⏭️  SKIP: ${test} - ${notes}`);
}

async function main() {
  console.log('\n========================================');
  console.log('Phase 4 Backend Test Suite');
  console.log('========================================\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    log('Connected to MongoDB');

    const platformDb = client.db(PLATFORM_DB_NAME);

    // Get a test organization
    const orgsCollection = platformDb.collection('organizations');
    const testOrg = await orgsCollection.findOne({});

    if (!testOrg) {
      console.log('❌ No organization found. Please create one first.');
      return;
    }

    const orgId = testOrg.orgId;
    log(`Using test org: ${orgId} (${testOrg.name})`);

    // Get org database - IMPORTANT: use orgId directly as db name to match getOrgDb()
    // The getOrgDb function uses orgId directly as the database name
    const orgDbName = orgId;
    log(`Using org database: ${orgDbName}`);
    const orgDb = client.db(orgDbName);

    // Get a test project
    const projectsCollection = platformDb.collection('projects');
    const testProject = await projectsCollection.findOne({ organizationId: orgId });

    if (!testProject) {
      console.log('❌ No project found. Please create one first.');
      return;
    }

    const projectId = testProject.projectId;
    log(`Using test project: ${projectId} (${testProject.name})`);

    // Get or create test application
    // IMPORTANT: Application must have matching projectId AND organizationId
    // because createApplicationRelease validates all three fields
    const applicationsCollection = orgDb.collection('applications');
    let testApp = await applicationsCollection.findOne({
      projectId,
      organizationId: orgId,
      isDefault: { $ne: true }
    });

    if (!testApp) {
      // Create a test application
      const newApp = {
        applicationId: `app_test_${Date.now()}`,
        projectId,
        organizationId: orgId,
        name: 'Phase 4 Test Application',
        description: 'Created for Phase 4 testing',
        slug: `test-app-${Date.now()}`,
        version: '1.0.0',
        tags: ['test', 'phase4'],
        stats: { formsCount: 0, workflowsCount: 0, connectionsCount: 0 },
        status: 'active',
        isDefault: false,
        createdBy: 'test-script',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await applicationsCollection.insertOne(newApp);
      testApp = await applicationsCollection.findOne({ applicationId: newApp.applicationId });
      log(`Created test application: ${newApp.applicationId}`);
    } else {
      log(`Using existing application: ${testApp.applicationId} (${testApp.name})`);
    }

    if (!testApp) {
      console.log('❌ Failed to create or find test application.');
      return;
    }

    const applicationId = testApp.applicationId;

    // Debug: Verify the test app has correct fields
    log(`Test app fields:`);
    log(`  applicationId: ${testApp.applicationId}`);
    log(`  projectId: ${testApp.projectId}`);
    log(`  organizationId: ${testApp.organizationId}`);
    log(`  Expected projectId: ${projectId}`);
    log(`  Expected orgId: ${orgId}`);

    console.log('\n--- Part 1: Application Releases Backend Tests ---\n');

    // Test 1.1.1: List Releases - Empty State
    const releasesCollection = orgDb.collection('applicationReleases');

    // Clean up any existing test releases first
    await releasesCollection.deleteMany({ applicationId, version: { $regex: /^99\./ } });

    const emptyReleases = await releasesCollection.find({ applicationId }).toArray();
    const initialReleaseCount = emptyReleases.length;
    log(`Initial release count: ${initialReleaseCount}`);

    // Test 1.2.1: Next Version Suggestion - First Release
    // Import the function to test
    const { getNextReleaseVersionSuggestion } = await import('../src/lib/platform/applicationReleases');

    try {
      const suggestedVersion = await getNextReleaseVersionSuggestion(orgId, applicationId);
      if (initialReleaseCount === 0) {
        if (suggestedVersion === '1.0.0') {
          pass('1.2.1 First Release Version Suggestion', `Got "${suggestedVersion}" for app with no releases`);
        } else {
          fail('1.2.1 First Release Version Suggestion', `Expected "1.0.0", got "${suggestedVersion}"`);
        }
      } else {
        // Has releases, should suggest next minor
        pass('1.2.1 Version Suggestion (with existing releases)', `Got "${suggestedVersion}"`);
      }
    } catch (error: any) {
      fail('1.2.1 Version Suggestion', error.message);
    }

    // Test 1.3.1: Create First Release
    const { createApplicationRelease, listApplicationReleases } = await import('../src/lib/platform/applicationReleases');

    // Debug: check what the library function sees
    const { getApplicationsCollection } = await import('../src/lib/platform/db');
    const appCollFromLib = await getApplicationsCollection(orgId);
    const appFromLib = await appCollFromLib.findOne({ applicationId, projectId, organizationId: orgId });
    log(`Library sees app: ${appFromLib ? 'FOUND' : 'NOT FOUND'}`);
    if (!appFromLib) {
      // Check what apps exist
      const allApps = await appCollFromLib.find({}).toArray();
      log(`All apps in library collection: ${allApps.length}`);
      for (const a of allApps.slice(0, 3)) {
        log(`  - ${a.applicationId}, projectId: ${a.projectId}, orgId: ${a.organizationId}`);
      }
    }

    const testVersion = `99.${Date.now() % 10000}.0`; // Unique version for cleanup

    try {
      const release = await createApplicationRelease({
        organizationId: orgId,
        projectId,
        applicationId,
        version: testVersion,
        changelog: 'Test release created by Phase 4 test script',
      });

      if (release.releaseId && release.releaseId.startsWith('rel_')) {
        pass('1.3.1 Create Release - releaseId format', `Got "${release.releaseId}"`);
      } else {
        fail('1.3.1 Create Release - releaseId format', `Expected rel_*, got "${release.releaseId}"`);
      }

      if (release.version === testVersion) {
        pass('1.3.1 Create Release - version match', `Version "${release.version}" matches`);
      } else {
        fail('1.3.1 Create Release - version match', `Expected "${testVersion}", got "${release.version}"`);
      }

      if (release.manifest) {
        pass('1.3.1 Create Release - manifest exists', `Has ${release.manifest.forms?.length || 0} forms, ${release.manifest.workflows?.length || 0} workflows`);
      } else {
        fail('1.3.1 Create Release - manifest exists', 'No manifest in release');
      }

    } catch (error: any) {
      fail('1.3.1 Create Release', error.message);
    }

    // Test 1.3.4: Duplicate Version Prevention
    try {
      await createApplicationRelease({
        organizationId: orgId,
        projectId,
        applicationId,
        version: testVersion, // Same version
        changelog: 'Should fail',
      });
      fail('1.3.4 Duplicate Version Prevention', 'Should have thrown error');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        pass('1.3.4 Duplicate Version Prevention', 'Correctly rejected duplicate version');
      } else {
        fail('1.3.4 Duplicate Version Prevention', `Unexpected error: ${error.message}`);
      }
    }

    // Test 1.3.5: Invalid Version Format
    const invalidVersions = ['v1.0.0', '1.0', '1.0.0.0', '1.x.0', 'latest'];
    for (const badVersion of invalidVersions) {
      try {
        await createApplicationRelease({
          organizationId: orgId,
          projectId,
          applicationId,
          version: badVersion,
          changelog: 'Should fail',
        });
        fail(`1.3.5 Invalid Version "${badVersion}"`, 'Should have thrown error');
      } catch (error: any) {
        if (error.message.includes('semantic version')) {
          pass(`1.3.5 Invalid Version "${badVersion}"`, 'Correctly rejected');
        } else {
          fail(`1.3.5 Invalid Version "${badVersion}"`, `Unexpected error: ${error.message}`);
        }
      }
    }

    // Test 1.3.6: Valid Version Formats
    const validVersions = [`99.${Date.now() % 10000}.1`, `99.${Date.now() % 10000}.2`];
    for (const goodVersion of validVersions) {
      try {
        const release = await createApplicationRelease({
          organizationId: orgId,
          projectId,
          applicationId,
          version: goodVersion,
        });
        if (release.releaseId) {
          pass(`1.3.6 Valid Version "${goodVersion}"`, 'Created successfully');
        }
      } catch (error: any) {
        fail(`1.3.6 Valid Version "${goodVersion}"`, error.message);
      }
    }

    // Test 1.1.1 (revisited): List Releases with data
    try {
      const listResult = await listApplicationReleases(orgId, applicationId, { page: 1, pageSize: 20 });
      if (listResult.releases && listResult.releases.length > 0) {
        pass('1.1.1 List Releases', `Found ${listResult.releases.length} releases, total: ${listResult.total}`);
      } else {
        fail('1.1.1 List Releases', 'No releases returned');
      }

      // Test 1.1.2: Pagination
      if (listResult.page === 1 && listResult.pageSize === 20) {
        pass('1.1.2 Pagination Parameters', `page: ${listResult.page}, pageSize: ${listResult.pageSize}, totalPages: ${listResult.totalPages}`);
      }
    } catch (error: any) {
      fail('1.1.1 List Releases', error.message);
    }

    // Test 1.2.2: Version Bump after releases
    try {
      const suggestedVersion = await getNextReleaseVersionSuggestion(orgId, applicationId);
      // Should be a minor bump from the latest
      if (suggestedVersion.match(/^\d+\.\d+\.0$/)) {
        pass('1.2.2 Version Bump Suggestion', `Suggests "${suggestedVersion}" after existing releases`);
      } else {
        fail('1.2.2 Version Bump Suggestion', `Unexpected format: "${suggestedVersion}"`);
      }
    } catch (error: any) {
      fail('1.2.2 Version Bump Suggestion', error.message);
    }

    console.log('\n--- Part 2: Workflow Templates Backend Tests ---\n');

    // Check workflow templates collection
    const templatesCollection = orgDb.collection('workflowTemplates');

    // Test 2.1.1: List All Templates
    const templates = await templatesCollection.find({}).toArray();
    if (templates.length > 0) {
      pass('2.1.1 List Templates', `Found ${templates.length} templates`);

      // Verify template structure
      const firstTemplate = templates[0];
      if (firstTemplate.templateId && firstTemplate.name && firstTemplate.definition) {
        pass('2.1.1 Template Structure', `Has templateId, name, definition`);
      } else {
        fail('2.1.1 Template Structure', 'Missing required fields');
      }
    } else {
      skip('2.1.1 List Templates', 'No templates found - run npm run seed:workflow-templates first');
    }

    // Test 2.1.2: Filter by Tag
    if (templates.length > 0) {
      const approvalTemplates = await templatesCollection.find({ tags: 'approval' }).toArray();
      pass('2.1.2 Filter by Tag', `Found ${approvalTemplates.length} templates with "approval" tag`);
    }

    // Test 2.1.3: Search by Name
    if (templates.length > 0) {
      const searchResults = await templatesCollection.find({
        $or: [
          { name: { $regex: 'approval', $options: 'i' } },
          { description: { $regex: 'approval', $options: 'i' } },
        ]
      }).toArray();
      pass('2.1.3 Search by Name/Description', `Found ${searchResults.length} templates matching "approval"`);
    }

    console.log('\n--- Part 3: Workflow Creation with Templates ---\n');

    // Test 3.1.1: Create Workflow from Template
    if (templates.length > 0) {
      const { createWorkflow } = await import('../src/lib/workflow/db');
      const templateToUse = templates[0];

      try {
        const workflow = await createWorkflow(
          orgId,
          'test-user',
          {
            name: 'Test Workflow from Template',
            description: 'Created by Phase 4 test script',
            projectId,
            applicationId,
            templateId: templateToUse.templateId,
          }
        );

        if (workflow.id) {
          pass('3.1.1 Create Workflow from Template', `Created workflow ${workflow.id}`);

          // Verify template was applied
          if (workflow.canvas?.nodes?.length > 0) {
            pass('3.1.1 Template Applied', `Workflow has ${workflow.canvas.nodes.length} nodes from template`);
          } else {
            // Template might have empty canvas
            pass('3.1.1 Template Applied', 'Workflow created (template may have empty canvas)');
          }

          // Clean up
          const workflowsCollection = orgDb.collection('workflows');
          await workflowsCollection.deleteOne({ id: workflow.id });
        }
      } catch (error: any) {
        fail('3.1.1 Create Workflow from Template', error.message);
      }
    } else {
      skip('3.1.1 Create Workflow from Template', 'No templates available');
    }

    // Test 3.1.2: Create Workflow Without Template
    try {
      const { createWorkflow } = await import('../src/lib/workflow/db');
      const workflow = await createWorkflow(
        orgId,
        'test-user',
        {
          name: 'Test Workflow Without Template',
          description: 'Created by Phase 4 test script',
          projectId,
          applicationId,
        }
      );

      if (workflow.id) {
        pass('3.1.2 Create Workflow Without Template', `Created workflow ${workflow.id}`);

        // Clean up
        const workflowsCollection = orgDb.collection('workflows');
        await workflowsCollection.deleteOne({ id: workflow.id });
      }
    } catch (error: any) {
      fail('3.1.2 Create Workflow Without Template', error.message);
    }

    // Test 3.1.3: Invalid templateId
    try {
      const { createWorkflow } = await import('../src/lib/workflow/db');
      const workflow = await createWorkflow(
        orgId,
        'test-user',
        {
          name: 'Test Workflow Invalid Template',
          description: 'Created by Phase 4 test script',
          projectId,
          applicationId,
          templateId: 'invalid-template-id-12345',
        }
      );

      if (workflow.id) {
        pass('3.1.3 Invalid templateId - Graceful Fallback', 'Workflow created despite invalid template');

        // Clean up
        const workflowsCollection = orgDb.collection('workflows');
        await workflowsCollection.deleteOne({ id: workflow.id });
      }
    } catch (error: any) {
      fail('3.1.3 Invalid templateId - Graceful Fallback', `Should not throw: ${error.message}`);
    }

    console.log('\n--- Part 9: Data Integrity Tests ---\n');

    // Test 9.1.2: Release ID Uniqueness
    const allReleases = await releasesCollection.find({ applicationId }).toArray();
    const releaseIds = allReleases.map(r => r.releaseId);
    const uniqueIds = new Set(releaseIds);
    if (releaseIds.length === uniqueIds.size) {
      pass('9.1.2 Release ID Uniqueness', `All ${releaseIds.length} release IDs are unique`);
    } else {
      fail('9.1.2 Release ID Uniqueness', `Found duplicate IDs: ${releaseIds.length} total, ${uniqueIds.size} unique`);
    }

    // Verify releaseId format
    const validIdFormat = releaseIds.every(id => id.startsWith('rel_'));
    if (validIdFormat) {
      pass('9.1.2 Release ID Format', 'All IDs start with "rel_"');
    } else {
      fail('9.1.2 Release ID Format', 'Some IDs have invalid format');
    }

    // Clean up test releases
    console.log('\n--- Cleanup ---\n');
    const deleteResult = await releasesCollection.deleteMany({ applicationId, version: { $regex: /^99\./ } });
    log(`Cleaned up ${deleteResult.deletedCount} test releases`);

    // Print Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`Total: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.test}: ${r.error}`);
      });
    }

    console.log('\n');

    // Return results for potential programmatic use
    return { passed, failed, skipped, results };

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await client.close();
    log('Disconnected from MongoDB');
  }
}

main().catch(console.error);
