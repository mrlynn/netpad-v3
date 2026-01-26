/**
 * Fix Test User Password
 * 
 * This script ensures the test user (test@example.com) has the correct password hash.
 * Useful when the password hash gets out of sync or needs to be reset.
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Use the same database connection as the credentials route
const MONGODB_URI = process.env.MONGODB_URI;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function fixTestUser() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(PLATFORM_DB_NAME);
    const usersCollection = db.collection('users');

    // Find the test user
    const user = await usersCollection.findOne({ email: TEST_EMAIL.toLowerCase() });

    if (!user) {
      console.log(`\n⚠️  Test user not found. Creating new user...`);
      
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
      const userId = `user_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
      
      const newUser = {
        userId,
        email: TEST_EMAIL.toLowerCase(),
        emailVerified: true,
        passwordHash,
        organizations: [],
        oauthConnections: [],
        passkeys: [],
        trustedDevices: [],
        waitlistStatus: 'approved', // Test users should be approved to access the app
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      console.log(`✅ Created test user: ${TEST_EMAIL} (userId: ${userId})`);
      console.log(`   Inserted ID: ${result.insertedId}`);
    } else {
      console.log(`\n📋 Found existing test user: ${user.email} (userId: ${user.userId})`);
      console.log(`   Current waitlist status: ${user.waitlistStatus || '(none)'}`);
      
      // Ensure waitlist status is approved for test users
      if (user.waitlistStatus !== 'approved') {
        console.log('⚠️  Waitlist status is not approved. Updating to approved...');
        await usersCollection.updateOne(
          { userId: user.userId },
          {
            $set: {
              waitlistStatus: 'approved',
              updatedAt: new Date(),
            },
          }
        );
        console.log('✅ Waitlist status updated to approved');
      }
      
      // Verify current password
      if (user.passwordHash) {
        const isValid = await bcrypt.compare(TEST_PASSWORD, user.passwordHash);
        
        if (isValid) {
          console.log('✅ Password is already correct - no changes needed');
        } else {
          console.log('⚠️  Password hash does not match. Updating...');
          
          const newPasswordHash = await bcrypt.hash(TEST_PASSWORD, 10);
          const result = await usersCollection.updateOne(
            { userId: user.userId },
            {
              $set: {
                passwordHash: newPasswordHash,
                updatedAt: new Date(),
              },
            }
          );
          
          if (result.modifiedCount > 0) {
            console.log('✅ Password hash updated successfully');
          } else {
            console.log('⚠️  Update completed but no documents were modified');
          }
        }
      } else {
        console.log('⚠️  User exists but has no password hash. Setting password...');
        
        const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
        const result = await usersCollection.updateOne(
          { userId: user.userId },
          {
            $set: {
              passwordHash,
              updatedAt: new Date(),
            },
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log('✅ Password hash set successfully');
        } else {
          console.log('⚠️  Update completed but no documents were modified');
        }
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying password...');
    const updatedUser = await usersCollection.findOne({ email: TEST_EMAIL.toLowerCase() });
    
    if (updatedUser?.passwordHash) {
      const isValid = await bcrypt.compare(TEST_PASSWORD, updatedUser.passwordHash);
      if (isValid) {
        console.log('✅ Password verification successful!');
        console.log('\n📝 Test credentials:');
        console.log(`   Email: ${TEST_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD}`);
      } else {
        console.error('❌ Password verification failed - something went wrong');
        process.exit(1);
      }
    } else {
      console.error('❌ User has no password hash after update');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error fixing test user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixTestUser();
