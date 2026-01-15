# @netpad/cli v0.2.0 Release Notes

**Release Date:** January 15, 2026  
**Status:** ✅ Published to npm

---

## What's New

### npm Integration Support
- ✅ **Install Command** - Install NetPad packages directly from npm registry
- ✅ **Search Command** - Search npm registry for NetPad packages
- ✅ **Updated APIs** - Commands now use new npm integration endpoints

### Enhanced Features
- ✅ **Dependency Resolution** - Automatic installation of package dependencies
- ✅ **Version Support** - Install specific package versions
- ✅ **Overwrite Option** - Update existing applications with `--overwrite`
- ✅ **Source Filtering** - Search results show official vs community packages

### Authentication
- ✅ **Multiple Methods** - API key, OAuth (Google/GitHub), Magic Link
- ✅ **Profile Support** - Manage multiple environments (production, staging)
- ✅ **Session Management** - Store and manage credentials securely

---

## Installation

```bash
# Global installation
npm install -g @netpad/cli

# Or use with npx (no installation)
npx @netpad/cli <command>
```

---

## Quick Start

```bash
# Search for packages
netpad search

# Install a package
netpad install @netpad/app-customer-feedback

# Create a new app
netpad create-app my-app

# Login to NetPad
netpad login
```

---

## Commands

| Command | Description |
|---------|-------------|
| `install <package>` | Install NetPad package from npm |
| `search [query]` | Search npm registry |
| `list` | List installed applications |
| `create-app <name>` | Scaffold new application |
| `login` | Authenticate with NetPad |
| `logout` | Clear credentials |
| `whoami` | Show auth status |
| `version` | Show version info |

---

## Breaking Changes

None - This is a feature release with backward compatibility.

---

## Bug Fixes

- Fixed install command to use new API response format
- Fixed search command to handle query parameters correctly
- Improved error handling for network issues

---

## Documentation

- **README:** Complete usage guide
- **TEST_PLAN.md:** Comprehensive testing guide
- **PUBLISHING.md:** Publishing instructions
- **PUBLISHED.md:** Publication confirmation

---

## Links

- **npm:** https://www.npmjs.com/package/@netpad/cli
- **GitHub:** https://github.com/mrlynn/netpad-v3/tree/main/packages/cli

---

**Thank you for using @netpad/cli!** 🚀
