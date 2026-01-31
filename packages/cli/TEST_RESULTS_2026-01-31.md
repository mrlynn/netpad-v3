# CLI Testing Results - 2026-01-31

**Tester:** Moltbot
**Environment:** macOS, Node.js 25.5.0
**CLI Version:** 0.3.0

## Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Basic Commands | 3 | 0 | version, help, whoami work |
| Search | 0 | 1 | Missing --api-url option |
| RBAC Commands | 1 | 4 | Only permissions list works locally |
| Shell | - | - | Not tested (needs server) |

## Detailed Results

### ✅ PASSING

1. **version** - Works correctly
   ```
   NetPad CLI
   Version: 0.3.0
   https://netpad.app
   ```

2. **--help** - All commands show help correctly

3. **whoami** - Works with stored credentials
   ```
   ✓ Authenticated
   API Key: np_live_...AyaP
   ```

4. **permissions list** - Shows all available permissions (built-in, no API needed)

### ❌ FAILING / BUGS FOUND

#### Bug 1: Search command missing --api-url option

**File:** `src/index.ts` line ~80
**Issue:** The search command handler accepts `options.apiUrl` but the commander config doesn't define the `--api-url` option.

**Current:**
```typescript
program
  .command('search')
  .option('-t, --type <type>', 'Package type: application, plugin, or all', 'all')
  .option('--verified', 'Only show verified packages')
  .option('--limit <number>', 'Limit results', '20')
  .action(searchCommand);
```

**Should be:**
```typescript
program
  .command('search')
  .option('-t, --type <type>', 'Package type: application, plugin, or all', 'all')
  .option('--verified', 'Only show verified packages')
  .option('--limit <number>', 'Limit results', '20')
  .option('--api-url <url>', 'NetPad API URL')
  .option('--api-key <key>', 'NetPad API key')
  .action(searchCommand);
```

#### Bug 2: Default API URL is wrong

**File:** `src/commands/search.ts` line 24
**Issue:** Default URL `https://app.netpad.app` doesn't exist

**Current:**
```typescript
const apiUrl = auth?.apiUrl || process.env.NETPAD_API_URL || 'https://app.netpad.app';
```

**Should be:**
```typescript
const apiUrl = auth?.apiUrl || process.env.NETPAD_API_URL || 'https://netpad.io';
```

#### Bug 3: RBAC commands fail when server unreachable

**Issue:** All RBAC commands (users, groups, roles, assign, unassign) return `fetch failed` when the configured API URL is unreachable.

**Expected:** Better error message like "Cannot connect to NetPad API at http://localhost:3000"

### ⚠️ NOT TESTED (Server Required)

- `shell` command (interactive mode)
- `install` command
- `list` command
- RBAC commands against a running server
- Web terminal

## Recommendations

1. **Fix search command options** - Add --api-url and --api-key
2. **Fix default API URL** - Use https://netpad.io
3. **Improve error messages** - Show helpful connection errors
4. **Add connection test** - Before RBAC commands, verify API is reachable
5. **Add --offline flag** - For commands that can work locally

## Testing Notes

- Local dev server (`npm run dev`) wouldn't start properly - connection refused despite "Ready" message
- Production testing limited due to different API key/org configuration
- Need manual browser testing for web terminal

## Next Steps

1. Fix the bugs identified above
2. Get dev server running for full testing
3. Test shell/interactive mode
4. Test against production with valid credentials
