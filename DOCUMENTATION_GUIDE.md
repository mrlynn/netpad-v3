# NetPad Documentation Guide

This guide explains the documentation structure after the February 2026 consolidation.

## Overview

NetPad documentation is now split into two locations:

1. **`/docs/`** - Public-facing documentation (committed to git)
2. **`.netpad-internal/`** - Internal documentation (gitignored, not published)

## Public Documentation (`/docs/`)

**Location:** [/docs/](./docs/)
**Purpose:** User and developer-facing documentation
**Published:** Yes (committed to repository)

### What's Here

- **[API.md](./docs/API.md)** - REST API reference
- **[DEPLOY.md](./docs/DEPLOY.md)** - Production deployment guide
- **[ARCHITECTURE-PRODUCTION.md](./docs/ARCHITECTURE-PRODUCTION.md)** - Production architecture
- **[WORKFLOW-TRIGGERING-ARCHITECTURE.md](./docs/WORKFLOW-TRIGGERING-ARCHITECTURE.md)** - Workflow system
- **[QUERYABLE_ENCRYPTION_DESIGN.md](./docs/QUERYABLE_ENCRYPTION_DESIGN.md)** - Encryption features
- **[APPLICATION_PORTABILITY_SPEC.md](./docs/APPLICATION_PORTABILITY_SPEC.md)** - Standalone export
- **[DEPLOYMENT_MODES_SPEC.md](./docs/DEPLOYMENT_MODES_SPEC.md)** - Deployment modes
- **[CLI/](./docs/CLI/)** - Command-line interface documentation
- **[knowledge-platform/](./docs/knowledge-platform/)** - RAG/Knowledge Platform features

**Total:** 27 markdown files

## Internal Documentation (`.netpad-internal/`)

**Location:** `.netpad-internal/` (in your local workspace only)
**Purpose:** Strategic planning, internal specs, operations
**Published:** No (gitignored)

### What's Here

#### AI Context
- **[CLAUDE.md](.netpad-internal/ai-context/CLAUDE.md)** - Canonical Memory Bank for AI assistants

#### Strategic Planning
- **[strategic/](.netpad-internal/strategic/)** - Strategic planning documents (100+ files)
  - Platform capabilities and strategy analysis
  - Navigation and UX redesign specs
  - Implementation plans and summaries
  - Template enhancement guidance

#### Development Phases
- **[phases/](.netpad-internal/phases/)** - Phase 1-10 documentation
  - Implementation decisions
  - Testing guides
  - Status tracking

#### Operations
- **[operations/](.netpad-internal/operations/)** - Internal operations guides
  - Collaborator app setup
  - Slack integration
  - Status page configuration

#### Specifications
- **[internal-specs/](.netpad-internal/internal-specs/)** - Internal technical specs (40+ files)
  - RBAC schema
  - Navigation improvements
  - Marketplace and applications
  - Integration specs

#### Memory Bank
- **[memory-bank/](.netpad-internal/memory-bank/)** - Project context (6 files)
  - Active context
  - Product strategy
  - Progress tracking

#### Testing
- **[testing/](.netpad-internal/testing/)** - Internal testing documentation

**Total:** 214 markdown files

## Root Documentation

**Location:** Repository root
**Purpose:** Essential public documentation

- **[README.md](./README.md)** - Main project overview
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](./SECURITY.md)** - Security policies
- **[QUICK-START-RAG.md](./QUICK-START-RAG.md)** - RAG quick start guide

## Migration Summary

For details about the consolidation that created this structure, see:
**[.netpad-internal/MIGRATION_SUMMARY.md](.netpad-internal/MIGRATION_SUMMARY.md)**

## Finding Documentation

### For Public/User Documentation
→ Check `/docs/` directory

### For Internal Strategy/Planning
→ Check `.netpad-internal/strategic/`

### For AI Assistant Context
→ Check `.netpad-internal/ai-context/CLAUDE.md`

### For Implementation Phases
→ Check `.netpad-internal/phases/`

### For Operations Setup
→ Check `.netpad-internal/operations/`

## Important Notes

1. **`.netpad-internal/` is NOT committed to git** - It's gitignored for privacy
2. **Public docs only in `/docs/`** - Everything in `/docs/` may be published
3. **AI assistants use `.netpad-internal/ai-context/CLAUDE.md`** - This is the canonical context
4. **Git history preserved** - All moved files retain their git history

## Questions?

- For public documentation issues: Submit a GitHub issue
- For internal documentation: Check `.netpad-internal/README.md` for navigation

---

**Last Updated:** February 2, 2026
**Migration Date:** February 2, 2026
