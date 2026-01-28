/**
 * Tool registration for the NetPad ChatGPT App.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBrowseTemplates, registerSearchTemplates } from './browse.js';
import { registerCreateForm, registerModifyForm } from './create.js';
import { registerGetWorkflow, registerCreateWorkflow } from './workflow.js';

/**
 * Register all tools with the MCP server.
 */
export function registerTools(server: McpServer): void {
  // Phase 1: Browse and Search
  registerBrowseTemplates(server);
  registerSearchTemplates(server);

  // Phase 2: Create and Workflow tools
  registerCreateForm(server);
  registerModifyForm(server);
  registerGetWorkflow(server);
  registerCreateWorkflow(server);

  // Phase 3: Export tools (to be implemented)
  // registerExportToNetPad(server);
}
