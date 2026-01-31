import { MongoClient } from 'mongodb';

const PROD_URI = 'mongodb+srv://mike:Password678%21@performance.zbcul.mongodb.net/netpad?retryWrites=true&w=majority&appName=performance';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/approve-user-prod.ts <email>');
    process.exit(1);
  }

  const client = new MongoClient(PROD_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // First, let's see what users exist
    const users = await db.collection('platform_users').find({}, { 
      projection: { email: 1, waitlistStatus: 1, displayName: 1 } 
    }).limit(20).toArray();
    console.log('Existing users:', JSON.stringify(users, null, 2));
    
    // Update the user
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
      console.log(`\n❌ No user found with email: ${email}`);
    } else if (result.modifiedCount > 0) {
      console.log(`\n✅ Approved user: ${email}`);
    } else {
      console.log(`\nℹ️  User ${email} was already approved`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
