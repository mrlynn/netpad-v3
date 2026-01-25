# Claude ↔ NetPad Cloud Integration Spec

**Version:** 1.0.0
**Author:** Engineering Team
**Status:** Draft
**Created:** January 25, 2025
**Target Release:** Q1 2025

---

## Executive Summary

This spec outlines a phased approach to enable Claude (via the `@netpad/mcp-server`) to directly create and manage forms, workflows, and applications in NetPad Cloud. The goal is to reduce friction from "Claude generates code → developer runs code" to "Claude creates form → developer sees it in NetPad."

### Success Metrics
- Time from prompt to working form: < 30 seconds (down from ~5 minutes)
- Zero manual code execution required for basic form creation
- 90%+ of MCP-generated forms successfully import on first attempt

---

## Phase 1: Deep Link Import (Week 1-2)

### Overview
Add an import endpoint that accepts form configurations via URL, allowing Claude to generate clickable links that instantly create forms in NetPad.

### New API Endpoint

#### `GET /api/forms/import`

**Purpose:** Accept a base64-encoded form configuration and redirect to the form builder with the config pre-loaded.

**Request:**
```
GET /api/forms/import?config=<base64>&projectId=<optional>&redirect=<optional>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | string | Yes | Base64-encoded JSON form configuration |
| `projectId` | string | No | Target project ID (prompts user if omitted) |
| `redirect` | string | No | Where to go after import: `builder` (default), `preview`, `publish` |
| `source` | string | No | Attribution: `claude-mcp`, `cli`, `api` |

**Response:**
- **Success:** 302 redirect to `/[orgSlug]/[projectSlug]/forms/new?imported=<tempId>`
- **Invalid config:** 400 with error details
- **Config too large:** 413 (max 100KB encoded)

**Example:**
```
https://netpad.io/api/forms/import?config=eyJuYW1lIjoiQ29udGFjdCBGb3JtIi...&source=claude-mcp
```

#### `POST /api/forms/import`

**Purpose:** Same as GET but for larger configs that exceed URL length limits.

**Request:**
```json
POST /api/forms/import
Content-Type: application/json

{
  "config": { /* FormConfiguration object */ },
  "projectId": "proj_xxx",
  "redirect": "builder",
  "source": "claude-mcp"
}
```

**Response:**
```json
{
  "importId": "imp_abc123",
  "importUrl": "https://netpad.io/import/imp_abc123",
  "expiresAt": "2025-01-25T12:00:00Z"
}
```

### Database Schema

#### `form_imports` Collection

```typescript
interface FormImport {
  _id: ObjectId;
  importId: string;           // Public ID: "imp_xxx"
  config: FormConfiguration;  // The form config to import
  projectId?: string;         // Target project (optional)
  source: string;             // "claude-mcp" | "cli" | "api" | "share"

  // Tracking
  createdAt: Date;
  expiresAt: Date;            // Auto-delete after 24 hours
  claimedAt?: Date;           // When user opened the link
  claimedBy?: string;         // User ID who claimed it
  resultFormId?: string;      // Form ID if successfully created

  // Analytics
  metadata?: {
    claudeSessionId?: string;
    mcpVersion?: string;
    userAgent?: string;
  };
}
```

**Indexes:**
```javascript
{ importId: 1 }              // Unique
{ expiresAt: 1 }             // TTL index, auto-delete expired
{ source: 1, createdAt: -1 } // Analytics queries
```

### Frontend Changes

#### New Route: `/import/[importId]`

**Behavior:**
1. Fetch import config from API
2. If user not logged in → redirect to login with return URL
3. If no `projectId` specified → show project picker modal
4. Validate config against current schema version
5. Redirect to form builder with config pre-loaded
6. Mark import as claimed

**UI Flow:**
```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │         Import Form from Claude                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Form Name: Property Rental Listing                     │
│  Fields: 41 fields across 7 pages                       │
│  Source: Claude MCP Server                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Select a project:                               │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ ○ My First Project                        │  │   │
│  │  │ ○ Vacation Rentals                        │  │   │
│  │  │ ○ + Create New Project                    │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancel]                        [Import to Project →] │
└─────────────────────────────────────────────────────────┘
```

#### Form Builder Changes

Add support for `?imported=<tempId>` query parameter:
- Load config from sessionStorage (set by import page)
- Show "Imported from Claude" banner with dismiss
- Pre-populate all fields, theme, multi-page config
- User can edit before saving

### MCP Server Changes

#### Update `generate_form` Tool

Current output:
```typescript
// Returns TypeScript code to run with npx tsx
```

New output:
```typescript
{
  code: "/* TypeScript code */",
  importUrl: "https://netpad.io/api/forms/import?config=eyJ...",
  importUrlShort: "https://netpad.io/import/imp_abc123"  // If POST was used
}
```

#### New Tool: `create_import_link`

```typescript
mcp__netpad__create_import_link({
  config: FormConfiguration,
  projectId?: string,
  expiresIn?: number  // seconds, default 86400 (24h)
})

// Returns:
{
  importUrl: "https://netpad.io/import/imp_abc123",
  expiresAt: "2025-01-26T10:30:00Z",
  qrCode?: string  // Base64 PNG for mobile scanning
}
```

### Security Considerations

1. **Rate Limiting:** Max 100 imports per IP per hour
2. **Size Limits:** 100KB max config size, 200 fields max
3. **Expiration:** Imports expire after 24 hours
4. **No Auth Required to Create:** Anyone can create import links
5. **Auth Required to Claim:** Must be logged in to import
6. **Validation:** Full schema validation before import
7. **Sanitization:** Strip any executable code, validate field types

### Analytics Events

Track in existing analytics system:

| Event | Properties |
|-------|------------|
| `form_import.created` | source, fieldCount, hasMultiPage, configSize |
| `form_import.viewed` | importId, source, timeToView |
| `form_import.claimed` | importId, source, userId, projectId |
| `form_import.completed` | importId, formId, timeToComplete |
| `form_import.failed` | importId, errorType, errorMessage |
| `form_import.expired` | importId, wasViewed |

---

## Phase 2: API Key Authentication (Week 3-4)

### Overview
Allow the MCP server to authenticate with NetPad using API keys, enabling direct form creation without import links.

### MCP Server Configuration

#### New Tool: `configure_credentials`

```typescript
mcp__netpad__configure_credentials({
  apiKey: "np_live_xxxxx",
  organizationId: "org_xxxxx",
  defaultProjectId?: "proj_xxxxx",
  baseUrl?: "https://netpad.io"  // For self-hosted
})

// Stores in ~/.netpad/mcp-credentials.json (encrypted)
// Returns:
{
  success: true,
  organization: "Acme Corp",
  projects: [
    { id: "proj_xxx", name: "Main Project" },
    { id: "proj_yyy", name: "Testing" }
  ]
}
```

#### New Tool: `create_form_direct`

```typescript
mcp__netpad__create_form_direct({
  name: "Contact Form",
  projectId: "proj_xxx",
  fields: [...],
  publish?: boolean,  // Auto-publish after creation
  openInBrowser?: boolean  // Open NetPad after creation
})

// Returns:
{
  success: true,
  formId: "form_abc123",
  slug: "contact-form",
  url: "https://netpad.io/acme/main/forms/contact-form",
  publicUrl: "https://netpad.io/f/contact-form",  // If published
  embedCode: "<iframe src=\"...\"></iframe>"
}
```

#### New Tool: `list_projects`

```typescript
mcp__netpad__list_projects()

// Returns:
{
  projects: [
    {
      id: "proj_xxx",
      name: "Main Project",
      formCount: 12,
      isDefault: true
    }
  ]
}
```

#### New Tool: `get_form`

```typescript
mcp__netpad__get_form({
  formId: "form_xxx"
  // or
  slug: "contact-form",
  projectId: "proj_xxx"
})

// Returns full FormConfiguration
```

#### New Tool: `update_form`

```typescript
mcp__netpad__update_form({
  formId: "form_xxx",
  updates: {
    name?: string,
    fields?: FieldConfig[],
    addFields?: FieldConfig[],
    removeFields?: string[],  // field paths
    theme?: FormTheme
  }
})
```

### Credential Storage

**Location:** `~/.netpad/mcp-credentials.json`

**Format:**
```json
{
  "version": 1,
  "profiles": {
    "default": {
      "apiKey": "encrypted:xxxxx",
      "organizationId": "org_xxx",
      "defaultProjectId": "proj_xxx",
      "baseUrl": "https://netpad.io"
    },
    "work": {
      "apiKey": "encrypted:yyyyy",
      "organizationId": "org_yyy",
      "baseUrl": "https://netpad.acme.com"
    }
  },
  "activeProfile": "default"
}
```

**Encryption:** Use OS keychain where available, fall back to AES-256 with machine-specific key.

### API Scopes

Extend existing API key scopes:

| Scope | Permissions |
|-------|-------------|
| `forms:read` | List forms, get form config |
| `forms:write` | Create, update, delete forms |
| `forms:publish` | Publish/unpublish forms |
| `projects:read` | List projects |
| `submissions:read` | Read form submissions |

MCP server requires: `forms:read`, `forms:write`, `projects:read`

### Error Handling

```typescript
interface MCPError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestion?: string;  // Helpful next step
}
```

| Error Code | Message | Suggestion |
|------------|---------|------------|
| `NOT_CONFIGURED` | NetPad credentials not configured | Run `configure_credentials` first |
| `INVALID_API_KEY` | API key is invalid or expired | Generate a new key at netpad.io/settings/api |
| `INSUFFICIENT_SCOPE` | API key missing required scope | Add `forms:write` scope to your API key |
| `PROJECT_NOT_FOUND` | Project not found | Run `list_projects` to see available projects |
| `FORM_LIMIT_EXCEEDED` | Organization form limit reached | Upgrade plan or delete unused forms |
| `RATE_LIMITED` | Too many requests | Wait 60 seconds before retrying |

---

## Phase 3: OAuth Integration (Week 5-8)

### Overview
Enable Claude to authenticate as the user via OAuth, eliminating the need for manual API key management.

### OAuth Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │     │ Claude/MCP  │     │   NetPad    │
└────┬────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                    │
     │ "Connect to     │                    │
     │  NetPad"        │                    │
     │────────────────>│                    │
     │                 │                    │
     │                 │ GET /oauth/authorize
     │                 │ ?client_id=claude-mcp
     │                 │ &redirect_uri=...
     │                 │ &scope=forms:write
     │                 │───────────────────>│
     │                 │                    │
     │   Open browser  │                    │
     │<─ ─ ─ ─ ─ ─ ─ ─ │                    │
     │                 │                    │
     │ Login & Authorize                    │
     │─────────────────────────────────────>│
     │                 │                    │
     │                 │   Callback with    │
     │                 │   auth code        │
     │                 │<───────────────────│
     │                 │                    │
     │                 │ POST /oauth/token  │
     │                 │───────────────────>│
     │                 │                    │
     │                 │   Access token     │
     │                 │<───────────────────│
     │                 │                    │
     │ "Connected!"    │                    │
     │<────────────────│                    │
     │                 │                    │
```

### OAuth Client Registration

Register `claude-mcp` as an OAuth client in NetPad:

```typescript
{
  clientId: "claude-mcp",
  clientName: "Claude Code (MCP Server)",
  clientType: "public",  // No client secret for CLI tools
  redirectUris: [
    "http://localhost:9876/callback",  // Local callback server
    "urn:ietf:wg:oauth:2.0:oob"        // Manual code entry fallback
  ],
  allowedScopes: [
    "forms:read",
    "forms:write",
    "projects:read",
    "offline_access"  // For refresh tokens
  ],
  tokenLifetime: 3600,        // 1 hour
  refreshTokenLifetime: 2592000  // 30 days
}
```

### MCP Server OAuth Tools

#### `connect_account`

```typescript
mcp__netpad__connect_account({
  baseUrl?: "https://netpad.io"  // For self-hosted
})

// Behavior:
// 1. Start local callback server on random port
// 2. Open browser to NetPad OAuth page
// 3. Wait for callback with auth code
// 4. Exchange code for tokens
// 5. Store tokens securely

// Returns:
{
  success: true,
  organization: "Acme Corp",
  user: "john@acme.com",
  expiresAt: "2025-01-25T11:00:00Z"
}
```

#### `disconnect_account`

```typescript
mcp__netpad__disconnect_account()

// Revokes tokens and clears local storage
```

#### `connection_status`

```typescript
mcp__netpad__connection_status()

// Returns:
{
  connected: true,
  method: "oauth",  // or "api_key"
  organization: "Acme Corp",
  user: "john@acme.com",
  scopes: ["forms:read", "forms:write", "projects:read"],
  expiresAt: "2025-01-25T11:00:00Z",
  refreshable: true
}
```

### Token Storage

**Location:** `~/.netpad/oauth-tokens.json`

**Format:**
```json
{
  "version": 1,
  "tokens": {
    "https://netpad.io": {
      "accessToken": "encrypted:xxxxx",
      "refreshToken": "encrypted:yyyyy",
      "expiresAt": "2025-01-25T11:00:00Z",
      "scopes": ["forms:read", "forms:write"],
      "organizationId": "org_xxx",
      "userId": "user_xxx"
    }
  }
}
```

### NetPad Backend Changes

#### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/oauth/authorize` | GET | OAuth authorization page |
| `/api/oauth/token` | POST | Exchange code for tokens |
| `/api/oauth/revoke` | POST | Revoke tokens |
| `/api/oauth/userinfo` | GET | Get current user info |

#### Database Schema

```typescript
interface OAuthToken {
  _id: ObjectId;
  userId: string;
  organizationId: string;
  clientId: string;
  accessToken: string;  // Hashed
  refreshToken: string; // Hashed
  scopes: string[];
  expiresAt: Date;
  refreshExpiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
  };
}
```

### Security Considerations

1. **PKCE Required:** Use code_challenge/code_verifier for public clients
2. **Token Encryption:** Encrypt tokens at rest with OS keychain
3. **Automatic Refresh:** Refresh tokens before expiry
4. **Revocation:** Support both local and server-side revocation
5. **Scope Limitation:** Request minimum necessary scopes
6. **Device Binding:** Optional binding to device fingerprint

---

## Phase 4: Real-time Collaboration (Future)

### Overview
Enable Claude to observe and modify forms in real-time as users work in the NetPad UI.

### WebSocket Integration

```typescript
mcp__netpad__watch_form({
  formId: "form_xxx"
})

// Establishes WebSocket connection
// Receives real-time updates as user edits
// Can send suggestions/modifications
```

### Use Cases

1. **Live Assistance:** User editing form, Claude suggests improvements
2. **Pair Programming:** Claude and user build form together
3. **Review Mode:** Claude reviews form and suggests changes inline

*Note: This phase requires significant architectural work and is out of scope for initial release.*

---

## Implementation Checklist

### Phase 1: Deep Link Import

**Backend:**
- [ ] Create `form_imports` collection with TTL index
- [ ] Implement `GET /api/forms/import` endpoint
- [ ] Implement `POST /api/forms/import` endpoint
- [ ] Add rate limiting (100/hour per IP)
- [ ] Add config validation and sanitization
- [ ] Add analytics events

**Frontend:**
- [ ] Create `/import/[importId]` page
- [ ] Add project picker modal
- [ ] Update form builder to accept imported config
- [ ] Add "Imported from Claude" banner
- [ ] Handle expired/invalid imports gracefully

**MCP Server:**
- [ ] Update `generate_form` to include import URL
- [ ] Add `create_import_link` tool
- [ ] Add QR code generation for mobile
- [ ] Update documentation

**Testing:**
- [ ] Unit tests for import validation
- [ ] E2E test: generate → import → save flow
- [ ] Load test: 1000 concurrent imports
- [ ] Security audit: injection attempts

### Phase 2: API Key Authentication

**MCP Server:**
- [ ] Implement credential storage with encryption
- [ ] Add `configure_credentials` tool
- [ ] Add `create_form_direct` tool
- [ ] Add `list_projects` tool
- [ ] Add `get_form` tool
- [ ] Add `update_form` tool
- [ ] Implement profile switching
- [ ] Add comprehensive error handling

**Backend:**
- [ ] Ensure API v1 endpoints support all needed operations
- [ ] Add `forms:publish` scope
- [ ] Rate limiting per API key

**Testing:**
- [ ] Test credential storage on macOS, Linux, Windows
- [ ] Test with invalid/expired API keys
- [ ] Test scope enforcement

### Phase 3: OAuth Integration

**Backend:**
- [ ] Register `claude-mcp` OAuth client
- [ ] Implement `/api/oauth/authorize`
- [ ] Implement `/api/oauth/token`
- [ ] Implement `/api/oauth/revoke`
- [ ] Implement PKCE validation
- [ ] Add OAuth token storage

**MCP Server:**
- [ ] Implement local callback server
- [ ] Add `connect_account` tool
- [ ] Add `disconnect_account` tool
- [ ] Add `connection_status` tool
- [ ] Implement automatic token refresh
- [ ] Handle browser launch across platforms

**Frontend:**
- [ ] OAuth consent page design
- [ ] Connected apps management in settings
- [ ] Revoke access UI

**Testing:**
- [ ] Full OAuth flow E2E test
- [ ] Token refresh test
- [ ] Revocation test
- [ ] Security audit: token handling

---

## Open Questions

1. **Self-hosted support:** Should Phase 1 work with self-hosted NetPad instances?
   - Recommendation: Yes, allow custom `baseUrl` parameter

2. **Import link sharing:** Should import links be shareable between users?
   - Recommendation: Yes, but track original creator for attribution

3. **Team API keys:** Should MCP support team-shared API keys or only personal?
   - Recommendation: Support both, let organization admins decide

4. **Offline mode:** Should MCP server cache form configs for offline editing?
   - Recommendation: Out of scope for initial release

5. **Conflict resolution:** What happens if form is modified while Claude is updating?
   - Recommendation: Last-write-wins for Phase 2, optimistic locking for Phase 3+

---

## Appendix A: Example User Journeys

### Journey 1: First-time User with Deep Link

1. User: "Create a contact form for my website"
2. Claude generates form config
3. Claude: "Form ready! [Click here to import to NetPad](https://netpad.io/import/imp_xxx)"
4. User clicks link → redirected to NetPad login
5. User logs in → sees project picker
6. User selects project → form builder opens with form pre-loaded
7. User clicks "Save" → form created
8. User: "Can you add a phone number field?"
9. Claude: "Here's an updated import link with phone field added"

### Journey 2: Power User with API Key

1. User: "Connect to my NetPad account"
2. Claude: "Please provide your API key from netpad.io/settings/api"
3. User provides API key
4. Claude: "Connected to Acme Corp. Default project: Main Website"
5. User: "Create a job application form in the HR project"
6. Claude creates form directly via API
7. Claude: "Created! View at: https://netpad.io/acme/hr/forms/job-application"
8. User: "Add a resume upload field"
9. Claude updates form directly
10. Claude: "Added! The form now has file upload for resumes."

### Journey 3: Enterprise User with OAuth

1. User: "Connect to NetPad"
2. Claude opens browser to NetPad OAuth page
3. User logs in with SSO, authorizes Claude
4. Claude: "Connected as john@enterprise.com"
5. User: "List my projects"
6. Claude: "You have 5 projects: HR Portal, Customer Feedback, ..."
7. User: "Create a customer feedback form in Customer Feedback project"
8. Claude creates form, returns URL
9. [30 days later, token still works via refresh]

---

## Appendix B: Config Schema Reference

### FormConfiguration (Import Format)

```typescript
interface FormConfiguration {
  // Required
  name: string;
  fieldConfigs: FieldConfig[];

  // Optional
  slug?: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;

  // Multi-page
  multiPage?: {
    enabled: boolean;
    pages: {
      id: string;
      title: string;
      description?: string;
      fields: string[];  // field paths
    }[];
    showProgressBar?: boolean;
    showPageTitles?: boolean;
    showReview?: boolean;
  };

  // Theming
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    surfaceColor?: string;
    textColor?: string;
    errorColor?: string;
    successColor?: string;
    borderRadius?: number;
    spacing?: 'compact' | 'comfortable' | 'spacious';
    inputStyle?: 'outlined' | 'filled' | 'standard';
    mode?: 'light' | 'dark';
  };
}
```

### Import Limits

| Attribute | Limit |
|-----------|-------|
| Config size (base64) | 100 KB |
| Field count | 200 |
| Page count | 20 |
| Options per field | 100 |
| Formula length | 1000 chars |
| Import link lifetime | 24 hours |

---

## Appendix C: Analytics Dashboard Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude MCP Integration Analytics                    [Last 30d] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Import Links Created        Forms Created via MCP              │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │     1,247       │        │      892        │                │
│  │    ▲ 23%        │        │    ▲ 31%        │                │
│  └─────────────────┘        └─────────────────┘                │
│                                                                 │
│  Conversion Rate             Avg. Time to Import                │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │     71.5%       │        │     47 sec      │                │
│  │    ▲ 5%         │        │    ▼ 12 sec     │                │
│  └─────────────────┘        └─────────────────┘                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Import Funnel                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Created  ████████████████████████████████████  1,247   │    │
│  │ Viewed   ██████████████████████████████        1,089   │    │
│  │ Claimed  ████████████████████████               892    │    │
│  │ Saved    ██████████████████████                 847    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Top Form Types Created                                         │
│  1. Contact forms (234)                                         │
│  2. Feedback surveys (187)                                      │
│  3. Job applications (143)                                      │
│  4. Event registration (98)                                     │
│  5. Property listings (76)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*End of Spec*
