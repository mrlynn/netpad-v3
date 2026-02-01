# NetPad CLI & RBAC Testing Guide

**Version:** 1.0.0
**Last Updated:** January 31, 2026

## Overview

This guide provides comprehensive test scenarios for the NetPad CLI, virtual filesystem, and RBAC features. Use these test cases to verify functionality, identify bugs, and ensure security compliance.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Virtual Filesystem Tests](#virtual-filesystem-tests)
3. [RBAC Tests](#rbac-tests)
4. [Security Tests](#security-tests)
5. [AI Integration Tests](#ai-integration-tests)
6. [Performance Tests](#performance-tests)
7. [Test Matrix](#test-matrix)

---

## Test Environment Setup

### Prerequisites

1. **Test Organization**: Create a dedicated test organization
2. **Test Users**: Set up multiple users with different roles
3. **Test Data**: Populate with sample forms, workflows, and data
4. **API Key**: Generate API keys for CLI testing

### Setup Script

```bash
#!/bin/bash
# Setup test environment

export TEST_ORG="Test Org"
export TEST_PROJECT="Test Project"
export TEST_APP="Test App"

# Login
netpad login-key $NETPAD_API_KEY

# Verify authentication
netpad whoami

# Create test data structure
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"
```

### Test Users

| User | Email | Role | Groups | Purpose |
|------|-------|------|--------|---------|
| Alice | alice@test.com | owner | - | Full admin testing |
| Bob | bob@test.com | admin | Engineering | Admin operations |
| Charlie | charlie@test.com | member | Engineering, Support | Member permissions |
| Diana | diana@test.com | viewer | Marketing | Read-only access |
| Eve | eve@test.com | member | - | Isolated user testing |

---

## Virtual Filesystem Tests

### Test Suite 1: Navigation Commands

#### Test 1.1: `pwd` - Print Working Directory

**Objective:** Verify current directory display

**Steps:**
```bash
cd /
pwd
# Expected: /

cd "/$TEST_ORG"
pwd
# Expected: /Test Org

cd "$TEST_PROJECT"
pwd
# Expected: /Test Org/Test Project
```

**Success Criteria:**
- ✅ Correct path displayed at each level
- ✅ Path updates after `cd` command
- ✅ Handles spaces in directory names

#### Test 1.2: `ls` - List Directory Contents

**Objective:** Verify directory listing functionality

**Steps:**
```bash
# Test root listing
ls /
# Expected: List of all accessible organizations

# Test project listing
ls "/$TEST_ORG"
# Expected: List of projects in the organization

# Test long format
ls -l "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"
# Expected: Forms with metadata (type, update time)

# Test with no contents
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/templates"
ls
# Expected: (empty) or list of templates
```

**Success Criteria:**
- ✅ Lists all accessible items
- ✅ Long format shows metadata
- ✅ Empty directories show appropriate message
- ✅ Color-codes different types (orgs, projects, forms, workflows)

#### Test 1.3: `cd` - Change Directory

**Objective:** Test directory navigation

**Steps:**
```bash
# Absolute path
cd "/$TEST_ORG/$TEST_PROJECT"
pwd
# Expected: /Test Org/Test Project

# Relative path
cd "$TEST_APP"
pwd
# Expected: /Test Org/Test Project/Test App

# Parent directory
cd ..
pwd
# Expected: /Test Org/Test Project

# Home directory
cd ~
pwd
# Expected: /

# Multiple levels up
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"
cd ../../..
pwd
# Expected: /Test Org
```

**Success Criteria:**
- ✅ Absolute paths work correctly
- ✅ Relative paths navigate from current location
- ✅ `..` moves up one level
- ✅ `~` returns to root
- ✅ Invalid paths show error message

#### Test 1.4: `tree` - Directory Tree

**Objective:** Verify tree structure display

**Steps:**
```bash
# Basic tree
tree "/$TEST_ORG"
# Expected: Hierarchical display of projects and apps

# Limited depth
tree -d 2 "/$TEST_ORG"
# Expected: Only 2 levels deep

# From current location
cd "/$TEST_ORG/$TEST_PROJECT"
tree
# Expected: Tree from current directory
```

**Success Criteria:**
- ✅ Shows hierarchical structure
- ✅ Color-codes different levels
- ✅ Depth limit works correctly
- ✅ Handles large directory trees

---

### Test Suite 2: File Operations

#### Test 2.1: `cat` - View File Contents

**Objective:** Display form/workflow details

**Steps:**
```bash
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"

# View form
cat "Contact Form"
# Expected: Form details (ID, fields, metadata)

# JSON format
cat --format json "Contact Form"
# Expected: Raw JSON data

# Non-existent file
cat "NonExistent"
# Expected: Error message
```

**Success Criteria:**
- ✅ Displays form metadata correctly
- ✅ Shows field list
- ✅ JSON format returns valid JSON
- ✅ Handles forms with special characters in names
- ✅ Error message for missing files

**Test Data:**

Create test forms with:
- Simple form (5 fields)
- Complex form (20+ fields)
- Form with special characters: `"Customer Feedback (2026)"`
- Empty form (0 fields)

#### Test 2.2: `find` - Search for Items

**Objective:** Search by name pattern

**Steps:**
```bash
# Simple search
find contact
# Expected: All items with "contact" in name

# Case-insensitive
find CONTACT
# Expected: Same results as lowercase

# Wildcard search
find "*.form"
# Expected: All forms

# No results
find "xyzabc123"
# Expected: Empty or "no results" message
```

**Success Criteria:**
- ✅ Finds items across all accessible locations
- ✅ Case-insensitive by default
- ✅ Shows full paths
- ✅ Handles partial matches
- ✅ Performance acceptable for large datasets

#### Test 2.3: `grep` - Search Within Content

**Objective:** Search within form/workflow content

**Steps:**
```bash
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"

# Search in current directory
grep email .
# Expected: Forms with "email" in field labels or descriptions

# Case-insensitive
grep -i EMAIL "Contact Form"
# Expected: Matches regardless of case

# Recursive search
grep -r approval /
# Expected: All items with "approval" anywhere
```

**Success Criteria:**
- ✅ Searches field labels
- ✅ Searches form descriptions
- ✅ Highlights matches
- ✅ Shows context (file:match)
- ✅ Recursive search covers all accessible items

---

### Test Suite 3: Data Collection Access

#### Test 3.1: Browse Data Collections

**Objective:** Access and view data collections

**Steps:**
```bash
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/data"

# List collections
ls
# Expected: form_submissions, users, custom collections

# View collection
cd form_submissions
ls -l
# Expected: List of document IDs

# View document
cat <documentId>
# Expected: JSON document content
```

**Success Criteria:**
- ✅ Lists user-accessible collections
- ✅ Blocks internal collections (system, audit, logs)
- ✅ Shows document IDs
- ✅ Displays document content correctly

#### Test 3.2: Security - Blocked Collections

**Objective:** Verify internal collections are blocked

**Steps:**
```bash
cd "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/data"

# Attempt to access blocked collections
ls system.*
# Expected: Error or excluded from results

ls audit_logs
# Expected: Access denied

ls api_keys
# Expected: Access denied

cat sessions
# Expected: Access denied
```

**Success Criteria:**
- ✅ Internal collections not listed
- ✅ Access attempts return error
- ✅ Error message is clear
- ✅ No data leakage

**Blocked Collection Prefixes:**
- `system.*`
- `audit_*`
- `logs`
- `_migrations`
- `sessions`
- `tokens`
- `api_keys`
- `config`
- `settings`
- `platform_*`
- `admin_*`

---

## RBAC Tests

### Test Suite 4: Users Management

#### Test 4.1: List Users

**Objective:** View organization members

**Steps:**
```bash
# As owner (Alice)
users list
# Expected: All members visible

# As admin (Bob)
users list
# Expected: All members visible

# As member (Charlie)
users list
# Expected: May have limited view (depends on implementation)

# As viewer (Diana)
users list
# Expected: May only see themselves or error
```

**Success Criteria:**
- ✅ Owner sees all users
- ✅ Admin sees all users
- ✅ Proper RBAC enforcement
- ✅ Shows role and group membership

#### Test 4.2: Invite Users

**Objective:** Add new members

**Test Cases:**

| Actor | Action | Expected Result |
|-------|--------|-----------------|
| Alice (owner) | `users invite new@test.com --role member` | ✅ Success |
| Bob (admin) | `users invite new2@test.com --role member` | ✅ Success |
| Charlie (member) | `users invite new3@test.com --role member` | ❌ Permission denied |
| Diana (viewer) | `users invite new4@test.com --role viewer` | ❌ Permission denied |

**Steps:**
```bash
# As admin
users invite newuser@test.com --role member
# Expected: Success, invitation sent

# Verify
users list | grep newuser
# Expected: newuser appears in list

# As member (should fail)
users invite another@test.com --role member
# Expected: Permission denied error
```

**Success Criteria:**
- ✅ Admins can invite
- ✅ Members cannot invite (unless granted permission)
- ✅ Invited user receives email
- ✅ User appears in list after acceptance

#### Test 4.3: Remove Users

**Objective:** Remove members from organization

**Test Cases:**

| Actor | Target | Expected Result |
|-------|--------|-----------------|
| Alice (owner) | Eve (member) | ✅ Success |
| Bob (admin) | Charlie (member) | ✅ Success |
| Charlie (member) | Eve (member) | ❌ Permission denied |
| Bob (admin) | Alice (owner) | ❌ Cannot remove owner |

**Steps:**
```bash
# As admin, remove a member
users remove user_eve
# Expected: Success

# Verify
users list | grep eve
# Expected: Eve not in list

# As admin, attempt to remove owner
users remove user_alice
# Expected: Error - cannot remove owner

# As member, attempt to remove anyone
users remove user_bob
# Expected: Permission denied
```

**Success Criteria:**
- ✅ Admins can remove non-owners
- ✅ Cannot remove organization owner
- ✅ Members cannot remove others
- ✅ Removed user loses access immediately

---

### Test Suite 5: Groups Management

#### Test 5.1: Create and Manage Groups

**Objective:** Group lifecycle operations

**Steps:**
```bash
# As admin, create group
groups create "QA Team" --role member --description "Quality Assurance"
# Expected: Success, returns group ID

# List groups
groups list
# Expected: QA Team appears

# Show details
groups info grp_qa
# Expected: Shows name, role, member count

# Update group
groups update grp_qa --role viewer
# Expected: Success (if supported)

# Delete group
groups delete grp_qa
# Expected: Success
```

**Success Criteria:**
- ✅ Admins can create groups
- ✅ Group appears in listings
- ✅ Can set default role
- ✅ Can delete groups
- ✅ Members cannot create groups

#### Test 5.2: Group Membership

**Objective:** Add/remove members from groups

**Steps:**
```bash
# Create test group
groups create "Test Group" --role member

# Add members
groups add-member grp_test user_charlie
# Expected: Success

groups add-member grp_test user_eve
# Expected: Success

# Verify
groups info grp_test
# Expected: Shows 2 members

# Check user's groups
users info user_charlie
# Expected: Shows Test Group membership

# Remove member
groups remove-member grp_test user_eve
# Expected: Success

# Verify
groups info grp_test
# Expected: Shows 1 member (Charlie)
```

**Success Criteria:**
- ✅ Can add users to groups
- ✅ Can remove users from groups
- ✅ Group membership visible in user info
- ✅ Permissions update immediately

---

### Test Suite 6: Roles and Permissions

#### Test 6.1: List and View Roles

**Objective:** Display role information

**Steps:**
```bash
# List all roles
roles list
# Expected: Built-in (owner, admin, member, viewer) + custom roles

# View built-in role
roles info admin
# Expected: Shows all admin permissions

# View custom role
roles info role_custom
# Expected: Shows permissions, base role if any
```

**Success Criteria:**
- ✅ Shows built-in roles
- ✅ Shows custom roles
- ✅ Permission list is complete
- ✅ Shows inheritance (if applicable)

#### Test 6.2: Create Custom Roles

**Objective:** Create and configure custom roles

**Steps:**
```bash
# As admin, create custom role
roles create "Form Manager" --base member
# Expected: Success

# Grant additional permissions
roles grant role_formmgr forms:delete
roles grant role_formmgr forms:publish
roles grant role_formmgr responses:export
# Expected: All succeed

# Verify
roles info role_formmgr
# Expected: Shows base permissions + granted ones

# As member, attempt to create role
roles create "Unauthorized" --base viewer
# Expected: Permission denied
```

**Success Criteria:**
- ✅ Admins can create custom roles
- ✅ Can extend built-in roles
- ✅ Can grant additional permissions
- ✅ Members cannot create roles

#### Test 6.3: Permission Checks

**Objective:** Verify permission system

**Steps:**
```bash
# As member, check own permissions
permissions me
# Expected: Shows member permissions + any from groups

# Check specific permission
permissions check forms:create
# Expected: ✓ You have permission

permissions check org:delete
# Expected: ✗ You do NOT have permission

# List all available permissions
permissions list
# Expected: Full categorized list
```

**Success Criteria:**
- ✅ Correctly identifies granted permissions
- ✅ Correctly identifies denied permissions
- ✅ Shows permission sources (role, groups)
- ✅ Effective permissions are union of all sources

---

### Test Suite 7: Role Assignment

#### Test 7.1: Assign Roles to Users

**Objective:** Change user roles

**Test Cases:**

| Actor | Target | New Role | Expected |
|-------|--------|----------|----------|
| Alice (owner) | Charlie | admin | ✅ Success |
| Bob (admin) | Eve | member | ✅ Success |
| Charlie (member) | Eve | viewer | ❌ Permission denied |
| Bob (admin) | Alice | member | ❌ Cannot change owner |

**Steps:**
```bash
# As admin, assign role
assign user user_charlie admin
# Expected: Success

# Verify
users info user_charlie
# Expected: Shows role as admin

# Check updated permissions
# (As Charlie) permissions me
# Expected: Now has admin permissions

# As admin, attempt to demote owner
assign user user_alice member
# Expected: Error - cannot change owner role

# As member, attempt to assign role
assign user user_eve viewer
# Expected: Permission denied
```

**Success Criteria:**
- ✅ Admins can assign roles
- ✅ Cannot demote owner
- ✅ Permissions update immediately
- ✅ Members cannot assign roles

#### Test 7.2: Unassign Roles

**Objective:** Remove direct role assignments

**Steps:**
```bash
# Setup: User with direct role + group membership
assign user user_charlie admin
groups add-member grp_eng user_charlie  # grp_eng has member role

# Unassign direct role
unassign user user_charlie
# Expected: Success

# Check permissions
users info user_charlie
# Expected: Still has permissions from Engineering group
```

**Success Criteria:**
- ✅ Removes direct role assignment
- ✅ User retains group permissions
- ✅ If no groups, user has minimal/no access

---

## Security Tests

### Test Suite 8: Authentication and Authorization

#### Test 8.1: Authentication Methods

**Objective:** Test login mechanisms

**Steps:**
```bash
# Logout
logout
# Expected: Success, credentials cleared

# Verify logged out
whoami
# Expected: Not authenticated

# Login with API key
login-key $NETPAD_API_KEY
# Expected: Success

# Verify
whoami
# Expected: Shows authenticated user and org

# Login with invalid key
login-key invalid_key_12345
# Expected: Error - Invalid API key
```

**Success Criteria:**
- ✅ Logout clears credentials
- ✅ API key authentication works
- ✅ Invalid keys rejected
- ✅ Session persists across commands

#### Test 8.2: Permission Enforcement

**Objective:** Verify RBAC blocks unauthorized actions

**Test Matrix:**

| User | Action | Has Permission? | Expected |
|------|--------|-----------------|----------|
| Diana (viewer) | `list forms` | ✅ forms:read | Success |
| Diana (viewer) | `create form "Test"` | ❌ forms:create | Denied |
| Charlie (member) | `create form "Test"` | ✅ forms:create | Success |
| Charlie (member) | `users remove user_eve` | ❌ members:remove | Denied |
| Bob (admin) | `users remove user_eve` | ✅ members:remove | Success |
| Bob (admin) | `org delete` | ❌ org:delete | Denied |
| Alice (owner) | `org delete` | ✅ org:delete | Success |

**Steps:**
```bash
# As viewer, attempt to create form
# (Login as Diana)
create form "Unauthorized Form"
# Expected: Permission denied error

# As member, create form
# (Login as Charlie)
create form "My Form"
# Expected: Success (if command implemented)

# As member, attempt admin action
users remove user_eve
# Expected: Permission denied

# As admin, remove user
# (Login as Bob)
users remove user_eve
# Expected: Success
```

**Success Criteria:**
- ✅ All actions check permissions
- ✅ Unauthorized actions blocked
- ✅ Clear error messages
- ✅ No privilege escalation possible

#### Test 8.3: Data Isolation

**Objective:** Ensure users only access their organization's data

**Setup:**
- Create two organizations: Org A, Org B
- User Alice in Org A (admin)
- User Bob in Org B (admin)

**Steps:**
```bash
# As Alice (Org A)
cd "/"
ls
# Expected: Only Org A visible

cd "/Org B"
# Expected: Error - Organization not found

# As Bob (Org B)
cd "/"
ls
# Expected: Only Org B visible
```

**Success Criteria:**
- ✅ Users only see their organization(s)
- ✅ Cannot navigate to other orgs
- ✅ Cannot access other orgs' data via direct paths
- ✅ No cross-org data leakage

---

### Test Suite 9: Security Edge Cases

#### Test 9.1: Path Traversal Prevention

**Objective:** Prevent unauthorized access via path manipulation

**Steps:**
```bash
# Attempt path traversal
cd "../../platform_db"
# Expected: Error or normalizes to valid path

# Attempt to access blocked collections
cat "/../../system.users"
# Expected: Access denied

# Attempt SQL/NoSQL injection
find "'; DROP TABLE users; --"
# Expected: Treated as literal search string, no execution
```

**Success Criteria:**
- ✅ Path traversal attempts blocked
- ✅ No access to system paths
- ✅ Input sanitized
- ✅ No code execution via inputs

#### Test 9.2: Rate Limiting (if implemented)

**Objective:** Prevent abuse via rate limiting

**Steps:**
```bash
# Rapid successive requests
for i in {1..100}; do
  users list
done
# Expected: Rate limit warning or temporary block after threshold
```

**Success Criteria:**
- ✅ Rate limits enforced
- ✅ Clear error messages
- ✅ Temporary (not permanent) block

---

## AI Integration Tests

### Test Suite 10: Natural Language Commands

#### Test 10.1: AI Interpretation (AI Enabled)

**Objective:** Verify AI interprets natural language correctly

**Test Cases:**

| Input | Expected Interpretation | Expected Action |
|-------|------------------------|-----------------|
| "show me all forms" | `list forms` | Lists forms |
| "find feedback forms" | `find feedback` | Searches for "feedback" |
| "what can I do?" | `help` | Shows help |
| "who am I?" | `whoami` | Shows user info |
| "create a contact form" | `create form "contact"` | Attempts creation |

**Steps:**
```bash
# Enable AI (configure keys)
export OPENAI_API_KEY=...

# Test natural language
show me all forms
# Expected: Interprets as "list forms", shows forms

# Test with typos
shwo me froms
# Expected: Corrects to "show me forms", suggests command

# Test ambiguous
delete
# Expected: Asks for clarification or suggests options
```

**Success Criteria:**
- ✅ Correctly interprets common phrases
- ✅ Handles typos gracefully
- ✅ Shows "Did you mean" suggestions
- ✅ Falls back to structured commands on failure

#### Test 10.2: AI Fallback (AI Disabled)

**Objective:** Graceful degradation when AI unavailable

**Steps:**
```bash
# Disable AI
unset OPENAI_API_KEY
unset ANTHROPIC_API_KEY

# Attempt natural language
show me all forms
# Expected: Error message + suggestion to use "help"

# Use structured command instead
list forms
# Expected: Success
```

**Success Criteria:**
- ✅ Clear error when AI unavailable
- ✅ Suggests using `help`
- ✅ Structured commands still work
- ✅ No crashes or confusing errors

---

## Performance Tests

### Test Suite 11: Large Dataset Handling

#### Test 11.1: Large Directory Listings

**Objective:** Performance with many items

**Setup:**
- Organization with 100+ forms
- 50+ workflows
- 10+ projects

**Steps:**
```bash
# List large directory
time ls "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"
# Expected: < 2 seconds

# List with long format
time ls -l "/$TEST_ORG/$TEST_PROJECT/$TEST_APP/forms"
# Expected: < 3 seconds

# Tree with many items
time tree "/$TEST_ORG"
# Expected: < 5 seconds for depth 3
```

**Success Criteria:**
- ✅ Response time acceptable (< 2s for listings)
- ✅ Pagination if needed
- ✅ No timeouts
- ✅ No memory issues

#### Test 11.2: Deep Search Performance

**Objective:** Search across large datasets

**Setup:**
- 1000+ forms across multiple apps

**Steps:**
```bash
# Global search
time find contact
# Expected: < 5 seconds

# Content search
time grep -r email /
# Expected: < 10 seconds

# Complex search
time find "Customer*Feedback*"
# Expected: < 5 seconds
```

**Success Criteria:**
- ✅ Search completes in reasonable time
- ✅ Results limited or paginated if very large
- ✅ Shows progress indicator for long searches

---

## Test Matrix

### Comprehensive Test Matrix

| Test ID | Feature | Test Type | Priority | Status |
|---------|---------|-----------|----------|--------|
| FS-1 | `pwd` command | Functional | High | |
| FS-2 | `ls` command | Functional | High | |
| FS-3 | `cd` command | Functional | High | |
| FS-4 | `tree` command | Functional | Medium | |
| FS-5 | `cat` command | Functional | High | |
| FS-6 | `find` command | Functional | High | |
| FS-7 | `grep` command | Functional | Medium | |
| FS-8 | Data collection access | Functional | High | |
| FS-9 | Blocked collection security | Security | Critical | |
| RBAC-1 | List users | Functional | High | |
| RBAC-2 | Invite users | Functional | High | |
| RBAC-3 | Remove users | Functional | High | |
| RBAC-4 | Create groups | Functional | High | |
| RBAC-5 | Manage group members | Functional | High | |
| RBAC-6 | List roles | Functional | High | |
| RBAC-7 | Create custom roles | Functional | High | |
| RBAC-8 | Grant/revoke permissions | Functional | High | |
| RBAC-9 | Check permissions | Functional | High | |
| RBAC-10 | Assign roles | Functional | High | |
| SEC-1 | API key authentication | Security | Critical | |
| SEC-2 | Permission enforcement | Security | Critical | |
| SEC-3 | Data isolation | Security | Critical | |
| SEC-4 | Path traversal prevention | Security | Critical | |
| SEC-5 | Input sanitization | Security | High | |
| AI-1 | Natural language interpretation | Integration | Medium | |
| AI-2 | AI fallback handling | Integration | Medium | |
| PERF-1 | Large directory listing | Performance | Medium | |
| PERF-2 | Deep search performance | Performance | Medium | |

### Test Coverage Goals

| Category | Target Coverage | Actual Coverage |
|----------|----------------|-----------------|
| Navigation Commands | 100% | |
| File Operations | 100% | |
| RBAC Commands | 100% | |
| Security Controls | 100% | |
| AI Features | 80% | |
| Error Handling | 90% | |

---

## Running the Tests

### Manual Testing

Run test suites sequentially:

```bash
# 1. Setup
./scripts/setup-test-env.sh

# 2. Run navigation tests
./tests/cli/test-navigation.sh

# 3. Run RBAC tests
./tests/cli/test-rbac.sh

# 4. Run security tests
./tests/cli/test-security.sh

# 5. Generate report
./scripts/generate-test-report.sh
```

### Automated Testing

Use the test automation framework (if implemented):

```bash
# Run all tests
npm test -- --suite=cli

# Run specific category
npm test -- --suite=cli --category=filesystem

# Run with specific user
npm test -- --suite=cli --as=admin

# Generate coverage report
npm test -- --suite=cli --coverage
```

---

## Reporting Issues

When reporting bugs found during testing:

1. **Test ID**: Reference the test matrix ID
2. **Environment**: CLI version, OS, node version
3. **User Role**: Which user role was testing (owner, admin, member, viewer)
4. **Steps to Reproduce**: Exact commands run
5. **Expected**: What should happen
6. **Actual**: What actually happened
7. **Logs**: Any error messages or stack traces

**Example Issue:**

```
Test ID: RBAC-3
Environment: @netpad/cli v1.0.0, macOS 13, Node 18.12.0
User Role: admin
Steps:
  1. users list
  2. users remove user_eve
Expected: User removed successfully
Actual: Error - "Permission denied"
Logs: TypeError: Cannot read property 'orgId' of undefined
```

---

## Next Steps

- [CLI & Virtual Filesystem Guide](./CLI_VIRTUAL_FILESYSTEM.md)
- [RBAC CLI Guide](./RBAC_CLI_GUIDE.md)
- [RBAC Schema Guide](./RBAC_SCHEMA_GUIDE.md)

---

*For questions or to report issues, visit [github.com/netpad/netpad/issues](https://github.com/netpad/netpad/issues)*
