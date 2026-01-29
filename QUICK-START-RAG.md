# 🚀 Quick Start: Setting Up RAG

## 2-Step Setup Process

### Step 1: Find Your Organization ID

```bash
npm run list-orgs
```

This will show you all organizations in your database:

```
📋 Organizations in Platform Database

Found 1 organization(s):

1. My Organization
   Organization ID: org_abc123
   Slug: my-org
   Plan: free
   Created: 1/28/2026

To set up RAG for an organization, run:
npm run setup-rag-db -- --org org_abc123
```

### Step 2: Set Up Database & Collections

Copy the command from Step 1 output and run it:

```bash
npm run setup-rag-db -- --org org_abc123
```

**Replace `org_abc123` with your actual organization ID!**

This will:
1. ✅ Create database: `netpad_rag_org_abc123`
2. ✅ Create collections for documents and embeddings
3. ✅ Create standard indexes
4. ✅ Provide instructions for creating the vector search index

### Step 3: Create Vector Search Index in Atlas UI

The script output will provide the exact JSON definition you need to paste into Atlas UI.

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select cluster: **performance**
3. Navigate to: **Database Services** → **Search**
4. Click: **"Create Search Index"**
5. Database: `netpad_rag_org_abc123` (from script output)
6. Collection: `rag_document_chunks`
7. Use **JSON Editor** and paste the definition from the script output
8. Click **"Create Search Index"**
9. Wait 2-5 minutes for index to build

## Expected Output

```
🚀 RAG Database Setup

Organization ID: org_abc123

📡 Connecting to MongoDB...
   ✓ Connected

📦 Setting up database: netpad_rag_org_abc123
   Creating collections...
   ✓ Created rag_documents collection
   ✓ Created rag_document_chunks collection

   Creating standard indexes...
   ✓ Created indexes on rag_documents
   ✓ Created indexes on rag_document_chunks

✅ Database Setup Complete!

📝 Next Step: Create Vector Search Index in Atlas UI
[Instructions and JSON definition provided...]
```

## Verify in Atlas UI

1. Go to MongoDB Atlas
2. Select cluster: **performance**
3. Go to: **Database Services** → **Search**
4. Find database: `netpad_rag_org_abc123`
5. You should see: `rag_vector_index` on `rag_document_chunks`

## Troubleshooting

**Can't find organizations?**
- Check your `MONGODB_URI` in `.env.local`
- Make sure you have organizations in the `form_builder_platform` database

**Index still building?**
- This is normal! It takes 2-5 minutes
- You can use RAG once it says "READY"
- Check status in Atlas UI or run the script again

**Need help?**
- See detailed guide: `scripts/rag/README.md`
- Check your environment variables are set in `.env.local`

---

## Your Cluster Details

Based on your `.env.local`:

- **Cluster:** performance (at `performance.zbcul.mongodb.net`)
- **Platform DB:** form_builder_platform
- **RAG Databases:** Will be created as `netpad_rag_{organizationId}`

---

**Next:** After setup is complete, you can upload documents and test RAG features! 🎉
