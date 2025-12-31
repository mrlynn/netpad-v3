/**
 * OpenAPI Specification Endpoint
 *
 * GET /api/v1/openapi.json - Returns OpenAPI 3.0 specification
 */

import { NextRequest, NextResponse } from 'next/server';

const getBaseUrl = () => {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.netpad.io';
};

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'NetPad API',
      version: '1.0.0',
      description: `
The NetPad API allows you to programmatically manage forms and submissions.

## Authentication

All API requests require authentication using an API key. Include your API key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer np_live_xxxxxxxxxxxxxxxx
\`\`\`

## Rate Limits

- **1,000 requests per hour** (default)
- **10,000 requests per day** (default)

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per hour
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets

## Environments

- **Live keys** (\`np_live_\`): For production use
- **Test keys** (\`np_test_\`): For testing, can submit to draft forms

## Errors

All errors follow this format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "requestId": "uuid"
}
\`\`\`
      `,
      contact: {
        name: 'NetPad Support',
        email: 'support@netpad.io',
        url: 'https://docs.netpad.io',
      },
    },
    servers: [
      {
        url: baseUrl,
        description: 'Production server',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          description: 'Returns the health status of the API and its dependencies. Used by monitoring services.',
          operationId: 'getHealth',
          security: [],
          responses: {
            '200': {
              description: 'System is healthy or degraded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'System is unhealthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/forms': {
        get: {
          tags: ['Forms'],
          summary: 'List forms',
          description: 'Returns a paginated list of forms for your organization.',
          operationId: 'listForms',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Page number',
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
              description: 'Items per page',
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['draft', 'published'] },
              description: 'Filter by form status',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search by form name or description',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FormListResponse' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimitExceeded' },
          },
        },
        post: {
          tags: ['Forms'],
          summary: 'Create a form',
          description: 'Creates a new form in draft status.',
          operationId: 'createForm',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateFormRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Form created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FormResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '409': {
              description: 'Duplicate slug',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/forms/{formId}': {
        get: {
          tags: ['Forms'],
          summary: 'Get a form',
          description: 'Returns details about a specific form including its fields.',
          operationId: 'getForm',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Form ID or slug',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FormDetailResponse' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          tags: ['Forms'],
          summary: 'Update a form',
          description: 'Updates form details. Use status: "published" to publish.',
          operationId: 'updateForm',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateFormRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Form updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FormResponse' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Forms'],
          summary: 'Delete a form',
          description: 'Permanently deletes a form and all its submissions.',
          operationId: 'deleteForm',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Form deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          deleted: { type: 'boolean', example: true },
                          formId: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/forms/{formId}/submissions': {
        get: {
          tags: ['Submissions'],
          summary: 'List submissions',
          description: 'Returns a paginated list of form submissions.',
          operationId: 'listSubmissions',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
            },
            {
              name: 'startDate',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Filter submissions after this date',
            },
            {
              name: 'endDate',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Filter submissions before this date',
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: { type: 'string', default: 'submittedAt' },
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SubmissionListResponse' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        post: {
          tags: ['Submissions'],
          summary: 'Create a submission',
          description: 'Submits data to a form. Form must be published (or use test API key for drafts).',
          operationId: 'createSubmission',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateSubmissionRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Submission created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SubmissionResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/forms/{formId}/submissions/{submissionId}': {
        get: {
          tags: ['Submissions'],
          summary: 'Get a submission',
          description: 'Returns a single submission with all its data.',
          operationId: 'getSubmission',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'submissionId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SubmissionDetailResponse' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Submissions'],
          summary: 'Delete a submission',
          description: 'Permanently deletes a submission.',
          operationId: 'deleteSubmission',
          parameters: [
            {
              name: 'formId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'submissionId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Submission deleted',
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Use your API key: `np_live_xxx` or `np_test_xxx`',
        },
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            services: {
              type: 'object',
              properties: {
                api: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    responseTime: { type: 'integer', description: 'Response time in ms' },
                  },
                },
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    responseTime: { type: 'integer', description: 'Response time in ms' },
                    error: { type: 'string', description: 'Error message if down' },
                  },
                },
              },
            },
          },
        },
        FormSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'frm_abc123' },
            slug: { type: 'string', example: 'contact-form' },
            name: { type: 'string', example: 'Contact Form' },
            description: { type: 'string', example: 'A simple contact form' },
            status: { type: 'string', enum: ['draft', 'published'] },
            responseCount: { type: 'integer', example: 42 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            publishedAt: { type: 'string', format: 'date-time' },
          },
        },
        FormDetail: {
          allOf: [
            { $ref: '#/components/schemas/FormSummary' },
            {
              type: 'object',
              properties: {
                fields: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Field' },
                },
                settings: {
                  type: 'object',
                  properties: {
                    submitButtonText: { type: 'string' },
                    successMessage: { type: 'string' },
                    redirectUrl: { type: 'string' },
                  },
                },
              },
            },
          ],
        },
        Field: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            path: { type: 'string', example: 'email' },
            label: { type: 'string', example: 'Email Address' },
            type: {
              type: 'string',
              enum: ['text', 'email', 'phone', 'number', 'date', 'select', 'checkbox', 'textarea', 'file'],
            },
            required: { type: 'boolean' },
            placeholder: { type: 'string' },
            helpText: { type: 'string' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  label: { type: 'string' },
                },
              },
            },
            validation: {
              type: 'object',
              properties: {
                minLength: { type: 'integer' },
                maxLength: { type: 'integer' },
                pattern: { type: 'string' },
                min: { type: 'number' },
                max: { type: 'number' },
              },
            },
          },
        },
        Submission: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            formId: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true,
              example: { email: 'user@example.com', message: 'Hello!' },
            },
            metadata: {
              type: 'object',
              properties: {
                submittedAt: { type: 'string', format: 'date-time' },
                ipAddress: { type: 'string' },
                userAgent: { type: 'string' },
                referrer: { type: 'string' },
              },
            },
          },
        },
        CreateFormRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Contact Form' },
            description: { type: 'string' },
            slug: { type: 'string', description: 'URL-friendly identifier (auto-generated if not provided)' },
            fields: {
              type: 'array',
              items: { $ref: '#/components/schemas/Field' },
            },
          },
        },
        UpdateFormRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            fields: {
              type: 'array',
              items: { $ref: '#/components/schemas/Field' },
            },
          },
        },
        CreateSubmissionRequest: {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: true,
              description: 'Form field values',
              example: { email: 'user@example.com', name: 'John Doe' },
            },
            metadata: {
              type: 'object',
              properties: {
                referrer: { type: 'string' },
                customFields: { type: 'object' },
              },
            },
          },
        },
        FormListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/FormSummary' },
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
            requestId: { type: 'string' },
          },
        },
        FormResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/FormSummary' },
            requestId: { type: 'string' },
          },
        },
        FormDetailResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/FormDetail' },
            requestId: { type: 'string' },
          },
        },
        SubmissionListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Submission' },
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
            requestId: { type: 'string' },
          },
        },
        SubmissionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                submissionId: { type: 'string' },
                formId: { type: 'string' },
                submittedAt: { type: 'string', format: 'date-time' },
              },
            },
            requestId: { type: 'string' },
          },
        },
        SubmissionDetailResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Submission' },
            requestId: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 5 },
            hasMore: { type: 'boolean', example: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Form name is required' },
                details: { type: 'object' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required or invalid API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'INVALID_API_KEY',
                  message: 'Invalid or expired API key',
                },
                requestId: 'abc-123',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        BadRequest: {
          description: 'Invalid request body',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Maximum requests per hour',
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Remaining requests',
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Unix timestamp when limit resets',
            },
            'Retry-After': {
              schema: { type: 'integer' },
              description: 'Seconds until limit resets',
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'System',
        description: 'System health and status',
      },
      {
        name: 'Forms',
        description: 'Create and manage forms',
      },
      {
        name: 'Submissions',
        description: 'Manage form submissions',
      },
    ],
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
