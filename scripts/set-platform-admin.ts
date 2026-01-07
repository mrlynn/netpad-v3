/**
 * Set Platform Admin Role Script
 *
 * This script sets a user as a platform admin by updating their platformRole field.
 *
 * Usage:
 *   npx ts-node scripts/set-platform-admin.ts <email|userId> [role]
 *
 * Examples:
 *   npx ts-node scripts/set-platform-admin.ts user@example.com admin
 *   npx ts-node scripts/set-platform-admin.ts user_abc123 admin
 *   npx ts-node scripts/set-platform-admin.ts user@example.com support
 *   npx ts-node scripts/set-platform-admin.ts user@example.com (removes role)
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

type PlatformRole = 'admin' | 'support';

async function setPlatformAdmin() {
  // Get arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: Email or userId is required');
    console.error('\nUsage: npx ts-node scripts/set-platform-admin.ts <email|userId> [role]');
    console.error('\nExamples:');
    console.error('  npx ts-node scripts/set-platform-admin.ts user@example.com admin');
    console.error('  npx ts-node scripts/set-platform-admin.ts user_abc123 admin');
    console.error('  npx ts-node scripts/set-platform-admin.ts user@example.com support');
    console.error('  npx ts-node scripts/set-platform-admin.ts user@example.com (removes role)');
    process.exit(1);
  }

  const identifier = args[0];
  const role = args[1] as PlatformRole | undefined;

  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI or PLATFORM_MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');

    console.log(`Connected to database: ${DATABASE_NAME}`);

    // Find user by email or userId
    const isEmail = identifier.includes('@');
    const query = isEmail 
      ? { email: identifier.toLowerCase() }
      : { userId: identifier };

    const user = await usersCollection.findOne(query);

    if (!user) {
      console.error(`Error: User not found (${isEmail ? 'email' : 'userId'}: ${identifier})`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (userId: ${user.userId})`);
    console.log(`Current platformRole: ${user.platformRole || '(none)'}`);

    // Update the user's platform role
    if (role) {
      if (role !== 'admin' && role !== 'support') {
        console.error(`Error: Invalid role. Must be 'admin' or 'support'`);
        process.exit(1);
      }

      const result = await usersCollection.updateOne(
        { userId: user.userId },
        { 
          $set: { 
            platformRole: role,
            updatedAt: new Date()
          } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`\n✅ Successfully set platformRole to '${role}' for user ${user.email}`);
      } else {
        console.log(`\n⚠️  No changes made (user already has role '${role}')`);
      }
    } else {
      // Remove platform role
      const result = await usersCollection.updateOne(
        { userId: user.userId },
        { 
          $unset: { platformRole: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`\n✅ Successfully removed platformRole from user ${user.email}`);
      } else {
        console.log(`\n⚠️  No changes made (user already has no platform role)`);
      }
    }

    // Verify the update
    const updatedUser = await usersCollection.findOne({ userId: user.userId });
    console.log(`Updated platformRole: ${updatedUser?.platformRole || '(none)'}`);

  } catch (error) {
    console.error('Error setting platform admin:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

setPlatformAdmin();
