#!/usr/bin/env npx tsx
/**
 * Test Script: Reset Signup Onboarding Status
 *
 * This script resets a user's signup onboarding status so you can test
 * the Linear-inspired onboarding flow.
 *
 * Usage:
 *   npx tsx scripts/test-signup-onboarding.ts reset <email>
 *   npx tsx scripts/test-signup-onboarding.ts status <email>
 *   npx tsx scripts/test-signup-onboarding.ts complete <email>
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function main() {
  const [action, email] = process.argv.slice(2);

  if (!action || !email) {
    console.log(`
Usage:
  npx tsx scripts/test-signup-onboarding.ts <action> <email>

Actions:
  reset     - Clear signup onboarding status (will show onboarding on next visit)
  status    - Show current onboarding status
  complete  - Mark signup onboarding as complete
  full-reset - Reset everything (removes orgs too - DESTRUCTIVE)

Examples:
  npx tsx scripts/test-signup-onboarding.ts reset user@example.com
  npx tsx scripts/test-signup-onboarding.ts status user@example.com
`);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(PLATFORM_DB_NAME);
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\nFound user: ${user.email} (${user.userId})`);

    switch (action) {
      case 'status': {
        console.log('\n--- Current Status ---');
        console.log('Waitlist Status:', user.waitlistStatus || 'not set (legacy user)');
        console.log('Signup Onboarding:', JSON.stringify(user.signupOnboarding || 'not set', null, 2));
        console.log('Organizations:', user.organizations?.length || 0);
        if (user.organizations?.length > 0) {
          console.log('  First Org:', user.organizations[0].orgId, `(${user.organizations[0].role})`);
        }
        break;
      }

      case 'reset': {
        const result = await usersCollection.updateOne(
          { userId: user.userId },
          {
            $unset: { signupOnboarding: '' },
            $set: { updatedAt: new Date() },
          }
        );
        console.log('\n✓ Reset signup onboarding status');
        console.log('  Modified:', result.modifiedCount);
        console.log('\nNext steps:');
        console.log('  1. Clear your browser cookies/session for localhost');
        console.log('  2. Log in again');
        console.log('  3. You should see the signup onboarding flow');
        break;
      }

      case 'complete': {
        const result = await usersCollection.updateOne(
          { userId: user.userId },
          {
            $set: {
              'signupOnboarding.completed': true,
              'signupOnboarding.completedAt': new Date(),
              updatedAt: new Date(),
            },
          }
        );
        console.log('\n✓ Marked signup onboarding as complete');
        console.log('  Modified:', result.modifiedCount);
        break;
      }

      case 'full-reset': {
        console.log('\n⚠️  FULL RESET - This will:');
        console.log('  - Clear signup onboarding status');
        console.log('  - Remove all organization memberships');
        console.log('\nThis is DESTRUCTIVE. Press Ctrl+C to cancel...');

        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        const result = await usersCollection.updateOne(
          { userId: user.userId },
          {
            $unset: { signupOnboarding: '' },
            $set: {
              organizations: [],
              updatedAt: new Date(),
            },
          }
        );
        console.log('\n✓ Full reset complete');
        console.log('  Modified:', result.modifiedCount);
        console.log('\nNote: Organization data still exists, just membership removed.');
        console.log('You will need to create a new workspace on next login.');
        break;
      }

      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
