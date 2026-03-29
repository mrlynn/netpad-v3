# Changelog

All notable changes to NetPad will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- RBAC Admin UI pages for role and permission management
- RBAC CLI commands in terminal for parity with admin UI
- Focus mode for form and workflow editors
- Simplified UI hook for adaptive interface complexity
- Moltboard integration with credentials support
- DualDeployDemo component on homepage
- Deep Link Import for Claude MCP integration
- Extension system with billing API routes
- Maximize functionality for terminal green button
- Fancy ASCII AI loader animation in terminal
- Enhanced Create buttons with template option
- In-app help content for RBAC features

### Changed
- Calm, low-contrast theme update
- Unified environment variables to NETPAD_PLATFORM_MODE
- Cloud-features moved to optional dependencies

### Fixed
- MCP server remote Vercel deployment configuration
- Force-dynamic added to API routes using cookies (17 routes)
- E2E test stability (networkidle → domcontentloaded)
- E2E test assertions for authenticated users
- Test user auto-approval to bypass waitlist redirect
- MongoDB service added to E2E tests for CI
- TypeScript build errors for Vercel production
- Terminal cursor visibility after opening
- Terminal traffic light buttons functionality
- Published button now opens PublishDialog
- Waitlist enforcement for /apps and /onboarding routes
- Subdomain rewrites exclude www and staging

### Documentation
- RBAC parity matrix with completion status
- RBAC Admin UI gap analysis
- CLI testing guide updates

## [3.1.0] - 2026-01-15

### Added
- RBAC (Role-Based Access Control) permission system
- RBAC types, APIs, and three-tier permission model
- Queryable Encryption support for sensitive fields
- Application versioning with semantic versioning
- Marketplace API for application publishing
- npm package integration for applications

### Changed
- Application-first model with component protection
- Breaking change detection for application contracts

## [3.0.0] - 2025-12-15

### Added
- Complete platform rewrite with Next.js 15
- AI-powered conversational forms
- RAG (Retrieval-Augmented Generation) with MongoDB Atlas Vector Search
- Knowledge-guided forms with document grounding
- Workflow automation engine with 25+ node types
- Visual workflow editor with ReactFlow
- 30+ field types in form builder
- Template gallery with 100+ templates
- Data Browser for MongoDB navigation
- Connection Vault with AES-256-GCM encryption
- MCP server for AI-assisted development
- CLI tools for package management

### Changed
- Complete UI refresh with Material UI
- MongoDB native driver instead of Mongoose
- Monorepo structure with workspace packages

---

## Package Releases

### @netpad/forms
- `3.0.0` - React component library with 28+ field types, wizard support

### @netpad/workflows  
- `3.0.0` - Workflow API client with execution management

### @netpad/mcp-server
- `3.0.0` - MCP server with 75+ tools for AI integration

### @netpad/cli
- `3.0.0` - CLI for package and application management

---

*For the complete commit history, see the [GitHub repository](https://github.com/mrlynn/netpad-v3).*
