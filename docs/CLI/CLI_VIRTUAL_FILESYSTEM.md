# NetPad CLI & Virtual Filesystem

**Version:** 1.0.0
**Last Updated:** January 31, 2026

## Overview

NetPad provides a powerful command-line interface (CLI) and virtual filesystem that allows you to navigate, manage, and interact with your forms, workflows, and data using familiar Unix-like commands. This works both as a standalone CLI tool (`@netpad/cli`) and within the integrated web terminal.

## Table of Contents

1. [Installation](#installation)
2. [Authentication](#authentication)
3. [Virtual Filesystem Structure](#virtual-filesystem-structure)
4. [Navigation Commands](#navigation-commands)
5. [File Operations](#file-operations)
6. [Search & Discovery](#search--discovery)
7. [RBAC Commands](#rbac-commands)
8. [Web Terminal](#web-terminal)
9. [AI-Powered Natural Language](#ai-powered-natural-language)
10. [Examples & Use Cases](#examples--use-cases)

---

## Installation

### NPM Package

Install the CLI globally:

```bash
npm install -g @netpad/cli
```

Or use with npx:

```bash
npx @netpad/cli
```

### Web Terminal

Access the web terminal at [netpad.io/terminal](https://netpad.io/terminal) (when logged in to NetPad Cloud).

---

## Authentication

### API Key Authentication (Recommended for CLI)

1. Generate an API key at [netpad.io/settings/api](https://netpad.io/settings/api)
2. Login with the key:

```bash
netpad login-key <your-api-key>
```

### OAuth Authentication (Browser-based)

For interactive browser-based login:

```bash
netpad login
```

### Check Authentication Status

```bash
netpad whoami
```

Output:
```
✓ Authenticated

  API Key:  np_live_abc123...xyz9
  API URL:  https://api.netpad.io
  Org ID:   org_abc123
```

---

## Virtual Filesystem Structure

NetPad organizes your resources in a hierarchical filesystem structure:

```
/
├── <organization-name>/
│   ├── <project-name>/
│   │   ├── <application-name>/
│   │   │   ├── forms/
│   │   │   │   ├── Contact Form
│   │   │   │   ├── User Registration
│   │   │   │   └── ...
│   │   │   ├── workflows/
│   │   │   │   ├── Email Notification
│   │   │   │   ├── Data Processing
│   │   │   │   └── ...
│   │   │   ├── templates/
│   │   │   │   └── ...
│   │   │   └── data/
│   │   │       ├── form_submissions
│   │   │       ├── users
│   │   │       └── <custom-collections>
│   │   └── ...
│   └── ...
└── ...
```

### Filesystem Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 0 | Root | All organizations you have access to | `/` |
| 1 | Organization | Your organization | `/Acme Corp` |
| 2 | Project | Project within org | `/Acme Corp/Customer Portal` |
| 3 | Application | Application within project | `/Acme Corp/Customer Portal/Support` |
| 4 | Category | Resource type (forms, workflows, templates, data) | `/Acme Corp/Customer Portal/Support/forms` |
| 5 | Item | Specific form, workflow, or data collection | `/Acme Corp/Customer Portal/Support/forms/Contact Form` |

---

## Navigation Commands

### `pwd` - Print Working Directory

Show your current location in the filesystem:

```bash
pwd
```

Output:
```
/Acme Corp/Customer Portal/Support/forms
```

### `ls` - List Contents

List items in the current directory or a specified path:

```bash
ls                          # List current directory
ls /                        # List all organizations
ls /Acme Corp              # List projects in organization
ls forms                    # List forms in current context
ls -l                       # Long format with metadata
ls -la                      # Long format, including hidden items
```

**Example output:**

```bash
$ ls /Acme Corp/Customer Portal/Support/forms

Contact Form        User Registration       Bug Report
Feedback Survey     Feature Request         Customer Onboarding
```

**Long format (`ls -l`):**

```
form         Contact Form
form         User Registration
workflow     Email Notification
workflow     Data Processing
```

### `cd` - Change Directory

Navigate to a different location:

```bash
cd /                                    # Go to root
cd ~                                    # Go to home (root)
cd ..                                   # Go up one level
cd /Acme Corp                          # Absolute path
cd "Customer Portal"                    # Relative path (use quotes for spaces)
cd forms                                # Navigate to forms category
```

### `tree` - Show Directory Tree

Display hierarchical structure:

```bash
tree                    # Show tree from current location
tree /Acme Corp         # Show tree from specific path
tree -d 3               # Limit depth to 3 levels
```

**Example output:**

```
/Acme Corp
├── Customer Portal/
│   ├── Support/
│   │   ├── forms/
│   │   ├── workflows/
│   │   ├── templates/
│   │   └── data/
│   └── Marketing/
│       ├── forms/
│       └── workflows/
└── Internal Tools/
    └── HR/
        ├── forms/
        └── workflows/
```

---

## File Operations

### `cat` - View File Contents

Display details of a form, workflow, or data document:

```bash
cat "Contact Form"
cat /Acme Corp/Customer Portal/Support/forms/"Contact Form"
cat --format json "Contact Form"        # JSON format
cat --format raw "Contact Form"         # Raw data
```

**Example output:**

```
Contact Form

ID:          form_abc123
Created:     1/15/2026
Updated:     1/30/2026
Fields:      8
Published:   Yes
Description: Customer contact and inquiry form

Fields:
  1. Full Name (text)
  2. Email Address (email)
  3. Phone Number (phone)
  4. Subject (text)
  5. Message (textarea)
  6. Priority (select)
  7. Department (select)
  8. Preferred Contact Method (radio)
```

### `find` - Search for Items

Find items by name pattern:

```bash
find contact                           # Find items matching "contact"
find "*.form"                          # Find all forms
find feedback                          # Find items with "feedback" in name
```

**Example output:**

```
/Acme Corp/Customer Portal/Support/forms/Contact Form
/Acme Corp/Marketing/Lead Generation/forms/Contact Us
/Acme Corp/Internal Tools/HR/forms/Employee Contact Update
```

### `grep` - Search Within Content

Search for text within forms and workflows:

```bash
grep "email" "Contact Form"            # Search within a specific form
grep -i "feedback" .                   # Case-insensitive search in current directory
grep -r "approval" /                   # Recursive search from root
```

**Example output:**

```
forms/Contact Form: Email Address (email field)
forms/User Registration: email validation required
workflows/Email Notification: Send email to support@acme.com
```

---

## Search & Discovery

### Global Search

Search across all forms, workflows, and templates:

```bash
search contact                         # Search for "contact"
search "customer feedback"             # Multi-word search
```

**Example output:**

```
Search results for "contact"

Forms:
  • Contact Form
  • Contact Us
  • Emergency Contact

Workflows:
  • Contact Admin Notification
  • Update Contact List
```

---

## RBAC Commands

NetPad includes comprehensive Role-Based Access Control (RBAC) commands. See [RBAC_CLI_GUIDE.md](./RBAC_CLI_GUIDE.md) for detailed documentation.

Quick reference:

```bash
users list                             # List organization members
groups list                            # List groups
roles list                             # List roles
permissions me                         # Show your permissions
assign user <userId> <role>            # Assign role to user
```

---

## Web Terminal

### Accessing the Terminal

1. Log in to NetPad Cloud
2. Navigate to [/terminal](https://netpad.io/terminal)
3. The terminal automatically authenticates with your session

### Terminal Features

#### Interactive Shell

The web terminal provides a full interactive shell with:

- **Command history** - Use ↑/↓ arrows to navigate history
- **Tab completion** - Press Tab to autocomplete commands and paths
- **Aliases** - Create command shortcuts
- **Environment variables** - Set and use variables

#### Shell Commands

```bash
# Aliases
alias ll='ls -la'                      # Create alias
alias                                  # List all aliases
unalias ll                             # Remove alias

# Environment variables
export PROJECT="Customer Portal"       # Set variable
echo $PROJECT                          # Use variable
env                                    # List all variables
```

#### Copy & Paste

- **Copy**: Select text and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)
- **Paste**: Cmd+V (Mac) or Ctrl+V (Windows/Linux)

---

## AI-Powered Natural Language

### Natural Language Commands

When AI is configured, the terminal can interpret natural language commands:

```bash
show me all forms                      # Interpreted as: list forms
find forms with feedback               # Interpreted as: find feedback
what permissions do I have             # Interpreted as: permissions me
create a contact form                  # Interpreted as: create form "contact"
```

### AI Interpretation

The AI interprets your intent and shows you the equivalent command:

```
💡 Did you mean: list forms

Forms
...
```

### Fallback Behavior

If AI is not configured:

```
Command not recognized: "show me all forms"

⚠ AI interpretation unavailable.
Use help to see available commands.
```

---

## Examples & Use Cases

### Example 1: Navigate to a Form and View Details

```bash
$ cd /Acme Corp/Customer Portal/Support/forms
$ ls
Contact Form    User Registration    Bug Report

$ cat "Contact Form"
Contact Form

ID:          form_abc123
Created:     1/15/2026
Fields:      8
Published:   Yes
```

### Example 2: Search for Forms Across All Projects

```bash
$ find feedback
/Acme Corp/Customer Portal/Support/forms/Feedback Survey
/Acme Corp/Marketing/Campaigns/forms/Campaign Feedback
/Acme Corp/Internal Tools/HR/forms/Employee Feedback
```

### Example 3: Browse Data Collections

```bash
$ cd /Acme Corp/Customer Portal/Support/data
$ ls
form_submissions    users    support_tickets

$ cd form_submissions
$ ls -l
document     67890abc123def456789
document     67890def456abc123789
document     67890123abc456def789
...

$ cat 67890abc123def456789
{
  "_id": "67890abc123def456789",
  "formId": "form_abc123",
  "submittedAt": "2026-01-30T14:23:10Z",
  "data": {
    "fullName": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

### Example 4: Check Permissions Before Creating a Form

```bash
$ permissions check forms:create
✓ You have permission: forms:create

$ permissions me
Your Permissions

User: john@acme.com
Organization Role: member

Effective Permissions (24)
  forms:
    ✓ forms:read
    ✓ forms:create
    ✓ forms:update
  ...
```

### Example 5: Use Natural Language with AI

```bash
$ show me all my forms
💡 Did you mean: list forms

Forms

ID                        Name                            Fields
──────────────────────────────────────────────────────────────
form_abc123              Contact Form                    8
form_def456              User Registration              12
form_ghi789              Feedback Survey                 6

Showing 3 form(s)
```

### Example 6: Interactive Shell Session

```bash
$ alias forms='cd /Acme Corp/Customer Portal/Support/forms'
$ export DEPT=Support

$ forms
$ pwd
/Acme Corp/Customer Portal/Support/forms

$ ls | grep -i contact
Contact Form
Contact Us
Emergency Contact
```

---

## Command Reference

### Navigation

| Command | Description | Example |
|---------|-------------|---------|
| `pwd` | Print working directory | `pwd` |
| `ls [path]` | List directory contents | `ls`, `ls -l`, `ls /` |
| `cd <path>` | Change directory | `cd forms`, `cd ..`, `cd /` |
| `tree [path]` | Show directory tree | `tree`, `tree -d 2` |

### File Operations

| Command | Description | Example |
|---------|-------------|---------|
| `cat <file>` | View file/item details | `cat "Contact Form"` |
| `find <pattern>` | Search for items | `find contact` |
| `grep <pattern> <file>` | Search within content | `grep email .` |

### Shell Utilities

| Command | Description | Example |
|---------|-------------|---------|
| `alias [name=cmd]` | Create/list aliases | `alias ll='ls -l'` |
| `unalias <name>` | Remove alias | `unalias ll` |
| `export <var=value>` | Set environment variable | `export ORG=Acme` |
| `env` | List environment variables | `env` |
| `echo <text>` | Print text | `echo $PROJECT` |

### RBAC

| Command | Description | Example |
|---------|-------------|---------|
| `users list` | List members | `users list` |
| `groups list` | List groups | `groups list` |
| `roles list` | List roles | `roles list` |
| `permissions me` | Show your permissions | `permissions me` |
| `assign <user> <role>` | Assign role | `assign user123 admin` |

### Help & Info

| Command | Description | Example |
|---------|-------------|---------|
| `help` | Show help | `help` |
| `help <topic>` | Show topic help | `help form-builder` |
| `help search <query>` | Search help topics | `help search workflows` |
| `whoami` | Show auth status | `whoami` |

---

## Security & Access Control

### Collection Blocking

The virtual filesystem blocks access to internal/system collections:

- `system.*` - MongoDB system collections
- `audit_*` - Audit logs
- `logs` - Application logs
- `_migrations` - Database migrations
- `sessions` - User sessions
- `tokens` - Auth tokens
- `api_keys` - API keys
- `config` - Configuration data
- `settings` - Settings

Attempting to access these collections results in:

```
Access denied: internal collection
```

### Permission Requirements

All filesystem operations respect RBAC permissions:

- **Read operations** (`ls`, `cat`, `find`, `grep`) - Require `read` permission on the resource type
- **Write operations** (`create`, `move`, `copy`) - Require `create` and `update` permissions
- **Delete operations** - Require `delete` permission

---

## Troubleshooting

### Authentication Issues

**Problem:** `Authentication required` or `Session expired`

**Solution:**
```bash
netpad login-key <your-api-key>
```

### Path Not Found

**Problem:** `No such directory` or `Not found`

**Solution:**
- Verify the path with `ls` at each level
- Use quotes for paths with spaces: `cd "Customer Portal"`
- Use absolute paths: `cd /Acme Corp/Project/App`

### Permission Denied

**Problem:** `Access denied` or `You do NOT have permission`

**Solution:**
- Check your permissions: `permissions me`
- Contact your organization admin to request the required role/permission

### AI Not Working

**Problem:** `AI interpretation unavailable`

**Solution:**
- This is expected if AI is not configured on the server
- Use structured commands instead: `list forms` instead of "show me all forms"
- Refer to `help` for available commands

---

## Best Practices

### 1. Use Absolute Paths for Scripts

When writing scripts or automation, use absolute paths:

```bash
# Good
cat /Acme Corp/Customer Portal/Support/forms/"Contact Form"

# Avoid (context-dependent)
cat "Contact Form"
```

### 2. Quote Paths with Spaces

Always quote paths containing spaces:

```bash
cd "Customer Portal"
cat "Contact Form"
ls "/Acme Corp/Customer Portal"
```

### 3. Check Permissions First

Before attempting operations, verify you have the required permissions:

```bash
permissions check forms:create
# Then proceed with creating forms
```

### 4. Use Aliases for Common Operations

Set up aliases for frequently used paths:

```bash
alias support='cd /Acme Corp/Customer Portal/Support'
alias myforms='cd /Acme Corp/Customer Portal/Support/forms && ls'
```

### 5. Leverage Natural Language (When Available)

Use natural language for exploratory work:

```bash
show me all feedback forms
find forms created last month
what can I do with workflows
```

---

## Next Steps

- [RBAC CLI Guide](./RBAC_CLI_GUIDE.md) - Detailed RBAC command documentation
- [CLI Testing Guide](./CLI_TESTING_GUIDE.md) - Testing scenarios and examples
- [API Reference](./API_REFERENCE.md) - Programmatic access to NetPad APIs

---

*For support or questions, visit [docs.netpad.io](https://docs.netpad.io) or contact support@netpad.io*
