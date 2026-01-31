import { MongoClient } from 'mongodb';

const PROD_URI = 'mongodb+srv://mike:Password678%21@performance.zbcul.mongodb.net/netpad?retryWrites=true&w=majority&appName=performance';

async function main() {
  const client = new MongoClient(PROD_URI);
  await client.connect();
  const db = client.db();
  
  // List all collections
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));
  
  // Check for user-related collections
  for (const name of ['users', 'platform_users', 'accounts', 'sessions']) {
    const count = await db.collection(name).countDocuments().catch(() => 0);
    if (count > 0) {
      console.log(`\n${name} (${count} docs):`);
      const docs = await db.collection(name).find({}).limit(5).toArray();
      console.log(JSON.stringify(docs, null, 2));
    }
  }
  
  await client.close();
}

main().catch(console.error);
