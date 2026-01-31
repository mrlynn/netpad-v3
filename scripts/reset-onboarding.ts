/**
 * Reset Onboarding Status for Testing
 * 
 * Usage:
 *   npx tsx scripts/reset-onboarding.ts <email>
 * 
 * This resets both signup and intent onboarding for the specified user,
 * allowing you to test the new user flow again.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/reset-onboarding.ts <email>');
  console.error('Example: npx tsx scripts/reset-onboarding.ts mike@example.com');
  process.exit(1);
}

async function resetOnboarding() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('📦 Connected to MongoDB');
    
    // Use the platform database
    const dbName = process.env.PLATFORM_DB_NAME || 'form_builder_platform';
    console.log(`📁 Using database: ${dbName}`);
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      
      // List some users to help debug
      const sampleUsers = await usersCollection.find({}, { projection: { email: 1, userId: 1 } }).limit(5).toArray();
      if (sampleUsers.length > 0) {
        console.log('\n📋 Sample users in database:');
        sampleUsers.forEach(u => console.log(`   - ${u.email}`));
      } else {
        console.log('\n⚠️  No users found in the users collection');
      }
      
      process.exit(1);
    }
    
    console.log(`👤 Found user: ${user.email} (${user.userId})`);
    console.log(`   Current signupOnboarding:`, user.signupOnboarding || 'not set');
    console.log(`   Current intentOnboarding:`, user.intentOnboarding || 'not set');
    
    // Reset onboarding flags
    const result = await usersCollection.updateOne(
      { userId: user.userId },
      {
        $unset: {
          signupOnboarding: '',
          intentOnboarding: '',
        },
        $set: {
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Onboarding status reset!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Clear your browser cookies/session for netpad.io (or localhost)');
      console.log('2. Log in again');
      console.log('3. You should see the new simplified flow');
    } else {
      console.log('⚠️  No changes made (onboarding may already be unset)');
    }
    
    // Optionally: Also remove organizations to truly start fresh
    const orgs = user.organizations || [];
    if (orgs.length > 0) {
      console.log('');
      console.log(`📁 User has ${orgs.length} organization(s). To fully reset, run:`);
      console.log(`   npx tsx scripts/reset-onboarding.ts ${email} --full`);
    }
    
    // Handle --full flag
    if (process.argv.includes('--full')) {
      console.log('');
      console.log('🗑️  Full reset requested...');
      
      // Remove user's org memberships
      await usersCollection.updateOne(
        { userId: user.userId },
        { $set: { organizations: [] } }
      );
      
      // Optionally delete the orgs themselves (be careful!)
      const orgsCollection = db.collection('organizations');
      for (const orgRef of orgs) {
        const org = await orgsCollection.findOne({ orgId: orgRef.orgId });
        if (org) {
          // Only delete if this user is the sole owner
          const members = org.members || [];
          const owners = members.filter((m: any) => m.role === 'owner');
          if (owners.length === 1 && owners[0].userId === user.userId) {
            console.log(`   Deleting org: ${org.name} (${org.orgId})`);
            await orgsCollection.deleteOne({ orgId: org.orgId });
          } else {
            console.log(`   Skipping org: ${org.name} (has other owners)`);
          }
        }
      }
      
      console.log('✅ Full reset complete!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetOnboarding();
