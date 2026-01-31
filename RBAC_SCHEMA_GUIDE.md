# NetPad RBAC Schema Guide for Engineers

**Version:** 1.0.0
**Last Updated:** January 30, 2026
**Purpose:** Comprehensive schema reference for RBAC development

---

## Table of Contents

1. [Database Architecture Overview](#database-architecture-overview)
2. [Authentication & Session Management](#authentication--session-management)
3. [Database Access Patterns](#database-access-patterns)
4. [Authorization & RBAC Enforcement](#authorization--rbac-enforcement)
5. [RBAC Core Entities](#rbac-core-entities)
6. [User & Organization Model](#user--organization-model)
7. [Permission System](#permission-system)
8. [Data Storage Locations](#data-storage-locations)
9. [Data Access Security](#data-access-security)
10. [Query Patterns & Examples](#query-patterns--examples)
11. [Key Implementation Files](#key-implementation-files)
12. [Testing Considerations](#testing-considerations)

---

## Database Architecture Overview

NetPad uses a **multi-database, multi-tenant architecture** with MongoDB Atlas:

### Two Database Types

```
┌─────────────────────────────────────────────────────────────┐
│ Platform DB (form_builder_platform)                        │
│ - Shared across all organizations                          │
│ - User accounts & authentication                           │
│ - Organizations & Projects                                 │
│ - RBAC: Groups, Roles, Assignments ← YOUR FOCUS            │
│ - Billing, Invitations, Audit Logs                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Org DB (org_{orgId}) - One per organization                │
│ - Forms & form submissions                                 │
│ - Workflows & workflow executions                          │
│ - Applications                                             │
│ - Connection vaults (encrypted MongoDB credentials)        │
│ - Org-specific audit logs                                  │
└─────────────────────────────────────────────────────────────┘
```

**Critical Rule:** RBAC entities (Groups, Roles, Assignments) are stored in the **Platform DB**, not org databases.

---

## Authentication & Session Management

### Session Technology: iron-session

NetPad uses **iron-session** for encrypted, cookie-based session management.

**Key Files:**
- [src/lib/auth/session.ts](src/lib/auth/session.ts) - Core session management
- [src/middleware.ts](src/middleware.ts) - Route protection middleware

**Session Data Structure:**
```typescript
interface SessionData {
  userId?: string;                    // Platform user ID (primary identifier)
  email?: string;                     // User's email
  deviceId?: string;                  // Device identifier for trusted devices
  isPasskeyAuth?: boolean;            // Whether auth was via passkey
  deviceTrustToken?: string;          // Token for 30-day device trust
  createdAt?: number;                 // Session creation timestamp
  waitlistStatus?: 'pending' | 'approved' | 'rejected'; // Waitlist control

  // Admin impersonation (support feature)
  impersonating?: {
    originalUserId: string;           // Admin's real userId
    originalEmail: string;            // Admin's real email
    targetUserId: string;             // User being impersonated
    targetEmail: string;              // Impersonated user's email
    startedAt: number;                // When impersonation started
  };
}
```

**Session Configuration:**
```typescript
{
  cookieName: 'mdb_tools_session',
  password: process.env.SESSION_SECRET,  // 32-char minimum
  ttl: 60 * 60 * 24 * 7,                // 7 days
  cookieOptions: {
    httpOnly: true,                     // No JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',                    // CSRF protection
    maxAge: 60 * 60 * 24 * 7            // 7 days
  }
}
```

**Session Operations:**
```typescript
// Get current session
import { getSession } from '@/lib/auth/session';
const session = await getSession();

// Check authentication
if (!session?.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Save session data
session.userId = 'user_abc123';
session.email = 'user@example.com';
await session.save();

// Destroy session (logout)
session.destroy();
await session.save();
```

---

### Authentication Methods

NetPad supports **four authentication methods**:

#### 1. Magic Links (Passwordless Email)

**Files:** [src/app/api/auth/magic-link/](src/app/api/auth/magic-link/)

**Flow:**
1. User enters email
2. System generates secure token (crypto.randomBytes)
3. Token stored in auth DB with 5-minute expiry (TTL index)
4. Email sent with magic link: `/auth/magic-link/verify?token=...`
5. User clicks link, token verified and marked as used
6. Session created with userId

**Security Features:**
- **Single-use tokens** - Marked used immediately after verification
- **5-minute expiry** - TTL index auto-deletes expired tokens
- **Rate limiting** - Max 5 magic link requests per hour per email
- **Device trust option** - 30-day trusted device cookies

**Storage:**
```typescript
// Auth DB collection: magic_links
interface MagicLinkToken {
  token: string;              // Secure random token (32 bytes hex)
  email: string;              // Target email address
  userId?: string;            // Platform userId if existing user
  used: boolean;              // Single-use enforcement
  expiresAt: Date;            // 5-minute expiry (TTL indexed)
  createdAt: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}
```

**Rate Limiting:**
```typescript
// Rate limit check before sending
const recentAttempts = await getMagicLinkAttempts(email, lastHour);
if (recentAttempts >= 5) {
  return { error: 'Too many attempts. Try again in an hour.' };
}
```

---

#### 2. Passkeys / WebAuthn

**Files:** [src/app/api/auth/passkey/](src/app/api/auth/passkey/)

**What are passkeys?**
- FIDO2/WebAuthn standard (biometric authentication)
- Device-bound credentials (Face ID, Touch ID, Windows Hello)
- Phishing-resistant (public key cryptography)

**Registration Flow:**
1. User initiates passkey registration
2. Server generates challenge (5-min expiry)
3. Browser prompts for biometric/PIN
4. Public key credential created on device
5. Public key sent to server and stored with userId

**Authentication Flow:**
1. User initiates passkey login
2. Server generates authentication challenge
3. Browser prompts for biometric/PIN
4. Device signs challenge with private key
5. Server verifies signature using stored public key
6. Session created on success

**Storage:**
```typescript
// Stored in PlatformUser.passkeys[]
interface PasskeyCredential {
  credentialId: string;        // Base64URL encoded credential ID
  publicKey: string;           // Base64URL encoded public key
  counter: number;             // Signature counter (replay protection)
  deviceType: 'platform' | 'cross-platform';
  transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  aaguid?: string;             // Authenticator GUID
  createdAt: Date;
  lastUsedAt?: Date;
  nickname?: string;           // User-assigned name: "MacBook Pro Touch ID"
}
```

**Security Features:**
- **Counter-based replay protection** - Detects cloned credentials
- **Challenge-response** - Prevents replay attacks
- **User verification** - Requires biometric/PIN
- **Resident credentials** - Stored on device (username-less login)

---

#### 3. OAuth (Google & GitHub)

**Files:** [src/app/api/auth/oauth/](src/app/api/auth/oauth/)

**Supported Providers:**
- **Google** - OAuth 2.0 with OpenID Connect
- **GitHub** - OAuth 2.0

**OAuth Flow:**
1. User clicks "Sign in with Google/GitHub"
2. Server generates state token (CSRF protection)
3. State stored in Platform DB with 10-min expiry
4. User redirected to provider authorization page
5. Provider redirects back with authorization code
6. Server exchanges code for access token
7. Fetch user profile from provider
8. Link OAuth account to platform user (create if new)
9. Session created

**Storage:**
```typescript
// Platform DB: oauth_states (TTL indexed, 10-min expiry)
interface OAuthState {
  state: string;              // Random CSRF token
  provider: 'google' | 'github';
  createdAt: Date;
  expiresAt: Date;            // 10 minutes
}

// Stored in PlatformUser.oauthConnections[]
interface OAuthConnection {
  provider: 'google' | 'github';
  providerId: string;         // Provider's user ID
  email: string;              // Email from provider
  accessToken?: string;       // Encrypted access token (optional)
  refreshToken?: string;      // Encrypted refresh token (optional)
  connectedAt: Date;
  lastUsedAt?: Date;
}
```

**Account Linking:**
- **Email matching** - If OAuth email matches existing user, link accounts
- **New user creation** - If email is new, create platform user
- **Multiple OAuth providers** - Same user can link Google AND GitHub

---

#### 4. CLI Device Flow (for CLI tool)

**Files:** [src/app/api/auth/cli/](src/app/api/auth/cli/)

**Purpose:** Authenticate the `@netpad/cli` package without exposing secrets

**Device Flow:**
1. CLI generates device code
2. User visits activation URL in browser
3. User enters device code and authenticates
4. CLI polls for authorization status
5. Once authorized, CLI receives session token

**Storage:**
```typescript
// Separate session store for CLI tokens
interface CLISession {
  deviceCode: string;         // Shown to user
  sessionToken: string;       // Returned to CLI after auth
  userId: string;             // Authenticated user
  status: 'pending' | 'authorized' | 'expired';
  expiresAt: Date;            // 15-minute expiry
  authorizedAt?: Date;
}
```

---

### Route Protection Middleware

**File:** [src/middleware.ts](src/middleware.ts)

**How it works:**
```typescript
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Check if route requires authentication
  const isProtected = PROTECTED_ROUTES.some(pattern =>
    new RegExp(pattern).test(pathname)
  );

  if (!isProtected) {
    return NextResponse.next(); // Public route, allow
  }

  // 2. Get session
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  // 3. Check authentication
  if (!session.userId) {
    // Not authenticated
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Redirect to login for page routes
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 4. Check waitlist status
  if (session.waitlistStatus === 'pending' || session.waitlistStatus === 'rejected') {
    return NextResponse.redirect(new URL('/waitlist', request.url));
  }

  // 5. Allow access
  return NextResponse.next();
}
```

**Protected Route Patterns:**
```typescript
const PROTECTED_ROUTES = [
  '/orgs',
  '/projects',
  '/settings',
  '/builder',
  '/workflows',
  '/my-forms',
  '/applications',
  '/apps',
  '/marketplace',
  '/data',
  '/admin',
  '/onboarding',
  '/api/projects',
  '/api/organizations',
  '/api/forms',
  '/api/workflows',
  '/api/applications',
  // ... more
];
```

**Public API Routes** (handle their own auth):
```typescript
const PUBLIC_API_ROUTES = [
  '/api/auth/',              // Authentication endpoints
  '/api/forms/',             // Public form submission
  '/api/onboarding/',        // Onboarding flow
  '/api/waitlist/signup',    // Waitlist signup
  '/api/workflows/process',  // Cron endpoints (CRON_SECRET)
  '/api/templates/import',   // API key auth
  '/api/v1/',                // Public API (API key auth)
];
```

---

### Special Features

#### Device Trust (30-day "Remember Me")

**Purpose:** Skip magic link for trusted devices

**How it works:**
1. User authenticates and opts into device trust
2. Server generates `deviceTrustToken` (crypto.randomBytes)
3. Token stored in session AND in `PlatformUser.trustedDevices[]`
4. On next login attempt, check if device token matches
5. If valid and not expired, skip magic link

**Storage:**
```typescript
// Stored in PlatformUser.trustedDevices[]
interface TrustedDevice {
  deviceId: string;           // Random identifier
  token: string;              // Hashed trust token
  createdAt: Date;
  expiresAt: Date;            // 30 days from creation
  lastUsedAt: Date;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;      // e.g., "Chrome on MacOS"
  };
}
```

**Security:**
- Tokens are **hashed** (SHA-256) before storage
- 30-day expiration enforced
- User can revoke trusted devices from settings

---

#### Admin Impersonation

**Purpose:** Support team can impersonate users for debugging

**How it works:**
```typescript
// Start impersonation (admin only)
await startImpersonation(targetUserId, targetEmail);

// Session now contains:
session.userId = targetUserId;           // Acts as target user
session.impersonating = {
  originalUserId: 'user_admin',
  originalEmail: 'admin@netpad.io',
  targetUserId: 'user_customer',
  targetEmail: 'customer@example.com',
  startedAt: Date.now()
};

// Check if impersonating
const isImpersonating = !!session.impersonating;

// End impersonation
await endImpersonation();
// Restores session.userId to originalUserId
```

**Audit Trail:**
- All actions logged with `impersonatedBy` field
- Platform admins can view impersonation history
- Time-limited sessions (auto-expire after 1 hour)

---

## Database Access Patterns

### Connection Architecture

**Two-Database Strategy:**
1. **Platform DB** (`form_builder_platform`) - Shared tenant data
2. **Org DBs** (`org_{orgId}`) - Isolated per organization

**File:** [src/lib/platform/db.ts](src/lib/platform/db.ts)

---

### Global Connection State

**Purpose:** Connection pooling across serverless function invocations

```typescript
// Global state (persists across requests in serverless)
declare global {
  var __mongoDbState: {
    platformClient: MongoClient | null;           // Shared platform client
    orgClients: Map<string, MongoClient>;         // Per-org clients
    platformIndexesCreated: boolean;              // Ensure indexes once
    orgIndexesCreated: Set<string>;               // Track per-org indexes
  };
}

global.__mongoDbState = global.__mongoDbState || {
  platformClient: null,
  orgClients: new Map(),
  platformIndexesCreated: false,
  orgIndexesCreated: new Set()
};
```

**Why global state?**
- **Serverless optimization** - Reuse connections across invocations
- **Connection pooling** - MongoDB driver manages pool per client
- **Performance** - Avoid connection overhead on every request

---

### Database Access Functions

#### Platform DB Access

```typescript
import { getPlatformDb } from '@/lib/platform/db';

async function getPlatformDb(): Promise<Db> {
  // Singleton pattern - reuses existing connection
  if (!global.__mongoDbState.platformClient) {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    global.__mongoDbState.platformClient = client;
  }

  const db = global.__mongoDbState.platformClient.db('form_builder_platform');

  // Ensure indexes on first access
  if (!global.__mongoDbState.platformIndexesCreated) {
    await createPlatformIndexes(db);
    global.__mongoDbState.platformIndexesCreated = true;
  }

  return db;
}
```

**Usage:**
```typescript
// ✅ Server Component
import { getPlatformDb } from '@/lib/platform/db';

export default async function ServerComponent() {
  const db = await getPlatformDb();
  const users = await db.collection('users').find().toArray();
  return <div>...</div>;
}

// ✅ API Route
import { getPlatformDb } from '@/lib/platform/db';

export async function GET(request: NextRequest) {
  const db = await getPlatformDb();
  const orgs = await db.collection('organizations').find().toArray();
  return NextResponse.json({ orgs });
}

// ❌ Client Component - NEVER
'use client';
import { getPlatformDb } from '@/lib/platform/db'; // BUILD ERROR!
```

---

#### Org DB Access

```typescript
import { getOrgDb } from '@/lib/platform/db';

async function getOrgDb(orgId: string): Promise<Db> {
  // Validate orgId format (prevent injection)
  if (!orgId || !/^org_[a-zA-Z0-9_-]+$/.test(orgId)) {
    throw new Error(`Invalid organization ID format: ${orgId}`);
  }

  // Check cache
  if (!global.__mongoDbState.orgClients.has(orgId)) {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    global.__mongoDbState.orgClients.set(orgId, client);
  }

  const client = global.__mongoDbState.orgClients.get(orgId)!;
  const db = client.db(orgId); // Database name = orgId

  // Ensure org-specific indexes
  if (!global.__mongoDbState.orgIndexesCreated.has(orgId)) {
    await createOrgIndexes(db);
    global.__mongoDbState.orgIndexesCreated.add(orgId);
  }

  return db;
}
```

**Security:**
- **Strict regex validation** - `^org_[a-zA-Z0-9_-]+$`
- **No SQL injection** - orgId is database name (MongoDB namespace)
- **Connection isolation** - Each org gets separate MongoClient

**Usage:**
```typescript
// Get org-specific database
const orgDb = await getOrgDb('org_acme');

// Access org collections
const forms = orgDb.collection('forms');
const workflows = orgDb.collection('workflows');
const submissions = orgDb.collection('form_submissions');
```

---

### Client/Server Boundary Rules

**CRITICAL:** MongoDB driver and `@/lib/platform/db` are **SERVER-ONLY**

#### Why?
- MongoDB driver uses **native Node.js modules** (C++ addons)
- Native modules cannot be bundled for browser
- Build error: "Module not found: Can't resolve 'fs'"

#### Enforcement

**✅ Safe Locations (Server-Side Only):**
```typescript
// 1. Server Components (no 'use client')
export default async function Page() {
  const db = await getPlatformDb(); // ✅ Safe
  // ...
}

// 2. API Routes
export async function GET(request: NextRequest) {
  const db = await getOrgDb(orgId); // ✅ Safe
  // ...
}

// 3. Server Actions
'use server';
export async function createForm(data: FormData) {
  const db = await getOrgDb(orgId); // ✅ Safe
  // ...
}

// 4. Middleware
export async function middleware(request: NextRequest) {
  const db = await getPlatformDb(); // ✅ Safe
  // ...
}
```

**❌ Forbidden Locations (Client-Side):**
```typescript
// Client Component
'use client';
import { getPlatformDb } from '@/lib/platform/db'; // ❌ BUILD ERROR

export default function ClientComponent() {
  // Cannot use MongoDB here!
}

// React Hook
'use client';
import { useEffect } from 'react';
import { getOrgDb } from '@/lib/platform/db'; // ❌ BUILD ERROR

export function useData() {
  useEffect(() => {
    const db = await getOrgDb('org_abc'); // ❌ Never works
  }, []);
}
```

**Solution for Client Components:**
```typescript
// Client component calls API route
'use client';
export default function ClientComponent() {
  async function fetchData() {
    const res = await fetch('/api/forms');
    const data = await res.json();
    // Use data in UI
  }
}

// API route accesses MongoDB
export async function GET(request: NextRequest) {
  const db = await getOrgDb(orgId);
  const forms = await db.collection('forms').find().toArray();
  return NextResponse.json({ forms });
}
```

---

### Connection Pooling Configuration

**MongoDB Client Options:**
```typescript
const DEFAULT_OPTIONS = {
  maxPoolSize: 10,              // Max connections in pool
  minPoolSize: 1,               // Min idle connections
  maxIdleTimeMS: 60000,         // 1 minute idle timeout
  connectTimeoutMS: 10000,      // 10 seconds to connect
  socketTimeoutMS: 45000,       // 45 seconds socket timeout
  serverSelectionTimeoutMS: 10000  // 10 seconds to select server
};
```

**Best Practices:**
- **Reuse connections** - Don't create new MongoClient per request
- **Global state** - Leverage serverless function reuse
- **Connection health** - Driver handles reconnection automatically
- **No manual ping** - Removed for performance (driver detects stale connections)

---

### Connection Vault (User Database Connections)

**Purpose:** Securely store MongoDB connection strings for user-owned databases

**File:** [src/lib/platform/connectionVault.ts](src/lib/platform/connectionVault.ts)

#### Encryption

**Algorithm:** AES-256-GCM (authenticated encryption)

```typescript
// Encryption
const key = Buffer.from(process.env.VAULT_ENCRYPTION_KEY!, 'base64'); // 32 bytes
const iv = crypto.randomBytes(16);                                     // 16 bytes
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

const encrypted = Buffer.concat([
  cipher.update(connectionString, 'utf8'),
  cipher.final()
]);

const authTag = cipher.getAuthTag();

// Format: keyId:iv:ciphertext:authTag (all base64)
const vaultValue = `v1:${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
```

**Storage:**
```typescript
// Stored in Org DB: connection_vault collection
interface ConnectionVault {
  vaultId: string;                      // "vault_abc123"
  organizationId: string;
  projectId: string;
  createdBy: string;
  name: string;
  description?: string;

  // Encrypted connection string
  encryptedConnectionString: string;    // "v1:iv:ciphertext:authTag"
  encryptionKeyId: string;              // "v1" (for key rotation)

  // Target configuration
  database: string;                     // Which database to use
  allowedCollections: string[];         // Collection whitelist (empty = all)

  // Permissions
  permissions: ConnectionPermission[];

  // Status & monitoring
  status: 'active' | 'disabled' | 'deleted';
  lastTestedAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;

  createdAt: Date;
  updatedAt: Date;
}
```

**Decryption (internal only):**
```typescript
async function getDecryptedConnectionString(
  orgId: string,
  vaultId: string
): Promise<{ connectionString: string; database: string }> {
  const orgDb = await getOrgDb(orgId);
  const vault = await orgDb.collection('connection_vault')
    .findOne({ vaultId, status: 'active' });

  if (!vault) throw new Error('Vault not found');

  // Parse: "v1:iv:ciphertext:authTag"
  const [keyId, ivB64, ciphertextB64, authTagB64] =
    vault.encryptedConnectionString.split(':');

  const key = getEncryptionKey(keyId);  // From env
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const connectionString = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString('utf8');

  // Track usage
  await orgDb.collection('connection_vault').updateOne(
    { vaultId },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() }
    }
  );

  return { connectionString, database: vault.database };
}
```

**Security Features:**
1. **Encryption at rest** - Connection strings never stored in plaintext
2. **Authenticated encryption** - GCM mode prevents tampering
3. **Key versioning** - `v1` prefix allows key rotation
4. **Usage tracking** - Monitor connection usage
5. **Collection whitelisting** - Restrict which collections can be accessed
6. **Status management** - Disable without deleting

---

### Cached Client Connections (User DBs)

**File:** [src/lib/mongodb/clientCache.ts](src/lib/mongodb/clientCache.ts)

**Purpose:** Connection pooling for user-owned MongoDB databases (via connection vault)

**Why separate from platform/org DBs?**
- User DBs use different connection strings (from vault)
- Need separate caching mechanism
- TTL-based cleanup for unused connections

**Cache Structure:**
```typescript
interface CachedClient {
  client: MongoClient;
  lastUsed: Date;
  connectionHash: string;  // SHA-256 hash of connection string
}

const clientCache = new Map<string, CachedClient>();
```

**Cache Operations:**
```typescript
// Get or create cached client
async function getCachedMongoClient(
  connectionString: string
): Promise<MongoClient> {
  const hash = hashConnectionString(connectionString);

  // Check cache
  if (clientCache.has(hash)) {
    const cached = clientCache.get(hash)!;

    // Health check before reuse
    try {
      await cached.client.db('admin').command({ ping: 1 });
      cached.lastUsed = new Date();
      return cached.client;
    } catch (error) {
      // Stale connection, remove from cache
      clientCache.delete(hash);
    }
  }

  // Create new client
  const client = new MongoClient(connectionString, {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 60000
  });

  await client.connect();

  clientCache.set(hash, {
    client,
    lastUsed: new Date(),
    connectionHash: hash
  });

  return client;
}

// Cleanup stale connections (runs every 2 minutes)
setInterval(() => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;

  for (const [hash, cached] of clientCache.entries()) {
    if (now - cached.lastUsed.getTime() > TEN_MINUTES) {
      cached.client.close();
      clientCache.delete(hash);
    }
  }
}, 2 * 60 * 1000);
```

**Security:**
- **Hash-based keys** - Never store full connection strings in cache keys
- **Health checks** - Verify connection before reuse
- **TTL cleanup** - Auto-close idle connections after 10 minutes
- **Connection string validation** - Validate before caching

---

## Authorization & RBAC Enforcement

### API Route Authorization Pattern

**Standard Flow for Protected API Routes:**

```typescript
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/platform/rbac';
import { getPlatformDb, getOrgDb } from '@/lib/platform/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string; formId: string } }
) {
  // Step 1: Authentication - Get session
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { error: 'Unauthorized - No active session' },
      { status: 401 }
    );
  }

  // Step 2: Extract resource identifiers
  const { orgId, formId } = await params;

  // Step 3: Authorization - Check permissions
  const canViewForms = await hasPermission(
    session.userId,
    orgId,
    'forms:view'
  );

  if (!canViewForms) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  // Step 4: Data access - Scoped to orgId
  const orgDb = await getOrgDb(orgId);
  const form = await orgDb.collection('forms').findOne({
    formId,
    organizationId: orgId  // CRITICAL: Always scope by orgId
  });

  if (!form) {
    return NextResponse.json(
      { error: 'Form not found' },
      { status: 404 }
    );
  }

  // Step 5: Return safe data (no sensitive fields)
  return NextResponse.json({
    form: {
      formId: form.formId,
      name: form.name,
      description: form.description,
      // Explicitly exclude sensitive data
      // DO NOT return: dataSource.vaultId credentials
    }
  });
}
```

**Key Points:**
1. **Authentication first** - Verify session exists
2. **Extract resource IDs** - Get orgId, formId, etc.
3. **Permission check** - Use `hasPermission()` from rbac.ts
4. **Scoped queries** - ALWAYS include `organizationId` in queries
5. **Safe data return** - Explicitly exclude sensitive fields

---

### Permission Checking Functions

**File:** [src/lib/platform/rbac.ts](src/lib/platform/rbac.ts)

#### Single Permission Check

```typescript
/**
 * Check if user has a specific permission in an org
 * @returns true if user has permission, false otherwise
 */
async function hasPermission(
  userId: string,
  orgId: string,
  permission: string,
  resourceId?: string  // Optional scope (projectId, formId)
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  return effective.permissions.has(permission);
}

// Usage
const canPublish = await hasPermission(userId, orgId, 'forms:publish');
if (!canPublish) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

#### Multiple Permission Check (OR)

```typescript
/**
 * Check if user has ANY of the specified permissions
 * Useful for alternative permission paths
 */
async function hasAnyPermission(
  userId: string,
  orgId: string,
  permissions: string[]
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  return permissions.some(p => effective.permissions.has(p));
}

// Usage
const canAccess = await hasAnyPermission(userId, orgId, [
  'forms:edit',
  'org:admin'
]);
```

#### Multiple Permission Check (AND)

```typescript
/**
 * Check if user has ALL specified permissions
 * Useful for operations requiring multiple permissions
 */
async function hasAllPermissions(
  userId: string,
  orgId: string,
  permissions: string[]
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, orgId);
  return permissions.every(p => effective.permissions.has(p));
}

// Usage
const canManageBilling = await hasAllPermissions(userId, orgId, [
  'billing:view',
  'billing:manage',
  'org:admin'
]);
```

#### Assert Pattern (Throws on Failure)

```typescript
/**
 * Assert user has permission, throw error if not
 * Useful for cleaner code (no if checks)
 */
async function assertPermission(
  userId: string,
  orgId: string,
  permission: string,
  resourceId?: string
): Promise<void> {
  const has = await hasPermission(userId, orgId, permission, resourceId);
  if (!has) {
    throw new PermissionError(
      `User ${userId} lacks permission: ${permission}`
    );
  }
}

// Usage
try {
  await assertPermission(userId, orgId, 'workflows:execute');
  // Continue with operation
} catch (error) {
  if (error instanceof PermissionError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  throw error;
}
```

---

### API Key Authentication (Public API)

**File:** [src/lib/api/middleware.ts](src/lib/api/middleware.ts)

**Purpose:** Authenticate programmatic access (no session cookies)

#### API Key Structure

```typescript
interface APIKey {
  id: string;                           // "key_abc123"
  keyHash: string;                      // SHA-256 hash (not plaintext!)
  organizationId: string;
  name: string;                         // User-assigned name
  permissions: APIKeyPermission[];      // Scoped permissions
  environment: 'live' | 'test';         // Separate keys per environment
  status: 'active' | 'revoked';

  // Rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  // Security
  ipAllowlist?: string[];               // CIDR blocks
  expiresAt?: Date;                     // Optional expiration

  // Tracking
  lastUsedAt?: Date;
  createdBy: string;
  createdAt: Date;
}
```

**API Key Format:**
```
Live:  np_live_abc123def456...
Test:  np_test_abc123def456...
```

#### Authentication Flow

```typescript
async function authenticateAPIRequest(
  request: NextRequest,
  requiredPermissions?: APIKeyPermission[]
): Promise<AuthResult> {
  // 1. Extract API key from header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      )
    };
  }

  const apiKeyValue = authHeader.replace('Bearer ', '');

  // 2. Validate format
  if (!apiKeyValue.startsWith('np_live_') &&
      !apiKeyValue.startsWith('np_test_')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    };
  }

  // 3. Hash and lookup
  const keyHash = hashAPIKey(apiKeyValue);
  const platformDb = await getPlatformDb();
  const apiKey = await platformDb.collection<APIKey>('api_keys')
    .findOne({ keyHash, status: 'active' });

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401 }
      )
    };
  }

  // 4. Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'API key expired' },
        { status: 401 }
      )
    };
  }

  // 5. Check IP allowlist
  if (apiKey.ipAllowlist && apiKey.ipAllowlist.length > 0) {
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip');
    if (!isIPAllowed(clientIp, apiKey.ipAllowlist)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'IP not allowed' },
          { status: 403 }
        )
      };
    }
  }

  // 6. Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPerms = requiredPermissions.every(p =>
      apiKey.permissions.includes(p)
    );
    if (!hasPerms) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Insufficient API key permissions' },
          { status: 403 }
        )
      };
    }
  }

  // 7. Rate limiting
  if (apiKey.rateLimit) {
    const rateLimitOk = await checkAPIKeyRateLimit(apiKey.id, apiKey.rateLimit);
    if (!rateLimitOk) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(apiKey.rateLimit.requestsPerHour),
              'Retry-After': '3600'
            }
          }
        )
      };
    }
  }

  // 8. Update last used
  await platformDb.collection('api_keys').updateOne(
    { id: apiKey.id },
    { $set: { lastUsedAt: new Date() } }
  );

  // 9. Success
  return {
    success: true,
    context: {
      apiKey,
      organizationId: apiKey.organizationId,
      requestId: generateRequestId()
    }
  };
}
```

**Usage in API Routes:**
```typescript
export async function POST(request: NextRequest) {
  // Authenticate with required permissions
  const authResult = await authenticateAPIRequest(request, [
    'forms:create',
    'forms:edit'
  ]);

  if (!authResult.success) {
    return authResult.response; // 401/403 error
  }

  const { organizationId, apiKey } = authResult.context;

  // Proceed with scoped access
  const orgDb = await getOrgDb(organizationId);
  // ...
}
```

**Rate Limiting Headers:**
```typescript
// Included in successful responses
{
  'X-RateLimit-Limit': '1000',        // Requests per hour
  'X-RateLimit-Remaining': '742',     // Remaining in current window
  'X-RateLimit-Reset': '1706745600'   // Unix timestamp
}
```

---

## RBAC Core Entities

### 1. OrgGroup (Groups)

**Collection:** `groups` in Platform DB
**Type Definition:** [src/types/platform.ts:94-107](src/types/platform.ts#L94-L107)

```typescript
interface OrgGroup {
  _id?: ObjectId;
  groupId: string;                    // "grp_abc123" - unique identifier
  organizationId: string;             // Which org owns this group
  name: string;                       // Display name: "Engineering", "Support"
  slug: string;                       // URL-safe: "engineering", "support"
  description?: string;               // Optional purpose description
  memberIds: string[];                // Array of userIds belonging to group
  defaultRole?: OrgRole;              // Optional default role for members
  metadata?: Record<string, unknown>; // Extensible custom data
  createdBy: string;                  // userId who created the group
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Characteristics:**
- Groups are **organization-scoped** (one group per org)
- `memberIds` is an embedded array for performance (no joins needed)
- `defaultRole` provides a simple inheritance mechanism
- `slug` must be unique within an organization

**Example Document:**
```json
{
  "_id": ObjectId("..."),
  "groupId": "grp_engineering_abc",
  "organizationId": "org_acme",
  "name": "Engineering Team",
  "slug": "engineering",
  "description": "All software engineers",
  "memberIds": ["user_alice", "user_bob", "user_charlie"],
  "defaultRole": "admin",
  "createdBy": "user_owner",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-30T14:30:00Z"
}
```

---

### 2. CustomRole (Roles)

**Collection:** `customRoles` in Platform DB
**Type Definition:** [src/types/platform.ts:113-126](src/types/platform.ts#L113-L126)

```typescript
interface CustomRole {
  _id?: ObjectId;
  roleId: string;                     // "role_abc123" - unique identifier
  organizationId: string;             // Which org owns this role
  name: string;                       // Display name: "Content Editor"
  slug: string;                       // URL-safe: "content-editor"
  description?: string;               // Role purpose explanation
  baseRole?: OrgRole;                 // Inherit from builtin: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[];              // Explicit permission strings
  isSystem?: boolean;                 // True for built-in, non-deletable roles
  createdBy: string;                  // userId who created the role
  createdAt: Date;
  updatedAt: Date;
}
```

**Built-in Roles** (defined in code, not DB):
```typescript
type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
```

| Role | Capabilities |
|------|--------------|
| `owner` | Full organization control, billing, delete org |
| `admin` | Manage members, forms, workflows, settings (no billing) |
| `member` | Create and manage own forms/workflows |
| `viewer` | Read-only access to forms and data |

**Permission Strings** (from [src/lib/platform/rbac.ts:24-88](src/lib/platform/rbac.ts#L24-L88)):
```typescript
// Format: "resource:action" or "resource:action:scope"
[
  // Organization management
  'org:view', 'org:edit', 'org:delete', 'org:manage-members',

  // Project management
  'project:create', 'project:view', 'project:edit', 'project:delete',

  // Form management
  'forms:create', 'forms:view', 'forms:edit', 'forms:delete', 'forms:publish',

  // Workflow management
  'workflows:create', 'workflows:view', 'workflows:edit', 'workflows:delete',
  'workflows:execute', 'workflows:publish',

  // Application management
  'applications:create', 'applications:view', 'applications:edit',
  'applications:delete', 'applications:publish',

  // Connection management
  'connections:create', 'connections:view', 'connections:edit',
  'connections:delete', 'connections:use',

  // RBAC management
  'rbac:view-groups', 'rbac:manage-groups', 'rbac:view-roles',
  'rbac:manage-roles', 'rbac:assign-roles',

  // Billing and settings
  'billing:view', 'billing:manage',
  'settings:view', 'settings:edit',

  // Audit logs
  'audit:view', 'audit:export'
]
```

**Example Document:**
```json
{
  "_id": ObjectId("..."),
  "roleId": "role_content_editor_xyz",
  "organizationId": "org_acme",
  "name": "Content Editor",
  "slug": "content-editor",
  "description": "Can create and edit forms but not publish them",
  "baseRole": "member",
  "permissions": [
    "forms:create",
    "forms:view",
    "forms:edit",
    "workflows:view"
  ],
  "isSystem": false,
  "createdBy": "user_admin",
  "createdAt": "2025-01-20T09:00:00Z",
  "updatedAt": "2025-01-20T09:00:00Z"
}
```

---

### 3. RoleAssignment (Assignments)

**Collection:** `roleAssignments` in Platform DB
**Type Definition:** [src/types/platform.ts:257-278](src/types/platform.ts#L257-L278)

```typescript
interface RoleAssignment {
  _id?: ObjectId;
  assignmentId: string;               // "asgn_abc123" - unique identifier
  organizationId: string;             // Which org this assignment belongs to

  // Who is assigned
  targetType: 'user' | 'group';       // Direct user assignment or group assignment
  targetId: string;                   // userId or groupId

  // What role
  roleType: 'builtin' | 'custom';     // Built-in OrgRole or CustomRole
  roleId: string;                     // OrgRole name OR customRole.roleId

  // Optional scope (org-wide by default)
  scope?: {
    type: 'org' | 'project' | 'form'; // Scope level
    resourceId?: string;              // projectId or formId for scoped permissions
  };

  // Audit trail
  grantedBy: string;                  // userId who granted this role
  grantedAt: Date;                    // When it was granted
  expiresAt?: Date;                   // Optional expiration (for temporary access)
  reason?: string;                    // Optional justification for assignment
}
```

**Assignment Types:**

| targetType | targetId | roleType | roleId | Meaning |
|------------|----------|----------|--------|---------|
| `user` | `user_alice` | `builtin` | `admin` | Alice is an admin org-wide |
| `user` | `user_bob` | `custom` | `role_editor_xyz` | Bob has custom "Editor" role |
| `group` | `grp_eng_abc` | `builtin` | `member` | All engineering group members are members |
| `user` | `user_charlie` | `builtin` | `admin` (scope: project_123) | Charlie is admin only for project 123 |

**Example Documents:**
```json
// Direct user assignment (org-wide)
{
  "assignmentId": "asgn_001",
  "organizationId": "org_acme",
  "targetType": "user",
  "targetId": "user_alice",
  "roleType": "builtin",
  "roleId": "admin",
  "grantedBy": "user_owner",
  "grantedAt": "2025-01-15T10:00:00Z"
}

// Group assignment (org-wide)
{
  "assignmentId": "asgn_002",
  "organizationId": "org_acme",
  "targetType": "group",
  "targetId": "grp_engineering_abc",
  "roleType": "custom",
  "roleId": "role_developer_xyz",
  "grantedBy": "user_admin",
  "grantedAt": "2025-01-20T11:00:00Z"
}

// Scoped assignment (project-level)
{
  "assignmentId": "asgn_003",
  "organizationId": "org_acme",
  "targetType": "user",
  "targetId": "user_bob",
  "roleType": "builtin",
  "roleId": "admin",
  "scope": {
    "type": "project",
    "resourceId": "proj_marketing_site"
  },
  "grantedBy": "user_owner",
  "grantedAt": "2025-01-25T14:00:00Z",
  "reason": "Temporary access for marketing site launch"
}
```

---

## User & Organization Model

### PlatformUser

**Collection:** `users` in Platform DB
**Type Definition:** [src/types/platform.ts:391-433](src/types/platform.ts#L391-L433)

```typescript
interface PlatformUser {
  _id?: ObjectId;
  userId: string;                    // "user_abc123" - primary identifier
  authId?: string;                   // Link to auth provider
  email: string;
  emailVerified: boolean;

  // Profile
  displayName?: string;
  avatarUrl?: string;

  // Platform-wide admin (rare, not org-scoped)
  platformRole?: PlatformRole;       // 'admin' | 'support'

  // Organization memberships (embedded array)
  organizations: OrgMembership[];

  // OAuth, Passkeys, Trusted Devices
  oauthConnections: OAuthConnection[];
  passkeys?: PasskeyCredential[];
  trustedDevices?: TrustedDevice[];

  // Waitlist status (for new signups)
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
  waitlistMetadata?: WaitlistMetadata;

  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
```

**OrgMembership (embedded in user doc):**
```typescript
interface OrgMembership {
  organizationId: string;            // "org_acme"
  role: OrgRole;                     // 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: Date;
  invitedBy?: string;                // userId who invited them
}
```

**Example User Document:**
```json
{
  "userId": "user_alice",
  "email": "alice@acme.com",
  "emailVerified": true,
  "displayName": "Alice Johnson",
  "organizations": [
    {
      "organizationId": "org_acme",
      "role": "admin",
      "joinedAt": "2025-01-10T00:00:00Z",
      "invitedBy": "user_owner"
    },
    {
      "organizationId": "org_startup",
      "role": "owner",
      "joinedAt": "2025-01-05T00:00:00Z"
    }
  ],
  "createdAt": "2025-01-05T00:00:00Z",
  "updatedAt": "2025-01-30T14:00:00Z"
}
```

**Key for RBAC:**
- `organizations[]` provides the **base role** for each org membership
- This is the **first level** of permission resolution
- Additional permissions come from groups and role assignments

---

### Organization

**Collection:** `organizations` in Platform DB
**Type Definition:** [src/types/platform.ts:33-60](src/types/platform.ts#L33-L60)

```typescript
interface Organization {
  _id?: ObjectId;
  orgId: string;                      // "org_abc123" - primary identifier
  name: string;                       // "Acme Corporation"
  slug: string;                       // "acme-corp" - URL-friendly
  plan: OrgPlan;                      // 'free' | 'pro' | 'team' | 'enterprise'
  settings: OrganizationSettings;

  // Subscription & Billing
  subscription?: Subscription;
  billingEmail?: string;
  stripeCustomerId?: string;

  // Usage tracking
  currentMonthSubmissions: number;
  usageResetDate: Date;

  createdAt: Date;
  createdBy: string;                  // userId
  updatedAt: Date;
}
```

**Relationship to RBAC:**
- All RBAC entities (groups, roles, assignments) are scoped to `organizationId`
- Each org has its own isolated RBAC configuration
- Org plan may affect RBAC features (e.g., custom roles only on Team/Enterprise plans)

---

## Permission System

### Permission Resolution Flow

When checking if a user can perform an action, NetPad resolves permissions in this order:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Base Organization Role (from user.organizations[])      │
│    - Embedded in PlatformUser document                     │
│    - Provides foundational permissions                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Group Memberships → Group Default Roles                 │
│    - Check OrgGroup.memberIds[] for userId                 │
│    - Apply OrgGroup.defaultRole if set                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Direct Role Assignments to User                         │
│    - RoleAssignment where targetType='user', targetId=userId│
│    - Both builtin and custom roles                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Group Role Assignments (Inherited)                      │
│    - RoleAssignment where targetType='group', targetId in  │
│      user's groups                                         │
│    - User inherits all group role assignments              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Merge & Deduplicate All Permissions                     │
│    - Union of all permission strings                       │
│    - Higher privilege wins (e.g., 'admin' includes 'member')│
└─────────────────────────────────────────────────────────────┘
```

### Implementation Reference

**Core RBAC Functions:** [src/lib/platform/rbac.ts](src/lib/platform/rbac.ts)

```typescript
// Get all effective permissions for a user in an org
async function getEffectivePermissions(
  userId: string,
  orgId: string
): Promise<{
  permissions: Set<string>;
  roles: Array<{ role: string; source: string }>;
}>

// Check a specific permission
async function hasPermission(
  userId: string,
  orgId: string,
  permission: string
): Promise<boolean>

// Get all groups a user belongs to
async function getUserGroups(
  userId: string,
  orgId: string
): Promise<OrgGroup[]>

// Get all role assignments for a user (direct + via groups)
async function getUserRoleAssignments(
  userId: string,
  orgId: string
): Promise<RoleAssignment[]>
```

### Permission Inheritance

**Built-in Role Hierarchy:**
```
owner (highest)
  └─ includes ALL admin permissions
     └─ includes ALL member permissions
        └─ includes ALL viewer permissions (lowest)
```

**Custom Role Inheritance:**
- Set `baseRole` to inherit from a built-in role
- Add additional `permissions[]` to extend beyond the base
- Example: `baseRole: 'member'` + `permissions: ['forms:publish']`

---

## Data Storage Locations

### Platform DB Collections (form_builder_platform)

| Collection | Entity | Purpose |
|------------|--------|---------|
| `users` | PlatformUser | User accounts, org memberships, auth |
| `organizations` | Organization | Org metadata, billing, settings |
| `projects` | Project | Projects within orgs |
| `groups` | **OrgGroup** | **Groups for RBAC** |
| `customRoles` | **CustomRole** | **Custom roles for RBAC** |
| `roleAssignments` | **RoleAssignment** | **Role assignments (user/group)** |
| `invitations` | OrgInvitation | Pending user invites |
| `platform_audit_logs` | AuditLogEntry | Platform-wide audit trail |

### Org DB Collections (org_{orgId})

| Collection | Entity | Purpose |
|------------|--------|---------|
| `applications` | Application | Apps within projects |
| `forms` | FormConfiguration | Forms within apps |
| `workflows` | WorkflowDocument | Workflows within apps |
| `connection_vault` | ConnectionVault | Encrypted MongoDB connection strings |
| `form_submissions` | PlatformFormSubmission | Form submission data |
| `org_audit_logs` | AuditLogEntry | Org-specific audit logs |

**RBAC Audit Events** (logged to `platform_audit_logs`):
```typescript
// Example audit log entries
{
  action: 'group.created',
  userId: 'user_admin',
  organizationId: 'org_acme',
  resourceType: 'group',
  resourceId: 'grp_engineering_abc',
  details: { name: 'Engineering Team' }
}

{
  action: 'role.assigned',
  userId: 'user_admin',
  organizationId: 'org_acme',
  resourceType: 'roleAssignment',
  resourceId: 'asgn_001',
  details: {
    targetUserId: 'user_alice',
    roleId: 'admin'
  }
}
```

---

## Data Access Security

### Organization Isolation Enforcement

**Key Principle:** All data queries MUST be scoped to `organizationId`

#### Database-Level Isolation

```typescript
// Each org gets its own database
const orgDb = await getOrgDb('org_acme');      // Database: org_acme
const orgDb2 = await getOrgDb('org_startup');  // Database: org_startup

// No cross-org queries possible at database level
// org_acme cannot query org_startup's data
```

**Benefits:**
- **Physical isolation** - Separate MongoDB databases
- **No cross-tenant queries** - Impossible to accidentally leak data
- **Backup granularity** - Can restore individual org databases
- **Performance isolation** - One org's load doesn't affect others

---

#### Query-Level Scoping

**Even within org databases, ALWAYS scope queries:**

```typescript
// ✅ CORRECT - Scoped to organizationId
const form = await orgDb.collection('forms').findOne({
  formId: 'form_abc123',
  organizationId: 'org_acme'  // CRITICAL: Always include
});

// ❌ INCORRECT - Missing org scope (security risk)
const form = await orgDb.collection('forms').findOne({
  formId: 'form_abc123'
  // Missing organizationId check!
});
```

**Why scope even in org databases?**
- **Defense in depth** - Extra security layer
- **Audit compliance** - Clear data lineage
- **Migration safety** - If consolidating databases later
- **Index optimization** - Compound indexes on (orgId, resourceId)

---

### Form Submission Security

**File:** [src/app/api/forms/[formId]/submit/route.ts](src/app/api/forms/[formId]/submit/route.ts)

Form submission is NetPad's most security-critical flow (public-facing, high volume).

#### Multi-Layer Security

**Layer 1: Access Control**
```typescript
interface FormAccessControl {
  type: 'public' | 'authenticated' | 'restricted';
  allowedUsers?: string[];        // User IDs for 'restricted'
  allowedDomains?: string[];      // Email domains for 'restricted'
  requireAuth?: boolean;          // Force authentication
}

async function checkFormAccess(
  accessControl: FormAccessControl,
  userId?: string,
  email?: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (accessControl.type === 'public') {
    return { allowed: true };
  }

  if (accessControl.type === 'authenticated') {
    if (!userId) {
      return { allowed: false, reason: 'Authentication required' };
    }
    return { allowed: true };
  }

  if (accessControl.type === 'restricted') {
    // Check user allowlist
    if (accessControl.allowedUsers?.includes(userId!)) {
      return { allowed: true };
    }

    // Check domain allowlist
    if (email && accessControl.allowedDomains) {
      const emailDomain = email.split('@')[1];
      if (accessControl.allowedDomains.includes(emailDomain)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Not authorized for this form' };
  }

  return { allowed: false, reason: 'Invalid access control type' };
}
```

**Layer 2: Rate Limiting**
```typescript
// Authenticated users (per user + form)
async function checkAuthSubmissionLimit(
  formId: string,
  userId: string
): Promise<{ allowed: boolean; limit?: number; window?: string }> {
  const key = `submission:${formId}:${userId}`;
  const window = 60 * 60; // 1 hour
  const limit = 100;      // 100 submissions per hour

  const count = await incrementRateLimit(key, window);

  if (count > limit) {
    return {
      allowed: false,
      limit,
      window: '1 hour'
    };
  }

  return { allowed: true };
}

// Public submissions (per IP + form)
async function checkPublicSubmissionLimit(
  formId: string,
  ipAddress: string
): Promise<{ allowed: boolean; limit?: number; window?: string }> {
  const key = `submission:public:${formId}:${ipAddress}`;
  const window = 60 * 60;  // 1 hour
  const limit = 10;        // 10 submissions per hour per IP

  const count = await incrementRateLimit(key, window);

  if (count > limit) {
    return {
      allowed: false,
      limit,
      window: '1 hour'
    };
  }

  return { allowed: true };
}
```

**Layer 3: Subscription Limits**
```typescript
async function checkSubmissionLimit(
  orgId: string
): Promise<{ allowed: boolean; quota?: number; used?: number }> {
  const platformDb = await getPlatformDb();
  const org = await platformDb.collection('organizations')
    .findOne({ orgId });

  if (!org) {
    return { allowed: false };
  }

  // Get plan limits
  const planLimits = {
    free: 1000,
    pro: 10000,
    team: 50000,
    enterprise: -1  // Unlimited
  };

  const quota = planLimits[org.plan];

  if (quota === -1) {
    return { allowed: true };  // Unlimited
  }

  // Check current month usage
  if (org.currentMonthSubmissions >= quota) {
    return {
      allowed: false,
      quota,
      used: org.currentMonthSubmissions
    };
  }

  return { allowed: true };
}
```

**Layer 4: Bot Protection**
```typescript
interface BotProtection {
  enabled: boolean;
  methods: ('honeypot' | 'timing' | 'turnstile')[];
  turnstileSecret?: string;
}

async function validateBotProtection(
  botProtection: BotProtection,
  submissionData: any,
  ipAddress: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!botProtection.enabled) {
    return { valid: true };
  }

  // Honeypot check (hidden field that bots fill)
  if (botProtection.methods.includes('honeypot')) {
    if (submissionData.__honeypot) {
      return { valid: false, reason: 'Honeypot triggered' };
    }
  }

  // Timing check (too fast = bot)
  if (botProtection.methods.includes('timing')) {
    const startTime = submissionData.__startTime;
    const submitTime = Date.now();
    const elapsed = (submitTime - startTime) / 1000; // seconds

    if (elapsed < 2) {  // Submitted in <2 seconds
      return { valid: false, reason: 'Submission too fast' };
    }
  }

  // Cloudflare Turnstile (CAPTCHA alternative)
  if (botProtection.methods.includes('turnstile')) {
    const token = submissionData.__turnstile;
    if (!token) {
      return { valid: false, reason: 'Missing Turnstile token' };
    }

    const result = await verifyTurnstile(
      token,
      botProtection.turnstileSecret!,
      ipAddress
    );

    if (!result.success) {
      return { valid: false, reason: 'Turnstile verification failed' };
    }
  }

  return { valid: true };
}
```

**Layer 5: Data Validation**
```typescript
// Validate submission data against form schema
async function validateSubmissionData(
  formConfig: FormConfiguration,
  data: Record<string, any>
): Promise<{ valid: boolean; errors?: ValidationError[] }> {
  const errors: ValidationError[] = [];

  for (const fieldConfig of formConfig.fieldConfigs) {
    const value = data[fieldConfig.name];

    // Required field check
    if (fieldConfig.required && !value) {
      errors.push({
        field: fieldConfig.name,
        message: `${fieldConfig.label} is required`
      });
    }

    // Type validation
    if (value !== undefined) {
      const typeValid = validateFieldType(fieldConfig.type, value);
      if (!typeValid) {
        errors.push({
          field: fieldConfig.name,
          message: `Invalid type for ${fieldConfig.label}`
        });
      }
    }

    // Custom validation rules
    if (fieldConfig.validation) {
      const ruleValid = await validateRules(fieldConfig.validation, value);
      if (!ruleValid.valid) {
        errors.push({
          field: fieldConfig.name,
          message: ruleValid.message!
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
```

**Complete Submission Flow:**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  const { formId } = await params;
  const session = await getSession();
  const data = await request.json();

  // Get form configuration
  const form = await getFormById(formId);
  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // 1. Access control
  const accessResult = await checkFormAccess(
    form.accessControl,
    session?.userId,
    session?.email
  );
  if (!accessResult.allowed) {
    return NextResponse.json(
      { error: accessResult.reason },
      { status: 403 }
    );
  }

  // 2. Rate limiting
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = session?.userId
    ? await checkAuthSubmissionLimit(formId, session.userId)
    : await checkPublicSubmissionLimit(formId, ipAddress);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // 3. Subscription limit
  if (form.organizationId) {
    const subscriptionResult = await checkSubmissionLimit(form.organizationId);
    if (!subscriptionResult.allowed) {
      return NextResponse.json(
        { error: 'Submission quota exceeded' },
        { status: 429 }
      );
    }
  }

  // 4. Bot protection
  if (form.botProtection?.enabled) {
    const botResult = await validateBotProtection(
      form.botProtection,
      data,
      ipAddress
    );
    if (!botResult.valid) {
      return NextResponse.json(
        { error: 'Bot protection failed' },
        { status: 400 }
      );
    }
  }

  // 5. Data validation
  const validationResult = await validateSubmissionData(form, data);
  if (!validationResult.valid) {
    return NextResponse.json(
      { error: 'Validation failed', errors: validationResult.errors },
      { status: 400 }
    );
  }

  // 6. Clean data (remove bot protection fields)
  const cleanData = { ...data };
  delete cleanData.__honeypot;
  delete cleanData.__startTime;
  delete cleanData.__turnstile;

  // 7. Submit to target database (via vault if specified)
  const submission = await createSubmission({
    formId,
    organizationId: form.organizationId,
    data: cleanData,
    dataSource: form.dataSource,  // { vaultId, collection }
    respondent: session?.userId ? {
      userId: session.userId,
      email: session.email,
      authMethod: session.isPasskeyAuth ? 'passkey' : 'magic-link'
    } : undefined,
    metadata: {
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
      deviceType: detectDeviceType(request.headers.get('user-agent'))
    }
  });

  return NextResponse.json({ success: true, submissionId: submission.id });
}
```

---

### Connection Vault Access Control

**File:** [src/lib/platform/connectionVault.ts](src/lib/platform/connectionVault.ts)

Connection vaults store encrypted MongoDB connection strings. Access control prevents unauthorized vault usage.

#### Vault Roles

```typescript
type ConnectionRole = 'owner' | 'admin' | 'user';

const CONNECTION_ROLE_CAPABILITIES = {
  owner: ['use', 'read', 'update', 'delete', 'manage_permissions'],
  admin: ['use', 'read', 'update'],
  user: ['use', 'read']
};
```

#### Permission Structure

```typescript
interface ConnectionPermission {
  userId: string;
  role: ConnectionRole;
  grantedBy: string;
  grantedAt: Date;
}

// Example vault with permissions
{
  vaultId: 'vault_abc123',
  organizationId: 'org_acme',
  projectId: 'proj_website',
  permissions: [
    {
      userId: 'user_alice',
      role: 'owner',
      grantedBy: 'user_owner',
      grantedAt: '2025-01-15T00:00:00Z'
    },
    {
      userId: 'user_bob',
      role: 'user',
      grantedBy: 'user_alice',
      grantedAt: '2025-01-20T00:00:00Z'
    }
  ]
}
```

#### Permission Checking

```typescript
async function checkVaultPermission(
  organizationId: string,
  vaultId: string,
  userId: string,
  requiredCapability: string
): Promise<boolean> {
  // 1. Check if platform admin
  const platformDb = await getPlatformDb();
  const user = await platformDb.collection('users')
    .findOne({ userId });

  if (user?.platformRole === 'admin') {
    return true;  // Platform admins have full access
  }

  // 2. Check org role
  const orgMembership = user?.organizations.find(
    o => o.organizationId === organizationId
  );

  if (!orgMembership) {
    return false;  // Not a member of this org
  }

  // Owner/admin have full vault access
  if (orgMembership.role === 'owner' || orgMembership.role === 'admin') {
    return true;
  }

  // 3. Check vault-specific permissions
  const orgDb = await getOrgDb(organizationId);
  const vault = await orgDb.collection('connection_vault')
    .findOne({ vaultId });

  if (!vault) {
    return false;
  }

  const userPermission = vault.permissions.find(
    p => p.userId === userId
  );

  if (!userPermission) {
    // No explicit permission, check if org member can 'use' by default
    return requiredCapability === 'use' && orgMembership.role === 'member';
  }

  // Check if user's role has the required capability
  const capabilities = CONNECTION_ROLE_CAPABILITIES[userPermission.role];
  return capabilities.includes(requiredCapability);
}

// Usage in API routes
const canUseVault = await checkVaultPermission(
  orgId,
  vaultId,
  userId,
  'use'
);

if (!canUseVault) {
  return NextResponse.json(
    { error: 'Insufficient vault permissions' },
    { status: 403 }
  );
}
```

---

### Collection Whitelisting

**Purpose:** Restrict which MongoDB collections can be accessed via a vault

```typescript
async function isCollectionAllowed(
  organizationId: string,
  vaultId: string | undefined,
  collection: string
): Promise<boolean> {
  // If no vaultId, using org's default database (allow all)
  if (!vaultId) {
    return true;
  }

  const orgDb = await getOrgDb(organizationId);
  const vault = await orgDb.collection('connection_vault')
    .findOne({ vaultId });

  if (!vault) {
    return false;
  }

  // Empty allowedCollections = allow all
  if (!vault.allowedCollections || vault.allowedCollections.length === 0) {
    return true;
  }

  // Check whitelist
  return vault.allowedCollections.includes(collection);
}

// Usage before executing queries
const allowed = await isCollectionAllowed(orgId, vaultId, 'customers');
if (!allowed) {
  throw new Error(`Access to collection 'customers' not allowed`);
}
```

---

### Audit Logging

NetPad maintains two audit log levels:

#### Platform Audit Logs

**Collection:** `platform_audit_logs` in Platform DB

**Purpose:** Platform-wide events (user login, org creation, etc.)

```typescript
interface PlatformAuditEntry {
  eventId: string;
  eventType: string;              // 'user.login', 'org.created', etc.
  userId: string;                 // Who performed the action
  resourceType?: string;          // 'user', 'organization', etc.
  resourceId?: string;            // ID of affected resource
  action: string;                 // 'create', 'update', 'delete', etc.
  details?: Record<string, any>;  // Event-specific data
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;

  // Impersonation tracking
  impersonatedBy?: string;        // If action was via impersonation
}

// Example: User login
{
  eventId: 'evt_login_abc',
  eventType: 'user.login',
  userId: 'user_alice',
  resourceType: 'user',
  resourceId: 'user_alice',
  action: 'login',
  details: {
    authMethod: 'passkey',
    deviceId: 'device_xyz'
  },
  ipAddress: '203.0.113.45',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2025-01-30T10:00:00Z'
}
```

#### Organization Audit Logs

**Collection:** `org_audit_logs` in Org DB

**Purpose:** Org-specific events (form created, submission received, etc.)

```typescript
interface OrgAuditEntry {
  eventId: string;
  eventType: string;              // 'form.created', 'workflow.executed', etc.
  userId: string;                 // Who performed the action
  organizationId: string;
  resourceType: string;           // 'form', 'workflow', 'submission', etc.
  resourceId: string;
  action: string;
  details?: Record<string, any>;
  timestamp: Date;

  // Context
  projectId?: string;
  applicationId?: string;
}

// Example: Form created
{
  eventId: 'evt_form_create_xyz',
  eventType: 'form.created',
  userId: 'user_bob',
  organizationId: 'org_acme',
  resourceType: 'form',
  resourceId: 'form_contact_abc',
  action: 'create',
  details: {
    formName: 'Contact Form',
    formType: 'data-entry'
  },
  projectId: 'proj_website',
  applicationId: 'app_public',
  timestamp: '2025-01-30T11:00:00Z'
}
```

#### Logging Functions

```typescript
// Platform audit log
async function logPlatformEvent(entry: Omit<PlatformAuditEntry, 'eventId' | 'timestamp'>) {
  const platformDb = await getPlatformDb();
  await platformDb.collection('platform_audit_logs').insertOne({
    eventId: `evt_${generateId()}`,
    ...entry,
    timestamp: new Date()
  });
}

// Org audit log
async function logOrgEvent(
  orgId: string,
  entry: Omit<OrgAuditEntry, 'eventId' | 'timestamp' | 'organizationId'>
) {
  const orgDb = await getOrgDb(orgId);
  await orgDb.collection('org_audit_logs').insertOne({
    eventId: `evt_${generateId()}`,
    organizationId: orgId,
    ...entry,
    timestamp: new Date()
  });
}

// Usage
await logPlatformEvent({
  eventType: 'user.login',
  userId: 'user_alice',
  resourceType: 'user',
  resourceId: 'user_alice',
  action: 'login',
  details: { authMethod: 'passkey' },
  ipAddress: request.ip
});

await logOrgEvent('org_acme', {
  eventType: 'form.created',
  userId: 'user_bob',
  resourceType: 'form',
  resourceId: 'form_abc',
  action: 'create',
  details: { formName: 'New Form' }
});
```

**RBAC-Specific Audit Events:**
```typescript
// Group created
await logPlatformEvent({
  eventType: 'rbac.group.created',
  userId: session.userId,
  resourceType: 'group',
  resourceId: group.groupId,
  action: 'create',
  details: {
    organizationId: group.organizationId,
    groupName: group.name,
    defaultRole: group.defaultRole
  }
});

// Role assigned
await logPlatformEvent({
  eventType: 'rbac.role.assigned',
  userId: session.userId,
  resourceType: 'roleAssignment',
  resourceId: assignment.assignmentId,
  action: 'assign',
  details: {
    organizationId: assignment.organizationId,
    targetType: assignment.targetType,
    targetId: assignment.targetId,
    roleId: assignment.roleId
  }
});

// Member added to group
await logPlatformEvent({
  eventType: 'rbac.group.member.added',
  userId: session.userId,
  resourceType: 'group',
  resourceId: groupId,
  action: 'add_member',
  details: {
    organizationId: group.organizationId,
    addedUserId: targetUserId
  }
});
```

---

### Safe Data Return Practices

**Always redact sensitive fields before returning data:**

```typescript
// ❌ BAD - Exposes sensitive data
export async function GET(request: NextRequest) {
  const vault = await getVault(vaultId);
  return NextResponse.json({ vault });  // Includes encryptedConnectionString!
}

// ✅ GOOD - Explicitly safe fields
export async function GET(request: NextRequest) {
  const vault = await getVault(vaultId);

  return NextResponse.json({
    vault: {
      vaultId: vault.vaultId,
      name: vault.name,
      description: vault.description,
      database: vault.database,
      allowedCollections: vault.allowedCollections,
      status: vault.status,
      createdAt: vault.createdAt,
      // EXCLUDED: encryptedConnectionString, encryptionKeyId
    }
  });
}

// ✅ GOOD - Redaction marker
export async function GET(request: NextRequest) {
  const vault = await getVault(vaultId);

  return NextResponse.json({
    vault: {
      ...vault,
      encryptedConnectionString: '[REDACTED]',
      encryptionKeyId: '[REDACTED]'
    }
  });
}
```

**API Key Responses:**
```typescript
// When creating API key, show full key ONCE
export async function POST(request: NextRequest) {
  const { plaintextKey, apiKey } = await createAPIKey(orgId, data);

  // Store hash, return plaintext ONCE
  return NextResponse.json({
    key: plaintextKey,  // Full key: "np_live_abc123..."
    message: 'Save this key - it will not be shown again',
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt
    }
  });
}

// When listing API keys, NEVER return full key
export async function GET(request: NextRequest) {
  const keys = await getAPIKeys(orgId);

  return NextResponse.json({
    keys: keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPreview: k.id.slice(0, 12) + '...',  // "key_abc123..."
      permissions: k.permissions,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt
      // EXCLUDED: keyHash, full key
    }))
  });
}
```

---

## Query Patterns & Examples

### 1. Get All Groups for an Organization

```typescript
import { getPlatformDb } from '@/lib/platform/db';

async function getOrgGroups(orgId: string): Promise<OrgGroup[]> {
  const db = await getPlatformDb();
  const groups = await db.collection<OrgGroup>('groups')
    .find({ organizationId: orgId })
    .sort({ name: 1 })
    .toArray();

  return groups;
}
```

### 2. Get All Members of a Group

```typescript
async function getGroupMembers(groupId: string): Promise<PlatformUser[]> {
  const db = await getPlatformDb();

  // First get the group
  const group = await db.collection<OrgGroup>('groups')
    .findOne({ groupId });

  if (!group) return [];

  // Then get all users in memberIds
  const users = await db.collection<PlatformUser>('users')
    .find({ userId: { $in: group.memberIds } })
    .toArray();

  return users;
}
```

### 3. Add User to Group

```typescript
async function addUserToGroup(groupId: string, userId: string): Promise<void> {
  const db = await getPlatformDb();

  await db.collection<OrgGroup>('groups').updateOne(
    { groupId },
    {
      $addToSet: { memberIds: userId },
      $set: { updatedAt: new Date() }
    }
  );
}
```

### 4. Create a Role Assignment

```typescript
async function assignRoleToUser(
  userId: string,
  orgId: string,
  roleId: string,
  roleType: 'builtin' | 'custom',
  grantedBy: string,
  scope?: { type: 'org' | 'project' | 'form'; resourceId?: string }
): Promise<RoleAssignment> {
  const db = await getPlatformDb();

  const assignment: RoleAssignment = {
    assignmentId: `asgn_${generateId()}`,
    organizationId: orgId,
    targetType: 'user',
    targetId: userId,
    roleType,
    roleId,
    scope,
    grantedBy,
    grantedAt: new Date()
  };

  await db.collection<RoleAssignment>('roleAssignments')
    .insertOne(assignment);

  return assignment;
}
```

### 5. Get All Role Assignments for a User

```typescript
async function getUserRoleAssignments(
  userId: string,
  orgId: string
): Promise<RoleAssignment[]> {
  const db = await getPlatformDb();

  // Get user's groups
  const groups = await db.collection<OrgGroup>('groups')
    .find({ organizationId: orgId, memberIds: userId })
    .toArray();

  const groupIds = groups.map(g => g.groupId);

  // Get assignments for user OR user's groups
  const assignments = await db.collection<RoleAssignment>('roleAssignments')
    .find({
      organizationId: orgId,
      $or: [
        { targetType: 'user', targetId: userId },
        { targetType: 'group', targetId: { $in: groupIds } }
      ]
    })
    .toArray();

  return assignments;
}
```

### 6. Check if User Has Specific Permission

```typescript
import { hasPermission } from '@/lib/platform/rbac';

async function canUserPublishForms(userId: string, orgId: string): Promise<boolean> {
  return await hasPermission(userId, orgId, 'forms:publish');
}
```

### 7. Get Effective Permissions for User

```typescript
import { getEffectivePermissions } from '@/lib/platform/rbac';

async function getUserPermissions(userId: string, orgId: string) {
  const result = await getEffectivePermissions(userId, orgId);

  console.log('Permissions:', Array.from(result.permissions));
  console.log('Roles:', result.roles);
  // Permissions: ['forms:create', 'forms:view', 'forms:edit', ...]
  // Roles: [{ role: 'admin', source: 'org-membership' }, ...]

  return result;
}
```

### 8. Revoke All Assignments for a User in an Org

```typescript
async function revokeAllUserAssignments(
  userId: string,
  orgId: string
): Promise<void> {
  const db = await getPlatformDb();

  await db.collection<RoleAssignment>('roleAssignments').deleteMany({
    organizationId: orgId,
    targetType: 'user',
    targetId: userId
  });
}
```

---

## Key Implementation Files

### RBAC Core Logic
- [src/lib/platform/rbac.ts](src/lib/platform/rbac.ts) - Permission resolution, role checking
- [src/types/platform.ts:94-278](src/types/platform.ts#L94-L278) - TypeScript type definitions

### API Routes
- [src/app/api/rbac/groups/route.ts](src/app/api/rbac/groups/route.ts) - List groups, create group
- [src/app/api/rbac/groups/[groupId]/route.ts](src/app/api/rbac/groups/[groupId]/route.ts) - Get, update, delete group
- [src/app/api/rbac/groups/[groupId]/members/route.ts](src/app/api/rbac/groups/[groupId]/members/route.ts) - Add/remove members
- [src/app/api/rbac/roles/route.ts](src/app/api/rbac/roles/route.ts) - List roles, create custom role
- [src/app/api/rbac/roles/[roleId]/route.ts](src/app/api/rbac/roles/[roleId]/route.ts) - Get, update, delete role
- [src/app/api/rbac/assignments/route.ts](src/app/api/rbac/assignments/route.ts) - List assignments, create assignment
- [src/app/api/rbac/assignments/[assignmentId]/route.ts](src/app/api/rbac/assignments/[assignmentId]/route.ts) - Delete assignment

### UI Components (Admin Pages)
- [src/app/(authenticated)/admin/groups/page.tsx](src/app/(authenticated)/admin/groups/page.tsx) - Groups management UI
- [src/app/(authenticated)/admin/roles/page.tsx](src/app/(authenticated)/admin/roles/page.tsx) - Roles management UI

### Database Access
- [src/lib/platform/db.ts](src/lib/platform/db.ts) - Database connection utilities
  - `getPlatformDb()` - Get platform database instance
  - `getOrgDb(orgId)` - Get org-specific database instance

### CLI Commands (for testing/admin)
- [packages/cli/src/commands/rbac/](packages/cli/src/commands/rbac/) - CLI commands for RBAC
  - `groups:list`, `groups:create`, `groups:add-member`
  - `roles:list`, `roles:create`, `roles:assign`

---

## Testing Considerations

### Unit Testing

**Test permission resolution logic:**
```typescript
describe('RBAC Permission Resolution', () => {
  it('should inherit permissions from base org role', async () => {
    // User has 'member' role in org
    const perms = await getEffectivePermissions(userId, orgId);
    expect(perms.permissions).toContain('forms:create');
  });

  it('should inherit group default role', async () => {
    // User in group with defaultRole='admin'
    const perms = await getEffectivePermissions(userId, orgId);
    expect(perms.permissions).toContain('org:manage-members');
  });

  it('should merge permissions from multiple sources', async () => {
    // User has base role + group role + direct assignment
    const perms = await getEffectivePermissions(userId, orgId);
    expect(perms.roles).toHaveLength(3);
  });
});
```

### Integration Testing

**Test group membership:**
```typescript
describe('Group Membership', () => {
  it('should add user to group and reflect in permissions', async () => {
    await addUserToGroup(groupId, userId);
    const groups = await getUserGroups(userId, orgId);
    expect(groups).toContainEqual(expect.objectContaining({ groupId }));
  });

  it('should remove user from group', async () => {
    await removeUserFromGroup(groupId, userId);
    const groups = await getUserGroups(userId, orgId);
    expect(groups).not.toContainEqual(expect.objectContaining({ groupId }));
  });
});
```

### API Testing

**Test RBAC endpoints:**
```typescript
describe('RBAC API', () => {
  it('POST /api/rbac/groups - creates a group', async () => {
    const res = await fetch('/api/rbac/groups', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Group',
        description: 'Test description'
      })
    });
    expect(res.status).toBe(201);
  });

  it('POST /api/rbac/assignments - assigns role to user', async () => {
    const res = await fetch('/api/rbac/assignments', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'user',
        targetId: userId,
        roleType: 'builtin',
        roleId: 'admin'
      })
    });
    expect(res.status).toBe(201);
  });
});
```

### Manual Testing Scenarios

**Scenario 1: Group-based permissions**
1. Create a group "Engineering"
2. Add users Alice and Bob to the group
3. Assign "admin" role to the group
4. Verify Alice and Bob both have admin permissions

**Scenario 2: Scoped permissions**
1. Create a project "Marketing Site"
2. Assign Charlie "admin" role scoped to that project
3. Verify Charlie can manage the project but not others
4. Verify Charlie cannot manage org-wide settings

**Scenario 3: Custom role inheritance**
1. Create custom role "Content Editor" based on "member"
2. Add permission "forms:publish"
3. Assign role to user David
4. Verify David can create, edit, AND publish forms

**Scenario 4: Permission revocation**
1. Assign "admin" role to user Eve
2. Verify Eve has admin permissions
3. Revoke the assignment
4. Verify Eve no longer has admin permissions

---

## Database Indexes

Ensure these indexes exist for performance:

```typescript
// Platform DB - groups collection
db.groups.createIndex({ organizationId: 1, slug: 1 }, { unique: true });
db.groups.createIndex({ memberIds: 1 }); // For user lookup

// Platform DB - customRoles collection
db.customRoles.createIndex({ organizationId: 1, slug: 1 }, { unique: true });

// Platform DB - roleAssignments collection
db.roleAssignments.createIndex({ organizationId: 1, targetType: 1, targetId: 1 });
db.roleAssignments.createIndex({ organizationId: 1, roleId: 1 });
db.roleAssignments.createIndex({ 'scope.type': 1, 'scope.resourceId': 1 }); // For scoped queries

// Platform DB - users collection
db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'organizations.organizationId': 1 }); // For org member lookup
```

---

## Common Pitfalls & Best Practices

### ❌ Common Pitfalls

1. **Querying org DB for RBAC data**
   - RBAC collections are in Platform DB, not org DB
   - Always use `getPlatformDb()`, never `getOrgDb(orgId)`

2. **Not checking scoped permissions**
   - Always check if `RoleAssignment.scope` exists
   - Scoped assignments only apply to the specified resource

3. **Forgetting to update `updatedAt` timestamps**
   - Always set `updatedAt: new Date()` on updates
   - Helps with debugging and audit trails

4. **Not using transactions for multi-document updates**
   - Example: Adding user to group + creating assignment
   - Use MongoDB transactions to ensure atomicity

5. **Hardcoding permissions in UI**
   - Always check `hasPermission()` server-side
   - UI permission checks are for UX, not security

### ✅ Best Practices

1. **Use centralized permission checking**
   ```typescript
   // ✅ Good
   const allowed = await hasPermission(userId, orgId, 'forms:create');

   // ❌ Bad - don't reimplement permission logic
   const userDoc = await db.collection('users').findOne({ userId });
   const role = userDoc.organizations.find(o => o.organizationId === orgId)?.role;
   ```

2. **Audit all RBAC changes**
   ```typescript
   // Always log to audit trail
   await createAuditLog({
     action: 'group.member.added',
     userId: currentUserId,
     organizationId: orgId,
     resourceType: 'group',
     resourceId: groupId,
     details: { addedUserId: targetUserId }
   });
   ```

3. **Validate role/group existence before assignment**
   ```typescript
   // Check group exists before adding member
   const group = await db.collection('groups').findOne({ groupId });
   if (!group) {
     throw new Error('Group not found');
   }
   ```

4. **Use descriptive permission strings**
   ```typescript
   // ✅ Good - clear what resource and action
   'forms:publish'
   'workflows:execute'
   'rbac:manage-groups'

   // ❌ Bad - ambiguous
   'publish'
   'execute'
   'manage'
   ```

5. **Cache permission checks when safe**
   ```typescript
   // For the duration of a single request, cache is safe
   const requestPermissionCache = new Map();

   async function hasPermissionCached(userId, orgId, permission) {
     const key = `${userId}:${orgId}:${permission}`;
     if (!requestPermissionCache.has(key)) {
       const result = await hasPermission(userId, orgId, permission);
       requestPermissionCache.set(key, result);
     }
     return requestPermissionCache.get(key);
   }
   ```

---

## Quick Reference Commands (CLI)

```bash
# List all groups in an org
npx @netpad/cli rbac:groups:list --org org_abc123

# Create a group
npx @netpad/cli rbac:groups:create \
  --org org_abc123 \
  --name "Engineering" \
  --description "All engineers"

# Add user to group
npx @netpad/cli rbac:groups:add-member \
  --group grp_abc123 \
  --user user_alice

# List all roles in an org
npx @netpad/cli rbac:roles:list --org org_abc123

# Create a custom role
npx @netpad/cli rbac:roles:create \
  --org org_abc123 \
  --name "Content Editor" \
  --base-role member \
  --permissions "forms:publish,workflows:view"

# Assign role to user
npx @netpad/cli rbac:roles:assign \
  --org org_abc123 \
  --user user_bob \
  --role role_editor_xyz

# View user's effective permissions
npx @netpad/cli rbac:permissions \
  --org org_abc123 \
  --user user_alice
```

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Platform DB                                     │
│                     (form_builder_platform)                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  PlatformUser    │         │  Organization    │
│  ───────────     │         │  ────────────    │
│  userId (PK)     │         │  orgId (PK)      │
│  email           │    ┌────│  name            │
│  organizations[] │────┘    │  plan            │
│    └─ orgId (FK) │         │  settings        │
│    └─ role       │         └──────────────────┘
└──────────────────┘                │
         │                          │
         │                          ├─────────────┐
         │                          │             │
         ├──────────────────────────┼─────────────┼───────────┐
         │                          │             │           │
         ↓                          ↓             ↓           ↓
┌──────────────────┐       ┌──────────────┐  ┌──────────┐  ┌────────────────┐
│  OrgGroup        │       │ CustomRole   │  │ Project  │  │RoleAssignment  │
│  ────────────    │       │ ────────     │  │ ───────  │  │───────────────│
│  groupId (PK)    │   ┌───│ roleId (PK)  │  │projectId │  │assignmentId(PK)│
│  orgId (FK)      │───┘   │ orgId (FK)   │  │orgId (FK)│  │orgId (FK)      │
│  name            │       │ name         │  │name      │  │targetType      │
│  memberIds[]     │──┐    │ baseRole     │  └──────────┘  │targetId (FK)   │
│  defaultRole     │  │    │ permissions[]│                │  └─→ userId OR │
└──────────────────┘  │    └──────────────┘                │      groupId   │
                      │            ↑                        │roleType        │
                      └────────────┼────────────────────────│roleId (FK)     │
                                   │                        │  └─→ OrgRole OR│
                                   └────────────────────────│      role.roleId│
                                                            │scope?          │
                                                            │  └─ type       │
                                                            │  └─ resourceId │
                                                            └────────────────┘

Permission Resolution Flow:
1. user.organizations[].role (base)
2. OrgGroup.defaultRole (if user in group.memberIds)
3. RoleAssignment (targetType='user', targetId=userId)
4. RoleAssignment (targetType='group', targetId in user's groups)
→ Merge all → Effective Permissions Set
```

---

## Additional Resources

- **RBAC Type Definitions:** [src/types/platform.ts:94-278](src/types/platform.ts#L94-L278)
- **Permission Logic:** [src/lib/platform/rbac.ts](src/lib/platform/rbac.ts)
- **Recent RBAC Commits:**
  - `1255223` - feat(admin): Add full CRUD to Groups and Roles pages
  - `1987804` - feat(admin): Add Groups and Roles management pages
  - `65bf09f` - feat: Add RBAC commands to @netpad/cli for terminal parity

- **Database Connection Patterns:** [src/lib/platform/db.ts](src/lib/platform/db.ts)
- **Audit Logging:** [src/lib/platform/audit.ts](src/lib/platform/audit.ts)

---

**Questions or unclear on anything?** Feel free to ask! The RBAC system is designed to be flexible and extensible, so if you need to add new features (like project-scoped groups, time-based assignments, or approval workflows), the architecture supports it.

Good luck with the RBAC development! 🚀
