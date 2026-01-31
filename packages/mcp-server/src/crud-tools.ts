/**
 * Direct CRUD Tools for NetPad MCP Server
 * 
 * These tools execute real API calls against the NetPad API when
 * NETPAD_API_KEY is configured. Unlike generation tools that output
 * code, these tools perform actual operations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getApiClient,
  getApiConfigStatus,
  ApiClientError,
  ApiKeyNotSetError,
} from './lib/api-client.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format an API error for tool output
 */
function formatApiError(error: unknown): string {
  if (error instanceof ApiKeyNotSetError) {
    return `❌ **API Key Not Configured**

${error.message}

**Quick Setup:**
\`\`\`bash
export NETPAD_API_KEY=np_live_your_key_here
\`\`\`

Then restart your MCP client (Claude Desktop, Cursor, etc.)`;
  }

  if (error instanceof ApiClientError) {
    return `❌ **API Error: ${error.code}**

${error.message}

${error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : ''}`;
  }

  if (error instanceof Error) {
    return `❌ **Error:** ${error.message}`;
  }

  return `❌ **Unknown Error:** ${String(error)}`;
}

/**
 * Create a success response with JSON data
 */
function successResponse(message: string, data?: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  let text = `✅ ${message}`;
  if (data !== undefined) {
    text += `\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create an error response
 */
function errorResponse(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: formatApiError(error) }],
  };
}

// ============================================================================
// REGISTER CRUD TOOLS
// ============================================================================

/**
 * Register all CRUD tools on the MCP server
 */
export function registerCrudTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // API STATUS TOOL
  // --------------------------------------------------------------------------

  server.tool(
    'api_status',
    'Check NetPad API configuration status. Shows if API key is set and the target API URL.',
    {},
    async () => {
      const status = getApiConfigStatus();
      
      if (status.configured) {
        return successResponse('API is configured', {
          configured: true,
          baseUrl: status.baseUrl,
          apiKeyPrefix: status.keyPrefix,
        });
      }

      return {
        content: [{
          type: 'text',
          text: `⚠️ **API Not Configured**

To use direct API tools, set your NetPad API key:

\`\`\`bash
export NETPAD_API_KEY=np_live_your_key_here
export NETPAD_API_URL=https://netpad.io  # Optional, defaults to netpad.io
\`\`\`

**Get your API key:** https://netpad.io/settings/api-keys

After setting the key, restart your MCP client.`,
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // FORM TOOLS
  // --------------------------------------------------------------------------

  server.tool(
    'form_list',
    'List forms from your NetPad organization. Requires NETPAD_API_KEY.',
    {
      projectId: z.string().optional().describe('Filter by project ID'),
      status: z.enum(['draft', 'published']).optional().describe('Filter by status'),
      search: z.string().optional().describe('Search by name or description'),
      page: z.number().optional().default(1).describe('Page number'),
      pageSize: z.number().optional().default(20).describe('Items per page (max 100)'),
    },
    async (params) => {
      try {
        const client = getApiClient();
        const result = await client.listForms({
          projectId: params.projectId,
          status: params.status,
          search: params.search,
          page: params.page,
          pageSize: params.pageSize,
        });

        return successResponse(
          `Found ${result.pagination.total} form(s)`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_get',
    'Get details of a specific form by ID or slug. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
    },
    async ({ formId }) => {
      try {
        const client = getApiClient();
        const form = await client.getForm(formId);

        return successResponse(
          `Form: ${form.name}`,
          form
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_create',
    'Create a new form in NetPad. Requires NETPAD_API_KEY.',
    {
      name: z.string().describe('Form name'),
      projectId: z.string().describe('Project ID to create the form in'),
      description: z.string().optional().describe('Form description'),
      slug: z.string().optional().describe('URL slug (auto-generated if not provided)'),
      fields: z.array(z.object({
        path: z.string().describe('Field path/identifier'),
        label: z.string().describe('Display label'),
        type: z.string().describe('Field type (short_text, email, number, etc.)'),
        required: z.boolean().optional().describe('Is field required'),
        placeholder: z.string().optional().describe('Placeholder text'),
        helpText: z.string().optional().describe('Help text'),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })).optional().describe('Options for select/radio/checkbox fields'),
        validation: z.object({
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
        }).optional().describe('Validation rules'),
      })).optional().describe('Form fields'),
    },
    async (params) => {
      try {
        const client = getApiClient();
        const form = await client.createForm({
          name: params.name,
          projectId: params.projectId,
          description: params.description,
          slug: params.slug,
          fields: params.fields as any,
        });

        return successResponse(
          `Created form: ${form.name} (${form.id})`,
          form
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_update',
    'Update an existing form. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
      name: z.string().optional().describe('New form name'),
      description: z.string().optional().describe('New description'),
      fields: z.array(z.object({
        path: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })).optional(),
        validation: z.object({
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
        }).optional(),
      })).optional().describe('Updated fields (replaces all fields)'),
    },
    async ({ formId, ...updates }) => {
      try {
        const client = getApiClient();
        const form = await client.updateForm(formId, {
          name: updates.name,
          description: updates.description,
          fields: updates.fields as any,
        });

        return successResponse(
          `Updated form: ${form.name}`,
          form
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_delete',
    'Delete a form and all its submissions. Requires NETPAD_API_KEY. This action cannot be undone.',
    {
      formId: z.string().describe('Form ID or slug to delete'),
    },
    async ({ formId }) => {
      try {
        const client = getApiClient();
        const result = await client.deleteForm(formId);

        return successResponse(
          `Deleted form: ${result.formId}`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_publish',
    'Publish a form to make it publicly accessible. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug to publish'),
    },
    async ({ formId }) => {
      try {
        const client = getApiClient();
        const form = await client.publishForm(formId);

        return successResponse(
          `Published form: ${form.name}`,
          {
            ...form,
            publicUrl: `https://netpad.io/f/${form.slug}`,
          }
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'form_unpublish',
    'Unpublish a form to make it private (draft). Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug to unpublish'),
    },
    async ({ formId }) => {
      try {
        const client = getApiClient();
        const form = await client.unpublishForm(formId);

        return successResponse(
          `Unpublished form: ${form.name}`,
          form
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  // --------------------------------------------------------------------------
  // SUBMISSION TOOLS
  // --------------------------------------------------------------------------

  server.tool(
    'submission_list',
    'List submissions for a form. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
      page: z.number().optional().default(1).describe('Page number'),
      pageSize: z.number().optional().default(20).describe('Items per page (max 100)'),
      startDate: z.string().optional().describe('Filter by start date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter by end date (ISO 8601)'),
      sortBy: z.string().optional().default('submittedAt').describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
    },
    async ({ formId, ...options }) => {
      try {
        const client = getApiClient();
        const result = await client.listSubmissions(formId, {
          page: options.page,
          pageSize: options.pageSize,
          startDate: options.startDate,
          endDate: options.endDate,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
        });

        return successResponse(
          `Found ${result.pagination.total} submission(s)`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'submission_get',
    'Get a single submission by ID. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
      submissionId: z.string().describe('Submission ID'),
    },
    async ({ formId, submissionId }) => {
      try {
        const client = getApiClient();
        const submission = await client.getSubmission(formId, submissionId);

        return successResponse(
          `Submission: ${submission.id}`,
          submission
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'submission_create',
    'Create a new submission for a form (submit form data). Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
      data: z.record(z.unknown()).describe('Form field values as key-value pairs'),
      metadata: z.object({
        referrer: z.string().optional(),
        customFields: z.record(z.unknown()).optional(),
      }).optional().describe('Optional metadata'),
    },
    async ({ formId, data, metadata }) => {
      try {
        const client = getApiClient();
        const result = await client.createSubmission(formId, {
          data,
          metadata,
        });

        return successResponse(
          `Created submission: ${result.submissionId}`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'submission_delete',
    'Delete a submission. Requires NETPAD_API_KEY. This action cannot be undone.',
    {
      formId: z.string().describe('Form ID or slug'),
      submissionId: z.string().describe('Submission ID to delete'),
    },
    async ({ formId, submissionId }) => {
      try {
        const client = getApiClient();
        const result = await client.deleteSubmission(formId, submissionId);

        return successResponse(
          `Deleted submission: ${result.submissionId}`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'submission_export',
    'Export submissions from a form in JSON or CSV format. Requires NETPAD_API_KEY.',
    {
      formId: z.string().describe('Form ID or slug'),
      format: z.enum(['json', 'csv']).optional().default('json').describe('Export format'),
      startDate: z.string().optional().describe('Filter by start date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter by end date (ISO 8601)'),
      limit: z.number().optional().default(1000).describe('Maximum submissions to export'),
    },
    async ({ formId, format, startDate, endDate, limit }) => {
      try {
        const client = getApiClient();
        
        // Fetch all submissions up to the limit
        const allSubmissions: any[] = [];
        let page = 1;
        const pageSize = Math.min(100, limit);
        
        while (allSubmissions.length < limit) {
          const result = await client.listSubmissions(formId, {
            page,
            pageSize,
            startDate,
            endDate,
            sortBy: 'submittedAt',
            sortOrder: 'desc',
          });
          
          allSubmissions.push(...result.data);
          
          if (result.data.length < pageSize || allSubmissions.length >= result.pagination.total) {
            break;
          }
          page++;
        }

        // Trim to limit
        const submissions = allSubmissions.slice(0, limit);

        if (format === 'csv') {
          // Generate CSV
          if (submissions.length === 0) {
            return successResponse('No submissions to export', { format: 'csv', count: 0 });
          }

          // Collect all unique data keys across submissions
          const allKeys = new Set<string>();
          submissions.forEach(s => {
            Object.keys(s.data || {}).forEach(k => allKeys.add(k));
          });
          
          const headers = ['id', 'submittedAt', ...Array.from(allKeys)];
          const rows = submissions.map(s => {
            return headers.map(h => {
              if (h === 'id') return s.id;
              if (h === 'submittedAt') return s.metadata?.submittedAt || '';
              const value = s.data?.[h];
              if (value === undefined || value === null) return '';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            });
          });

          // Escape CSV values
          const escapeCSV = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          };

          const csv = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(',')),
          ].join('\n');

          return {
            content: [{
              type: 'text',
              text: `✅ Exported ${submissions.length} submission(s) as CSV\n\n\`\`\`csv\n${csv}\n\`\`\``,
            }],
          };
        }

        // JSON format
        return successResponse(
          `Exported ${submissions.length} submission(s) as JSON`,
          {
            format: 'json',
            count: submissions.length,
            submissions,
          }
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  // --------------------------------------------------------------------------
  // SUBMISSION UPDATE TOOL
  // --------------------------------------------------------------------------
  
  // Note: The v1 API doesn't have a PATCH endpoint for submissions yet.
  // Adding a placeholder that explains this limitation.
  
  server.tool(
    'submission_update',
    'Update submission data. Note: This operation may not be supported by all NetPad API versions.',
    {
      formId: z.string().describe('Form ID or slug'),
      submissionId: z.string().describe('Submission ID'),
      data: z.record(z.unknown()).optional().describe('Updated form field values'),
      metadata: z.record(z.unknown()).optional().describe('Updated metadata'),
    },
    async ({ formId, submissionId }) => {
      // The v1 API doesn't support submission updates yet
      return {
        content: [{
          type: 'text',
          text: `⚠️ **Submission Update Not Supported**

The current NetPad API (v1) does not support updating submissions after creation.

Submissions are intended to be immutable records of form data.

**Alternatives:**
1. Delete the submission and create a new one with corrected data
2. Use the NetPad dashboard to manage submissions directly
3. Contact NetPad support if you need bulk correction features

**Form ID:** ${formId}
**Submission ID:** ${submissionId}`,
        }],
      };
    }
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getApiConfigStatus } from './lib/api-client.js';
