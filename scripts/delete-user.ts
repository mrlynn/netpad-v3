/**
 * Delete User Completely
 * 
 * Usage:
 *   npx tsx scripts/delete-user.ts <email>
 * 
 * This completely removes a user and all their data:
 * - User document
 * - Organizations they own (if sole owner)
 * - Projects in those orgs
 * - Applications, forms, workflows in those projects
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
  console.error('Usage: npx tsx scripts/delete-user.ts <email>');
  console.error('Example: npx tsx scripts/delete-user.ts mike@example.com');
  process.exit(1);
}

async function deleteUser() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('📦 Connected to MongoDB');
    
    const dbName = process.env.PLATFORM_DB_NAME || 'form_builder_platform';
    console.log(`📁 Using database: ${dbName}`);
    const db = client.db(dbName);
    
    const usersCollection = db.collection('users');
    const orgsCollection = db.collection('organizations');
    const projectsCollection = db.collection('projects');
    const applicationsCollection = db.collection('applications');
    const formsCollection = db.collection('forms');
    const workflowsCollection = db.collection('workflows');
    
    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      
      // List some users to help debug
      const sampleUsers = await usersCollection.find({}, { projection: { email: 1, userId: 1 } }).limit(10).toArray();
      if (sampleUsers.length > 0) {
        console.log('\n📋 Users in database:');
        sampleUsers.forEach(u => console.log(`   - ${u.email}`));
      }
      
      process.exit(1);
    }
    
    console.log(`\n👤 Found user: ${user.email}`);
    console.log(`   userId: ${user.userId}`);
    console.log(`   Organizations: ${(user.organizations || []).length}`);
    
    const orgs = user.organizations || [];
    
    // Process each organization
    for (const orgRef of orgs) {
      const org = await orgsCollection.findOne({ orgId: orgRef.orgId });
      if (!org) continue;
      
      console.log(`\n📁 Processing org: ${org.name} (${org.orgId})`);
      
      // Check if user is sole owner
      const members = org.members || [];
      const owners = members.filter((m: any) => m.role === 'owner');
      const isSoleOwner = owners.length === 1 && owners[0].userId === user.userId;
      
      if (isSoleOwner) {
        console.log('   → User is sole owner, deleting org and all contents...');
        
        // Find all projects in this org
        const projects = await projectsCollection.find({ orgId: org.orgId }).toArray();
        
        for (const project of projects) {
          console.log(`   📂 Deleting project: ${project.name} (${project.projectId})`);
          
          // Delete applications in this project
          const apps = await applicationsCollection.find({ projectId: project.projectId }).toArray();
          for (const app of apps) {
            console.log(`      📱 Deleting app: ${app.name}`);
            
            // Delete forms in this app
            const formsDeleted = await formsCollection.deleteMany({ applicationId: app.applicationId });
            console.log(`         📝 Deleted ${formsDeleted.deletedCount} forms`);
            
            // Delete workflows in this app
            const workflowsDeleted = await workflowsCollection.deleteMany({ applicationId: app.applicationId });
            console.log(`         ⚙️  Deleted ${workflowsDeleted.deletedCount} workflows`);
          }
          
          // Delete applications
          const appsDeleted = await applicationsCollection.deleteMany({ projectId: project.projectId });
          console.log(`      📱 Deleted ${appsDeleted.deletedCount} applications`);
        }
        
        // Delete projects
        const projectsDeleted = await projectsCollection.deleteMany({ orgId: org.orgId });
        console.log(`   📂 Deleted ${projectsDeleted.deletedCount} projects`);
        
        // Delete the organization
        await orgsCollection.deleteOne({ orgId: org.orgId });
        console.log(`   ✅ Deleted organization: ${org.name}`);
        
      } else {
        console.log('   → User is not sole owner, removing from members list...');
        await orgsCollection.updateOne(
          { orgId: org.orgId },
          { $pull: { members: { userId: user.userId } } }
        );
      }
    }
    
    // Delete the user
    console.log(`\n🗑️  Deleting user: ${user.email}`);
    await usersCollection.deleteOne({ userId: user.userId });
    
    console.log('\n✅ User completely deleted!');
    console.log('\nYou can now sign up again with this email to test the new flow.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

deleteUser();
