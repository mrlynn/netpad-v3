# CLI Parity Audit: Terminal vs @netpad/cli

**Date:** 2026-01-31

## Feature Comparison

| Feature | Terminal | @netpad/cli | Web UI | Notes |
|---------|----------|-------------|--------|-------|
| **Authentication** |
| Login | ✅ (session) | ✅ login | ✅ OAuth | Different mechanisms |
| Logout | ✅ | ✅ logout | ✅ | |
| Whoami | ✅ whoami | ✅ whoami | ❌ | CLI has basic, terminal has --effective |
| **Package Management** |
| Install | ❌ | ✅ install | ✅ | CLI/Web only |
| List packages | ❌ | ✅ list | ✅ | CLI/Web only |
| Search | ✅ search | ✅ search | ✅ | |
| Create app | ❌ | ✅ create-app | ❌ | CLI scaffolding |
| Submit | ❌ | ✅ submit | ✅ | |
| **RBAC - Users** |
| users list | ✅ | ❌ **MISSING** | ✅ | |
| users add | ✅ | ❌ **MISSING** | ✅ | |
| users remove | ✅ | ❌ **MISSING** | ✅ | |
| users info | ✅ | ❌ **MISSING** | ✅ | |
| users update | ✅ | ❌ **MISSING** | ✅ | |
| **RBAC - Groups** |
| groups list | ✅ | ❌ **MISSING** | ✅ | |
| groups create | ✅ | ❌ **MISSING** | ✅ | |
| groups delete | ✅ | ❌ **MISSING** | ✅ | |
| groups info | ✅ | ❌ **MISSING** | ✅ | |
| groups add-member | ✅ | ❌ **MISSING** | ✅ | |
| groups remove-member | ✅ | ❌ **MISSING** | ✅ | |
| **RBAC - Roles** |
| roles list | ✅ | ❌ **MISSING** | ✅ | |
| roles create | ✅ | ❌ **MISSING** | ✅ | |
| roles delete | ✅ | ❌ **MISSING** | ✅ | |
| roles info | ✅ | ❌ **MISSING** | ✅ | |
| roles grant | ✅ | ❌ **MISSING** | ✅ | |
| roles revoke | ✅ | ❌ **MISSING** | ✅ | |
| **RBAC - Assignments** |
| assign user/group | ✅ | ❌ **MISSING** | ⚠️ partial | |
| unassign user/group | ✅ | ❌ **MISSING** | ⚠️ partial | |
| **RBAC - Permissions** |
| permissions list | ✅ | ❌ **MISSING** | ✅ | |
| permissions check | ✅ | ❌ **MISSING** | ❌ | |
| **Filesystem-like** |
| ls | ✅ | ❌ | ❌ | Terminal only |
| cd | ✅ | ❌ | ❌ | Terminal only |
| pwd | ✅ | ❌ | ❌ | Terminal only |
| cat | ✅ | ❌ | ❌ | Terminal only |
| tree | ✅ | ❌ | ❌ | Terminal only |
| find | ✅ | ❌ | ❌ | Terminal only |
| **Forms** |
| list forms | ✅ (via ls) | ❌ **MISSING** | ✅ | |
| show form | ✅ (via cat) | ❌ **MISSING** | ✅ | |
| create form | ✅ | ❌ | ✅ | |
| **Workflows** |
| list workflows | ✅ (via ls) | ❌ **MISSING** | ✅ | |
| show workflow | ✅ (via cat) | ❌ **MISSING** | ✅ | |

## Priority Actions

### High Priority (RBAC Parity)
1. Add `users` command with all subcommands
2. Add `groups` command with all subcommands
3. Add `roles` command with all subcommands
4. Add `assign` / `unassign` commands
5. Add `permissions` command
6. Enhance `whoami` with --effective flag

### Medium Priority (Resource Management)
7. Add `forms` command (list, show, create)
8. Add `workflows` command (list, show)
9. Add `projects` command (list, show)

### Lower Priority (Filesystem-like)
- Filesystem commands (ls, cd, etc.) are terminal-specific UX
- CLI uses explicit commands instead of navigation
- Not needed for parity

## Implementation Notes

- CLI should use same API endpoints as terminal
- Output format should match terminal (colored, formatted)
- Options should use same names (--role, --org, etc.)
- Error messages should be consistent
