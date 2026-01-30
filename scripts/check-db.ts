import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI!;
  // Extract cluster name from URI (safely)
  const clusterMatch = uri.match(/@([^/]+)/);
  console.log('Cluster:', clusterMatch ? clusterMatch[1] : 'unknown');
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log('Database:', db.databaseName);
  
  // Count documents in key collections
  const stats = await Promise.all([
    db.collection('users').countDocuments(),
    db.collection('platform_users').countDocuments(),
    db.collection('forms').countDocuments(),
  ]);
  console.log('Users:', stats[0]);
  console.log('Platform Users:', stats[1]);
  console.log('Forms:', stats[2]);
  
  await client.close();
}

main().catch(console.error);
