# NetPad CLI Quick Reference

**Version:** 1.0.0
**Last Updated:** January 31, 2026

## Authentication

```bash
netpad login                           # OAuth browser login
netpad login-key <api-key>            # API key login
netpad logout                          # Logout
netpad whoami                          # Show auth status
```

---

## Navigation

```bash
pwd                                    # Print working directory
ls [path]                             # List contents
ls -l                                 # Long format with metadata
cd <path>                             # Change directory
cd ..                                 # Go up one level
cd ~                                  # Go to root
cd /                                  # Go to root (same as ~)
tree [path]                           # Show directory tree
tree -d <depth>                       # Limit tree depth
```

---

## File Operations

```bash
cat <file>                            # View file/item details
cat --format json <file>              # View as JSON
find <pattern>                        # Search for items
grep <pattern> <file>                 # Search within content
grep -i <pattern> .                   # Case-insensitive search
grep -r <pattern> /                   # Recursive search
```

---

## Users

```bash
users list                            # List organization members
users ls                              # (short form)
users info <userId>                   # Show user details
users show <email>                    # Show user by email
users invite <email> --role <role>    # Invite new user
users remove <userId>                 # Remove user
users rm <email>                      # Remove user by email
```

---

## Groups

```bash
groups list                           # List all groups
groups ls                             # (short form)
groups create <name>                  # Create group
groups create <name> --role <role>    # Create with default role
groups info <groupId>                 # Show group details
groups delete <groupId>               # Delete group
groups add-member <groupId> <userId>  # Add member to group
groups remove-member <groupId> <userId> # Remove member from group
```

---

## Roles

```bash
roles list                            # List all roles
roles ls                              # (short form)
roles info <roleId>                   # Show role details
roles create <name>                   # Create custom role
roles create <name> --base <role>     # Extend built-in role
roles delete <roleId>                 # Delete custom role
roles grant <roleId> <permission>     # Grant permission to role
roles revoke <roleId> <permission>    # Revoke permission from role
```

### Built-in Roles

- `owner` - Full organization control
- `admin` - Manage organization
- `member` - Create and manage own content
- `viewer` - Read-only access

---

## Permissions

```bash
permissions list                      # List all available permissions
permissions ls                        # (short form)
permissions me                        # Show your permissions
permissions mine                      # (alias)
permissions check <permission>        # Check if you have a permission
```

### Permission Categories

- `org:*` - Organization management
- `members:*` - Member management
- `groups:*` - Group management
- `roles:*` - Role management
- `projects:*` - Project management
- `forms:*` - Form management
- `responses:*` - Form response management
- `workflows:*` - Workflow management
- `connections:*` - Database connection management
- `integrations:*` - Integration management
- `audit:*` - Audit log access

---

## Role Assignment

```bash
assign user <userId> <roleId>         # Assign role to user
assign <userId> <roleId>              # (short form)
assign group <groupId> <roleId>       # Set group default role
unassign user <userId>                # Remove user's role assignment
unassign <userId>                     # (short form)
```

---

## Help

```bash
help                                  # Show quick help
help <topic>                          # Show specific topic
help search <query>                   # Search help topics
```

---

## Shell Utilities

```bash
alias [name='command']                # Create/list aliases
unalias <name>                        # Remove alias
export <var=value>                    # Set environment variable
env                                   # List environment variables
echo <text>                           # Print text
echo $VAR                             # Print variable value
```

---

## Filesystem Structure

```
/                                     Root
├── <organization>/                   Your organization
│   ├── <project>/                    Project
│   │   ├── <application>/            Application
│   │   │   ├── forms/                Forms directory
│   │   │   ├── workflows/            Workflows directory
│   │   │   ├── templates/            Templates directory
│   │   │   └── data/                 Data collections
│   │   │       ├── form_submissions  Form submissions
│   │   │       ├── users             Users collection
│   │   │       └── ...               Custom collections
```

---

## Common Workflows

### Check Your Access

```bash
whoami                                # Who am I?
permissions me                        # What can I do?
permissions check forms:create        # Can I create forms?
```

### Navigate to Forms

```bash
cd /                                  # Start at root
ls                                    # List organizations
cd "My Org"                           # Enter organization
cd "My Project/My App/forms"          # Navigate to forms
ls -l                                 # List forms with details
```

### Search for Items

```bash
find feedback                         # Find all items with "feedback"
grep -r email /                       # Search for "email" everywhere
```

### Manage Team Members

```bash
users list                            # See current members
users invite new@example.com --role member  # Invite new member
groups create "Support" --role member # Create support team
groups add-member grp_support user_123 # Add to team
assign user user_123 admin            # Promote to admin
```

### Create Custom Role

```bash
roles create "Form Manager" --base member  # Create role
roles grant role_formmgr forms:publish    # Grant publish
roles grant role_formmgr forms:delete     # Grant delete
roles info role_formmgr                   # Verify permissions
assign user user_alice role_formmgr       # Assign to user
```

---

## Keyboard Shortcuts (Web Terminal)

| Shortcut | Action |
|----------|--------|
| ↑ / ↓ | Navigate command history |
| Tab | Auto-complete commands/paths |
| Ctrl+C / Cmd+C | Copy selection |
| Ctrl+V / Cmd+V | Paste |
| Ctrl+L | Clear screen |
| Ctrl+A | Move to beginning of line |
| Ctrl+E | Move to end of line |
| Ctrl+U | Clear line |

---

## Tips & Tricks

### 1. Use Quotes for Paths with Spaces

```bash
cd "Customer Portal"                  # Correct
cd Customer Portal                    # Wrong (tries to cd to "Customer")
```

### 2. Use Aliases for Common Commands

```bash
alias myforms='cd /Acme/Portal/Support/forms && ls'
alias ll='ls -la'
myforms                               # Quick navigation
```

### 3. Check Permissions Before Actions

```bash
permissions check forms:delete        # Check before attempting
```

### 4. Use Absolute Paths in Scripts

```bash
cat /Org/Project/App/forms/"Contact" # Always works
cat "Contact"                         # Depends on current directory
```

### 5. Natural Language (if AI enabled)

```bash
show me all forms                     # AI interprets as: list forms
find feedback forms                   # AI interprets as: find feedback
```

---

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Authentication required` | Not logged in | `netpad login-key <key>` |
| `Permission denied` | Insufficient permissions | Check with `permissions me` |
| `No such directory` | Path doesn't exist | Verify with `ls` at each level |
| `Access denied: internal collection` | Trying to access system data | Use user-facing collections only |
| `AI interpretation unavailable` | AI not configured | Use structured commands |

---

## Security Notes

### Protected Collections

These collections are blocked from CLI access:
- `system.*`
- `audit_*`
- `logs`
- `_migrations`
- `sessions`
- `tokens`
- `api_keys`
- `config`
- `settings`

### Best Practices

1. **Least Privilege**: Assign minimum necessary permissions
2. **Use Groups**: Manage team access via groups, not individual roles
3. **Audit Regularly**: Review `users list` and `roles list` periodically
4. **Protect API Keys**: Never commit keys to git or share publicly
5. **Remove Unused Access**: Clean up old users and groups

---

## Resources

- **Full Documentation**: [CLI & Virtual Filesystem Guide](./CLI_VIRTUAL_FILESYSTEM.md)
- **RBAC Guide**: [RBAC CLI Guide](./RBAC_CLI_GUIDE.md)
- **Testing Guide**: [CLI Testing Guide](./CLI_TESTING_GUIDE.md)
- **Web Docs**: [docs.netpad.io](https://docs.netpad.io)
- **Support**: support@netpad.io
- **Issues**: [github.com/netpad/netpad/issues](https://github.com/netpad/netpad/issues)

---

## Quick Permission Reference

| Action | Required Permission | Who Has It |
|--------|---------------------|------------|
| View forms | `forms:read` | All roles |
| Create form | `forms:create` | member, admin, owner |
| Delete form | `forms:delete` | admin, owner (or custom) |
| Invite user | `members:invite` | admin, owner |
| Create group | `groups:create` | admin, owner |
| Assign role | `roles:assign` | admin, owner |
| View audit logs | `audit:read` | owner only |

---

*Print this reference or keep it handy for quick CLI usage!*
