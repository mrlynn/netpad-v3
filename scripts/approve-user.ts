/**
 * Quick script to approve a user's waitlist status
 * Usage: npx tsx scripts/approve-user.ts <email>
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/approve-user.ts <email>');
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Update platform_users collection
    const result = await db.collection('platform_users').updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { 
          waitlistStatus: 'approved',
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ No user found with email: ${email}`);
    } else if (result.modifiedCount > 0) {
      console.log(`✅ Approved user: ${email}`);
    } else {
      console.log(`ℹ️  User ${email} was already approved`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
