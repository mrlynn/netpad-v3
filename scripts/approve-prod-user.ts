import { MongoClient } from 'mongodb';

const PROD_URI = 'mongodb+srv://mike:Password678%21@performance.zbcul.mongodb.net/netpad?retryWrites=true&w=majority&appName=performance';

async function main() {
  const email = process.argv[2] || 'merlynn@gmail.com';
  const client = new MongoClient(PROD_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Update the users collection (NextAuth.js schema)
    const result = await db.collection('users').updateOne(
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
      
      // Verify
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      console.log('Updated user:', JSON.stringify(user, null, 2));
    } else {
      console.log(`ℹ️  User ${email} was already approved`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
