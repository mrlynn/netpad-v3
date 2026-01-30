import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db();
  
  // Simulate what findUserByEmail does
  const user = await db.collection('users').findOne({ email: 'merlynn@gmail.com' });
  
  console.log('=== User from DB ===');
  console.log('userId:', user?.userId);
  console.log('waitlistStatus:', user?.waitlistStatus);
  console.log('oauthConnections type:', typeof user?.oauthConnections, Array.isArray(user?.oauthConnections));
  console.log('oauthConnections:', user?.oauthConnections);
  
  // Check if oauthConnections.some would throw
  try {
    const hasConnection = user?.oauthConnections?.some?.(
      (c: any) => c.provider === 'google'
    );
    console.log('hasConnection check passed:', hasConnection);
  } catch (e) {
    console.log('ERROR in oauthConnections.some:', e);
  }
  
  await client.close();
}

main().catch(console.error);
