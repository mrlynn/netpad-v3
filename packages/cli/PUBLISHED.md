# @netpad/cli - Published ✅

**Package:** `@netpad/cli`  
**Version:** 0.2.0  
**Published:** January 15, 2026  
**Status:** ✅ Published to npm

---

## Installation

### Global Installation
```bash
npm install -g @netpad/cli
```

### Using npx (No Installation Required)
```bash
npx @netpad/cli <command>
```

### Verify Installation
```bash
netpad --version
# or
npx @netpad/cli --version
```

---

## Available Commands

### Core Commands
- `netpad install <package>` - Install NetPad packages from npm
- `netpad search [query]` - Search npm registry for NetPad packages
- `netpad list` - List installed applications
- `netpad create-app <name>` - Scaffold new application packages

### Authentication
- `netpad login` - Authenticate with NetPad (API key, OAuth, Magic Link)
- `netpad logout` - Clear stored credentials
- `netpad whoami` - Show authentication status

### Utility
- `netpad version` - Show version information
- `netpad --help` - Show help

---

## Quick Start

```bash
# Install globally
npm install -g @netpad/cli

# Search for packages
netpad search

# Login to NetPad
netpad login --api-key <your-key> --api-url https://app.netpad.app

# Install a package
netpad install @netpad/app-customer-feedback

# Create a new app
netpad create-app my-app
```

---

## Documentation

- **README:** `packages/cli/README.md`
- **Testing:** `packages/cli/TEST_PLAN.md`
- **Publishing:** `packages/cli/PUBLISHING.md`

---

## npm Registry

- **Package:** https://www.npmjs.com/package/@netpad/cli
- **GitHub:** https://github.com/mrlynn/netpad-v3/tree/main/packages/cli

---

## Features

✅ Install packages from npm registry  
✅ Search for NetPad packages  
✅ Create new application packages  
✅ Authenticate with NetPad API  
✅ List installed applications  
✅ Support for API keys, OAuth, and Magic Link authentication  
✅ Profile management for multiple environments  

---

**Published Successfully!** 🎉
