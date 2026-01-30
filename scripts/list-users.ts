import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const users = await client.db().collection('platform_users').find({}, { 
    projection: { email: 1, waitlistStatus: 1, displayName: 1 } 
  }).limit(20).toArray();
  console.log(JSON.stringify(users, null, 2));
  await client.close();
}

main().catch(console.error);
