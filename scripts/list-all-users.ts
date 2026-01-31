import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db();
  
  // List all collections
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));
  
  // Check users collection
  const authUsers = await db.collection('users').find({}, { 
    projection: { email: 1, displayName: 1 } 
  }).limit(10).toArray();
  console.log('\nAuth users:', JSON.stringify(authUsers, null, 2));
  
  // Check platform_users collection
  const platformUsers = await db.collection('platform_users').find({}).limit(10).toArray();
  console.log('\nPlatform users:', JSON.stringify(platformUsers, null, 2));
  
  await client.close();
}

main().catch(console.error);
