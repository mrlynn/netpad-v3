# RAG Infrastructure Setup

## Quick Start

To set up RAG infrastructure for an organization, you need the organization ID.

### Step 1: Find Your Organization ID

Query your MongoDB database to find your organization ID:

```bash
# Connect to your MongoDB cluster
mongosh "mongodb+srv://mike:Password678%21@performance.zbcul.mongodb.net/form_builder_platform"

# In the MongoDB shell:
db.organizations.find({}, { orgId: 1, name: 1 })
```

This will show you something like:
```json
{ "_id": "...", "orgId": "org_abc123", "name": "My Organization" }
```

### Step 2: Run the Setup Script

```bash
npm run setup-rag-db -- --org org_abc123
```

Replace `org_abc123` with your actual organization ID.

### What the Script Does

1. ✅ Connects to your MongoDB cluster (`performance.zbcul.mongodb.net`)
2. ✅ Creates database: `netpad_rag_org_abc123`
3. ✅ Creates collections:
   - `rag_documents` (document metadata)
   - `rag_document_chunks` (text chunks + embeddings)
4. ✅ Creates standard indexes for performance
5. ✅ Provides JSON definition for vector search index

### Step 3: Create Vector Search Index Manually

After running the setup script, you'll need to create the vector search index in Atlas UI:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster: **performance**
3. Navigate to: **Database Services** → **Search**
4. Click: **"Create Search Index"**
5. Database: `netpad_rag_org_abc123` (use your actual org ID)
6. Collection: `rag_document_chunks`
7. Use **JSON Editor** and paste the definition from the script output
8. Click **"Create Search Index"**
9. Wait 2-5 minutes for the index to build

### Requirements

The script uses these environment variables (already in your `.env.local`):

```bash
MONGODB_URI=mongodb+srv://...           # Your MongoDB connection string
ATLAS_PUBLIC_KEY=vjbjmvlj               # Atlas Admin API public key
ATLAS_PRIVATE_KEY=58aaa0bd-...          # Atlas Admin API private key
ATLAS_ORG_ID=599eecdf9f78f769464d1568   # Atlas organization ID
```

### Expected Output

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

Instructions:
1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Select cluster: performance
3. Navigate to: Database Services → Search
4. Click: "Create Search Index"
5. Database: netpad_rag_org_abc123
6. Collection: rag_document_chunks
7. Use JSON Editor and paste this definition:

{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "dotProduct"
      },
      {
        "type": "filter",
        "path": "formId"
      },
      {
        "type": "filter",
        "path": "organizationId"
      },
      {
        "type": "filter",
        "path": "documentId"
      },
      {
        "type": "filter",
        "path": "status"
      }
    ]
  }
}

8. Click "Create Search Index"
9. Wait 2-5 minutes for index to build
10. ✅ RAG is ready to use!

📡 Disconnected from MongoDB
```

### Checking Index Status

To check if the vector search index is ready:

1. Go to MongoDB Atlas
2. Navigate to: **Database Services** → **Search**
3. Find your database: `netpad_rag_org_abc123`
4. Look for index: `rag_vector_index` on collection `rag_document_chunks`
5. Status should show **"READY"** when complete (usually 2-5 minutes)

### Troubleshooting

**Error: "MONGODB_URI or TARGET_URI environment variable not set"**
- Make sure you have `.env.local` in your project root
- Check that `MONGODB_URI` or `TARGET_URI` is set in the file

**Error: "Invalid organization ID format"**
- Organization ID must start with `org_` and contain only alphanumeric characters, underscores, and hyphens
- Example: `org_abc123`

**Collections already exist**
- This is normal if you've run the script before
- The script will skip creation and just verify they exist

**Vector index creation taking too long**
- Vector search indexes typically take 2-5 minutes to build
- Large datasets may take longer
- You can monitor progress in Atlas UI: Cluster → Database Services → Search → Indexes

### Manual Verification in Atlas UI

1. Go to MongoDB Atlas
2. Select your cluster: **performance**
3. Navigate to: **Database Services** → **Search**
4. Look for database: `netpad_rag_org_abc123`
5. You should see index: `rag_vector_index` on collection `rag_document_chunks`

### Database Structure

After running the script, you'll have:

```
Cluster: performance
└── Database: netpad_rag_org_abc123
    ├── Collection: rag_documents
    │   ├── Index: formId_1
    │   ├── Index: organizationId_1_formId_1
    │   ├── Index: status_1
    │   └── Index: uploadedAt_-1
    └── Collection: rag_document_chunks
        ├── Index: documentId_1
        ├── Index: formId_1
        ├── Index: organizationId_1_formId_1
        └── Vector Search Index: rag_vector_index ⭐
```

### Vector Index Definition

The script creates a vector search index with this definition:

```json
{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "dotProduct"
      },
      {
        "type": "filter",
        "path": "formId"
      },
      {
        "type": "filter",
        "path": "organizationId"
      },
      {
        "type": "filter",
        "path": "documentId"
      },
      {
        "type": "filter",
        "path": "status"
      }
    ]
  }
}
```

## For Multiple Organizations

You can run the setup script multiple times for different organizations:

```bash
npm run setup-rag-db -- --org org_abc123
npm run setup-rag-db -- --org org_xyz789
npm run setup-rag-db -- --org org_def456
```

Each organization gets its own isolated database and vector index. Remember to create the vector search index in Atlas UI for each organization after running the setup script.

## Next Steps

After running this script:

1. ✅ Your RAG infrastructure is ready
2. ✅ Upload a document via the NetPad UI or API
3. ✅ Test conversational forms with RAG
4. ✅ Monitor usage in the NetPad dashboard

---

*Created as part of Phase 1: RAG Storage Foundation*
