# RAG Phase 3 - End-to-End Testing Guide

**Version:** 1.0.0
**Date:** January 29, 2026
**Status:** Testing in Progress

## Overview

This document provides a comprehensive testing guide for Phase 3 (User-Cluster Storage Support) of the RAG implementation. It covers both manual and automated testing scenarios.

## Prerequisites

### Environment Setup

1. **MongoDB Atlas Cluster Requirements:**
   - M10+ cluster tier (M10, M20, M30, etc.)
   - MongoDB version 6.0.11 or later
   - Atlas Vector Search enabled
   - Valid connection string

2. **NetPad Environment:**
   - Development server running (`npm run dev`)
   - Valid organization with forms
   - User authenticated with admin access
   - ENCRYPTION_KEY environment variable set

3. **Test Data:**
   - Sample MongoDB connection string
   - Sample documents (PDF, TXT, CSV)
   - Test forms with conversational mode

### Generate Encryption Key (if needed)

```bash
# Generate a new encryption key
openssl rand -hex 32

# Add to .env.local
echo "ENCRYPTION_KEY=<your-generated-key>" >> .env.local
```

## Test Scenarios

### Scenario 1: Platform Storage (Default)

**Objective:** Verify platform storage works correctly with existing RAG features

#### Steps:

1. Navigate to Apps → [Your App] → Settings
2. Click "Manage RAG Settings" button (in Knowledge Base section)
3. Click the "Configuration" tab
4. Verify current mode shows "Platform Storage"
5. Upload a test document
4. Enable conversational mode on a form
5. Verify knowledge base section shows document count
6. Test conversational form with document context
7. Delete document
8. Verify document count updates

**Expected Results:**
- ✅ Default mode is "Platform Storage"
- ✅ Documents stored in platform database
- ✅ Document count updates in real-time
- ✅ Conversational form uses document context
- ✅ No connection string required

---

### Scenario 2: User-Cluster Setup (First-Time)

**Objective:** Complete first-time setup of user-cluster storage

#### Steps:

1. **Navigate to Storage Settings:**
   - Go to Apps → [Your App] → Settings → RAG
   - Click the "Configuration" tab
   - Current mode should show "Platform Storage"

2. **Initiate User-Cluster Setup:**
   - Select "User-Cluster Storage" radio button
   - Wizard dialog should open automatically

3. **Step 1: Connect Cluster**
   - Paste MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net`
   - Click "Validate Cluster"

4. **Step 2: Validation**
   - Wait for validation to complete (~2-5 seconds)
   - Review validation results

5. **Step 3: Configuration**
   - Review configuration summary
   - Click "Complete Setup"

6. **Verify Configuration:**
   - Storage mode should now show "User-Cluster Storage"
   - Cluster tier and version should be displayed

**Expected Results:**
- ✅ Wizard opens on radio button change
- ✅ Connection string is masked (password hidden)
- ✅ Validation completes successfully
- ✅ All requirements pass (version, tier, Vector Search)
- ✅ Configuration saves successfully
- ✅ Mode switches to "User-Cluster Storage"

**Validation Checks:**

```typescript
// Expected validation result structure
{
  isValid: true,
  connectionSuccessful: true,
  mongoVersion: "7.0.x" (>= 6.0.11),
  clusterTier: "M10" (>= M10),
  vectorSearchAvailable: true,
  latencyMs: < 200,
  issues: [] (empty for valid cluster)
}
```

---

### Scenario 3: User-Cluster Validation Failures

**Objective:** Test validation error handling with invalid clusters

#### Test Cases:

##### 3a. Invalid Connection String

**Steps:**
1. Enter invalid connection string: `mongodb://invalid:27017`
2. Click "Validate Cluster"

**Expected Results:**
- ❌ Validation fails with connection error
- 📝 Clear error message: "Failed to connect to cluster"
- 🔄 User can go back and fix connection string

##### 3b. Old MongoDB Version

**Steps:**
1. Connect to cluster with MongoDB 5.x
2. Attempt validation

**Expected Results:**
- ❌ Validation fails with version error
- 📝 Error: "MongoDB version 5.x is too old. Version 6.0.11+ is required"
- 💡 Resolution: "Upgrade your MongoDB Atlas cluster to version 6.0.11 or later"

##### 3c. Free Tier Cluster (M0)

**Steps:**
1. Connect to M0/M2/M5 cluster
2. Attempt validation

**Expected Results:**
- ❌ Validation fails with tier error
- 📝 Error: "Cluster tier M0 is too small. M10+ required for production use"
- 💡 Resolution: "Upgrade to M10 or higher cluster tier"

##### 3d. No Vector Search

**Steps:**
1. Connect to M10+ cluster without Vector Search
2. Attempt validation

**Expected Results:**
- ⚠️ Warning about Vector Search
- 📝 Message: "Atlas Vector Search not detected or not enabled"
- 💡 Resolution: "Enable Vector Search in Atlas UI"

---

### Scenario 4: Document Upload (User-Cluster)

**Objective:** Verify document upload works with user-cluster storage

#### Steps:

1. **Setup Prerequisites:**
   - Ensure user-cluster mode is configured
   - Have test documents ready

2. **Upload via Settings:**
   - Go to Organization Settings → RAG Settings
   - Click "Upload Documents"
   - Select multiple documents (PDF, TXT, CSV)
   - Click "Upload"

3. **Verify Storage:**
   - Documents should appear in uploads list
   - Check MongoDB Atlas (your cluster)
   - Verify documents in `netpad_rag` database
   - Collections: `rag_documents`, `rag_document_chunks`

4. **Upload via Conversational Form:**
   - Enable conversational mode on a form
   - Click "Upload Documents" in knowledge base banner
   - Upload document via modal
   - Verify count updates

**Expected Results:**
- ✅ Documents upload successfully
- ✅ Progress indicators show during upload
- ✅ Documents stored in user's cluster (not platform)
- ✅ Embeddings generated correctly
- ✅ Vector search index can query documents
- ✅ Document count updates in UI

**MongoDB Verification:**

```bash
# Connect to your cluster
mongosh "mongodb+srv://cluster.mongodb.net"

# Switch to RAG database
use netpad_rag

# Check documents
db.rag_documents.find().pretty()

# Check chunks with embeddings
db.rag_document_chunks.find().limit(1).pretty()
```

---

### Scenario 5: Mode Switching

**Objective:** Test switching between platform and user-cluster modes

#### 5a. Platform → User-Cluster

**Steps:**
1. Start with platform storage (with documents)
2. Switch to user-cluster storage
3. Complete wizard setup
4. Upload documents to user cluster
5. Test conversational forms

**Expected Results:**
- ✅ Wizard guides through setup
- ✅ Platform documents remain (not deleted)
- ✅ New documents go to user cluster
- ✅ Forms can access user-cluster documents

#### 5b. User-Cluster → Platform

**Steps:**
1. Start with user-cluster storage (with documents)
2. Switch to platform storage
3. Confirm migration warning
4. Upload documents to platform
5. Test conversational forms

**Expected Results:**
- ⚠️ Warning dialog appears
- 📝 Message: "Switching back to platform storage will require migrating your documents"
- ✅ User-cluster config removed after confirmation
- ✅ New documents go to platform storage
- ⚠️ User-cluster documents still exist (manual cleanup)

---

### Scenario 6: Contextual Knowledge Base Access

**Objective:** Test new UX enhancements for knowledge base discoverability

#### Steps:

1. **Enable Conversational Mode (No Documents):**
   - Open a saved form
   - Go to Conversational tab
   - Enable conversational mode
   - Verify warning banner appears

2. **Upload First Document:**
   - Click "Upload Documents" in warning banner
   - Upload one document
   - Close modal
   - Verify warning disappears

3. **Check Info Banner:**
   - Verify info banner shows "1 document uploaded"
   - Click "Manage Documents"
   - Verify modal opens with current document
   - Upload another document

4. **Advanced Settings:**
   - Click "Advanced Settings" button
   - Verify page scrolls to RAG section
   - Verify RAG accordion expands
   - Check retrieval config options

5. **Delete All Documents:**
   - Remove all documents
   - Close modal
   - Verify warning banner reappears

**Expected Results:**
- ✅ Warning appears only when documentCount === 0
- ✅ Info banner always visible when conversational enabled
- ✅ Document count updates automatically
- ✅ Modal opens without navigation
- ✅ Scroll-to-section works smoothly
- ✅ Warning reappears when documents deleted

---

### Scenario 7: Encryption & Security

**Objective:** Verify connection string encryption and security

#### Steps:

1. **Check Encryption Key:**
   ```bash
   echo $ENCRYPTION_KEY
   # Should output 64-character hex string
   ```

2. **Store Connection String:**
   - Complete user-cluster setup with connection string
   - Check database for stored config
   - Verify connection string is encrypted

3. **MongoDB Verification:**
   ```javascript
   // In platform database
   db.rag_storage_configs.findOne({ organizationId: "org_xxx" })

   // Connection string should look like:
   // "abc123:def456:789ghi..." (encrypted format)
   // NOT: "mongodb+srv://username:password@..."
   ```

4. **Decryption Test:**
   - Restart server
   - Access form with conversational mode
   - Verify connection still works (decryption successful)

5. **Invalid Key Test:**
   - Change ENCRYPTION_KEY to invalid value
   - Restart server
   - Attempt to use user-cluster storage
   - Should fail with clear error message

**Expected Results:**
- ✅ Connection strings encrypted in database
- ✅ Format: `iv:authTag:ciphertext` (hex-encoded)
- ✅ Decryption works on server restart
- ✅ Invalid key produces clear error
- ✅ No plaintext credentials in logs

---

## Testing Checklist

### Backend Components

- [ ] PlatformStorageProvider works (existing functionality)
- [ ] UserClusterStorageProvider initializes correctly
- [ ] Storage factory selects correct provider
- [ ] Connection pooling works (getOrgDb)
- [ ] Validation service checks version/tier/Vector Search
- [ ] Encryption functions work (encrypt/decrypt)
- [ ] API routes handle auth correctly

### UI Components

- [ ] ClusterSetupWizard opens on mode change
- [ ] Wizard steps flow correctly (Connect → Validate → Configure)
- [ ] ValidationResultDisplay shows issues clearly
- [ ] StorageModeSettings shows current mode
- [ ] Knowledge base banner appears when conversational enabled
- [ ] Warning shows when documentCount === 0
- [ ] Document count updates on modal close
- [ ] Scroll-to-section works for advanced settings

### Integration Tests

- [ ] Upload document → stored in correct database
- [ ] Switch modes → no data loss
- [ ] Conversational form uses correct storage provider
- [ ] RAG retrieval works with user-cluster documents
- [ ] Multiple organizations isolated correctly
- [ ] Concurrent uploads handled gracefully

### Error Handling

- [ ] Invalid connection string → clear error
- [ ] Network timeout → graceful fallback
- [ ] Missing encryption key → helpful error message
- [ ] Validation failures → actionable resolutions
- [ ] API errors → user-friendly messages

### Performance

- [ ] Validation completes in < 5 seconds
- [ ] Document upload shows progress
- [ ] Provider caching works (no repeated connections)
- [ ] No memory leaks with multiple uploads
- [ ] UI remains responsive during operations

### Security

- [ ] Connection strings encrypted at rest
- [ ] No credentials in client-side code
- [ ] No credentials in server logs
- [ ] Auth checks on all API routes
- [ ] Organization isolation enforced

## Common Issues & Solutions

### Issue 1: "ENCRYPTION_KEY environment variable is not set"

**Solution:**
```bash
# Generate key
openssl rand -hex 32

# Add to .env.local
echo "ENCRYPTION_KEY=<key>" >> .env.local

# Restart server
npm run dev
```

### Issue 2: Validation fails with "Connection timeout"

**Possible Causes:**
- IP not whitelisted in Atlas
- Invalid connection string
- Network firewall blocking MongoDB port

**Solution:**
1. Add IP to Atlas Network Access
2. Verify connection string format
3. Test connection with `mongosh`

### Issue 3: "Vector Search not available"

**Solution:**
1. Go to Atlas UI → Search
2. Create Vector Search index
3. Index name: `vector_index`
4. Field: `embedding`, Type: `vector`, Dimensions: `1024`

### Issue 4: Documents not appearing after upload

**Debugging Steps:**
1. Check browser console for errors
2. Check server logs for upload status
3. Verify MongoDB connection
4. Check `rag_documents` collection
5. Verify embedding generation succeeded

### Issue 5: Mode switch doesn't update UI

**Solution:**
1. Hard refresh browser (Cmd+Shift+R)
2. Check if config saved in database
3. Clear provider cache
4. Restart server

## Manual Testing Workflow

### Quick Test (10 minutes)

1. ✅ Start dev server
2. ✅ Generate encryption key
3. ✅ Navigate to RAG settings
4. ✅ Verify platform storage works
5. ✅ Switch to user-cluster mode
6. ✅ Complete wizard with test cluster
7. ✅ Upload one document
8. ✅ Test conversational form

### Comprehensive Test (30 minutes)

1. ✅ Run quick test first
2. ✅ Test all validation failure cases
3. ✅ Upload multiple documents (PDF, TXT, CSV)
4. ✅ Test mode switching (platform ↔ user-cluster)
5. ✅ Verify encryption in database
6. ✅ Test contextual knowledge base access
7. ✅ Test scroll-to-section and modal
8. ✅ Delete documents and verify cleanup
9. ✅ Test with multiple forms
10. ✅ Test with multiple organizations

## Automated Testing (Future)

### Unit Tests

```typescript
// Example test cases
describe('UserClusterStorageProvider', () => {
  it('should initialize with valid connection', async () => {
    const provider = new UserClusterStorageProvider(orgId, connectionId);
    await expect(provider.initialize()).resolves.not.toThrow();
  });

  it('should encrypt connection strings', () => {
    const plaintext = 'mongodb+srv://user:pass@cluster.net';
    const encrypted = encrypt(plaintext);
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });
});
```

### Integration Tests

```typescript
describe('User-Cluster Workflow', () => {
  it('should complete end-to-end workflow', async () => {
    // 1. Validate cluster
    const validation = await validateClusterForRAG(orgId, connectionId);
    expect(validation.isValid).toBe(true);

    // 2. Create storage provider
    const provider = await getStorageProvider(orgId);
    expect(provider).toBeInstanceOf(UserClusterStorageProvider);

    // 3. Upload document
    const doc = await provider.createDocument({ ... });
    expect(doc.id).toBeDefined();

    // 4. Retrieve document
    const retrieved = await provider.getDocument(doc.id);
    expect(retrieved.filename).toBe(doc.filename);
  });
});
```

## Next Steps

After completing manual testing:

1. **Document Issues:** Create GitHub issues for any bugs found
2. **Performance Metrics:** Measure upload/retrieval times
3. **User Feedback:** Collect feedback from beta testers
4. **Automated Tests:** Write integration tests for critical paths
5. **Documentation:** Update user-facing documentation with screenshots

## Success Criteria

Phase 3 is considered complete when:

- ✅ All test scenarios pass
- ✅ No critical bugs found
- ✅ Performance meets targets (< 5s validation, < 10s uploads)
- ✅ Security verified (encryption working)
- ✅ UX enhancements improve discoverability
- ✅ Documentation complete and accurate

---

**Status**: 🔄 Testing in Progress
**Last Updated**: January 29, 2026
