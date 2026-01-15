# @netpad/cli

NetPad CLI tool for managing applications and plugins from npm.

## Features

- **Install packages** from npm registry directly into NetPad
- **Search** for NetPad packages on npm
- **List** installed applications in your organization
- **Create** new application packages with scaffolding
- **Authenticate** with NetPad API using API keys or session tokens
- **Manage profiles** for different environments (production, staging, etc.)

## Installation

```bash
npm install -g @netpad/cli
```

Or use with npx:

```bash
npx @netpad/cli <command>
```

## Commands

### Login

Authenticate with NetPad and store credentials:

```bash
netpad login
netpad login --api-key np_live_xxx
netpad login --api-key np_live_xxx --org org_xxx --project proj_xxx
netpad login --profile production  # Use named profile
```

The login command will:
- Verify your API key
- Optionally select organization and project
- Store credentials in `~/.netpad/config.json`

### Logout

Clear stored credentials:

```bash
netpad logout
```

### Whoami

Show current authentication status:

```bash
netpad whoami
```

### Install

Install a NetPad application or plugin from npm:

```bash
netpad install @netpad/app-customer-feedback
netpad install @netpad/app-customer-feedback --version 1.0.0
netpad install @netpad/app-customer-feedback --org org_xxx --project proj_xxx
netpad install @netpad/app-customer-feedback --overwrite  # Update existing
```

Options:
- `--version <version>` - Package version (default: latest)
- `--org <orgId>` - Organization ID (overrides config)
- `--project <projectId>` - Project ID (overrides config)
- `--overwrite` - Overwrite existing application/plugin
- `--no-deps` - Skip installing dependencies (default: dependencies are installed)
- `--api-url <url>` - NetPad API URL (overrides config)
- `--api-key <key>` - NetPad API key (overrides config)

**Features:**
- Automatically resolves and installs package dependencies
- Creates Application entity in your NetPad organization
- Imports all forms, workflows, and connections from the package
- Shows installation status and any warnings

**Note:** If you've run `netpad login`, you don't need to provide `--org`, `--project`, or `--api-key` every time.

### List

List installed applications:

```bash
netpad list
netpad list --org org_xxx  # Override org from config
```

### Search

Search for NetPad packages on npm:

```bash
netpad search                    # Search all NetPad packages
netpad search "customer"         # Search with query
netpad search --type application # Only applications
netpad search --type plugin --verified  # Only verified plugins
```

Options:
- `[query]` - Search query (optional)
- `--type <type>` - Package type: application, plugin, or all (default: all)
- `--verified` - Only show verified packages
- `--limit <number>` - Limit results (default: 20)

The search command queries the npm registry for packages with NetPad keywords (`netpad-app`, `netpad-plugin`) and displays package information including:
- Package name and version
- Description
- Type (Application or Plugin)
- Verification status (Official/Verified/Community)
- Category and tags

### Create App

Scaffold a new NetPad application package:

```bash
netpad create-app customer-feedback
netpad create-app my-app --scope @myorg --dir ./apps
```

Options:
- `--dir <directory>` - Output directory (default: current directory)
- `--scope <scope>` - npm scope (default: @netpad)

## Authentication

The CLI supports multiple ways to authenticate:

1. **Login command** (recommended): `netpad login` - Stores credentials in `~/.netpad/config.json`
2. **Command-line options**: `--api-key`, `--org`, `--project` - Override config
3. **Environment variables**: `NETPAD_API_KEY`, `NETPAD_ORG_ID`, `NETPAD_PROJECT_ID`

Priority order: CLI options > Environment variables > Config file

### Profiles

You can use named profiles for different environments:

```bash
netpad login --profile production --api-key np_live_xxx
netpad login --profile staging --api-key np_test_xxx
```

Then switch between profiles by setting `currentProfile` in the config file.

## Environment Variables

- `NETPAD_API_URL` - NetPad API URL
- `NETPAD_API_KEY` - NetPad API key
- `NETPAD_ORG_ID` - Default organization ID
- `NETPAD_PROJECT_ID` - Default project ID

**Note:** These are overridden by stored config from `netpad login`.

## Development

```bash
cd packages/cli
npm install
npm run build
npm link  # Link globally for testing
```
