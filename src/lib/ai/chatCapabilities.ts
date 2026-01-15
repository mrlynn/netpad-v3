/**
 * Chat Assistant Capabilities Utility
 * 
 * Provides capability information extracted from helpContent.ts to keep the AI Chat Assistant
 * automatically aware of all NetPad features and capabilities.
 * 
 * This utility ensures that when capabilities are documented in helpContent.ts,
 * the chat assistant automatically knows about them.
 */

import { helpTopics } from '@/lib/helpContent';
import { HelpTopicId } from '@/types/help';

/**
 * Get capability summary for a specific topic from helpContent
 */
function getTopicSummary(topicId: HelpTopicId): string | null {
  const topic = helpTopics[topicId];
  if (!topic) return null;
  return `${topic.title}: ${topic.description}`;
}

/**
 * Get search forms capability details for system prompt
 * 
 * Extracts information from helpContent to ensure the assistant knows about search forms
 */
export function getSearchFormsCapability(): string {
  const topic = helpTopics['search-forms'];
  if (!topic) return '';
  
  // Build capability description from helpContent
  let details = `## Search Forms

${topic.description}

**Key Features:**
- Create search forms with formType: 'search' 
- Configure searchable fields with operators (equals, contains, between, etc.)
- Configure result display (table, cards, list layouts)
- Enable smart dropdowns that populate from actual data
- Control pagination and result actions (view, edit, delete)

**Search Form Templates:**
- Customer Search - Search by name, email, company, status, creation date
- Order Search - Filter by status, date range, customer, order number, total amount
- Support Ticket Search - Search by status, priority, category, reporter, date

**Form Types Available:**
- data-entry: Traditional forms for data collection
- search: Forms for filtering and querying data
- both: Forms that support both data entry and search
- conversational: AI-powered conversational data collection

When users ask about creating search or filter forms, suggest using formType: 'search' with searchConfig.`;
  
  return details;
}

/**
 * Get template gallery capability details
 * 
 * Extracts information from helpContent about the template gallery
 */
export function getTemplateGalleryCapability(): string {
  const topic = helpTopics['template-gallery'];
  if (!topic) return '';
  
  return `## Template Gallery

${topic.description}

**Features:**
- Browse templates by category (Business, Events, Feedback, Support, E-commerce, Healthcare, Finance, Education, Real Estate, Search Forms)
- Templates include fields, validation rules, and configuration
- Search form templates available for common use cases (Customer Search, Order Search, Support Ticket Search)
- Workflow templates for automation patterns
- Preview templates before applying
- Templates can be customized after selection`;
}

/**
 * Get conversational forms capability details
 * 
 * Extracts information from helpContent about conversational forms
 */
export function getConversationalFormsCapability(): string {
  const topic = helpTopics['conversational-forms'];
  if (!topic) return '';
  
  return `## Conversational Forms

${topic.description}

**Key Features:**
- Users chat with an AI assistant instead of filling out static fields
- Intelligent topic coverage ensures all required information is gathered
- Structured data extraction from natural language
- Configurable AI personas (professional, friendly, empathetic, etc.)
- Built-in templates: IT Helpdesk, Customer Feedback, Patient Intake, General Intake
- Custom templates can be created via Template Admin
- Configure extraction schemas, conversation limits, and RAG integration
- Conversational templates are accessed through Form Settings when conversational mode is enabled`;
}

/**
 * Get npm packages capability details
 * 
 * Extracts information from helpContent about npm package integration
 */
export function getNpmPackagesCapability(): string {
  const topic = helpTopics['npm-packages'];
  if (!topic) return '';
  
  return `## npm Package Integration

${topic.description}

**Key Features:**
- Publish NetPad applications as npm packages (@netpad/app-* or @your-org/netpad-app-*)
- Publish plugins as npm packages (@netpad/plugin-* or @your-org/netpad-plugin-*)
- Install packages via Web UI, CLI (npx @netpad/cli install), or direct npm install
- Automatic package discovery from npm registry (hourly sync)
- Dependency resolution for applications and plugins
- Official packages (@netpad/ scope) are automatically verified
- Community packages can be submitted for verification review

**Marketplace UI Features:**
- Source filter: Filter applications by source (Web Marketplace, npm Packages, or All Sources)
- Quick filter chips: Click chips in marketplace header to quickly filter by source
- npm badge: npm packages display a red "npm" badge to distinguish them
- Package name display: npm package names shown in monospace font
- Install from npm button: npm packages show "Install from npm" instead of "Import"
- Package info: Click npm packages to see detailed package information including npm package name

**Package Structure:**
- package.json with "netpad" field containing metadata
- dist/bundle.json with complete application bundle (forms, workflows, config)
- Follows semantic versioning (X.Y.Z format)
- Includes dependencies on other applications/plugins

**When to mention:**
- User asks about "publishing to npm" or "sharing via npm"
- User wants to "install from npm" or "use npm packages"
- User asks about "package management" or "dependency management"
- User wants to "create a plugin" or "extend NetPad capabilities"
- User asks about "filtering by source" or "finding npm packages" in marketplace
- User wants to know how to "distinguish npm packages" from web marketplace apps`;
}

/**
 * Get application contracts capability details
 * 
 * Extracts information from helpContent about application contracts and protection
 */
export function getApplicationContractsCapability(): string {
  const topic = helpTopics['application-contracts'];
  if (!topic) return '';
  
  return `## Application Contracts & Protection

${topic.description}

**Key Features:**
- Define explicit contracts for application public API (inputs, outputs, side effects, events, behaviors)
- Contract lifecycle: Draft → Active → Deprecated
- Breaking change detection with deterministic diffing
- Contract enforcement at release time (requires major version bump for breaking changes)
- Component protection: Lock forms/workflows to prevent accidental modifications
- Contract comparison: Compare versions to see breaking/non-breaking changes
- Migration guides: Automatic generation of migration instructions

**Contract Components:**
- Inputs: What consumers must provide (types, required/optional, constraints)
- Outputs: What consumers can rely on (guaranteed fields)
- Side Effects: What the application does (writes, API calls, notifications)
- Events: Events emitted (what external systems can subscribe to)
- Behaviors: Workflows that are part of the public contract

**Breaking Changes:**
- Removed inputs/outputs
- Type changes (string → number)
- Required field changes (optional → required)
- Removed side effects, events, or behaviors
- Removed stability guarantees

**Component Protection:**
- Lock forms/workflows explicitly
- Specify editable fields (if any)
- Visual indicators in form/workflow editors
- Only owners/admins can lock/unlock

**When to mention:**
- User asks about "preventing breaking changes" or "version compatibility"
- User wants to "lock components" or "protect forms/workflows"
- User asks about "contract enforcement" or "breaking change detection"
- User wants to "compare contract versions" or "see what changed"
- User asks about "upgrade safety" or "migration guides"
- User wants to "define API contracts" for their applications`;
}
