/**
 * Browse tools for exploring NetPad templates.
 *
 * Uses the registerTool API pattern from OpenAI's official Apps SDK example.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  ALL_TEMPLATES,
  searchTemplates as searchTemplatesUtil,
  type FormTemplate,
} from '@netpad/templates';

/**
 * Template item for the widget.
 */
interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags?: string[];
  fieldCount?: number;
}

/**
 * Convert a FormTemplate to a TemplateItem for the widget.
 */
function toTemplateItem(template: FormTemplate): TemplateItem {
  return {
    id: template.id,
    name: template.name,
    description: template.shortDescription,
    category: template.category,
    icon: template.icon || '📝',
    tags: template.tags,
    fieldCount: template.fieldConfigs?.length || 0,
  };
}

/**
 * Format template data for the gallery widget.
 */
function formatFormTemplates(category?: string, search?: string): TemplateItem[] {
  let templates = ALL_TEMPLATES;

  if (category) {
    templates = templates.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    templates = searchTemplatesUtil(search);
    if (category) {
      templates = templates.filter(
        (t) => t.category.toLowerCase() === category.toLowerCase()
      );
    }
  }

  return templates.map(toTemplateItem);
}

/**
 * Workflow templates placeholder.
 */
function formatWorkflowTemplates(category?: string, search?: string): TemplateItem[] {
  const workflowTemplates: TemplateItem[] = [
    {
      id: 'approval-workflow',
      name: 'Approval Workflow',
      description: 'Multi-step approval process with notifications',
      category: 'Business',
      icon: '✅',
      tags: ['approval', 'business'],
    },
    {
      id: 'onboarding-workflow',
      name: 'Employee Onboarding',
      description: 'Automated onboarding with task assignments',
      category: 'HR',
      icon: '👋',
      tags: ['onboarding', 'hr'],
    },
    {
      id: 'support-escalation',
      name: 'Support Escalation',
      description: 'Escalate tickets based on priority and SLA',
      category: 'Support',
      icon: '🎫',
      tags: ['support', 'escalation'],
    },
  ];

  let result = workflowTemplates;

  if (category) {
    result = result.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  return result;
}

function getCategories(type: 'form' | 'workflow' | 'application'): string[] {
  if (type === 'form') {
    return [...new Set(ALL_TEMPLATES.map((t) => t.category))];
  }
  if (type === 'workflow') {
    return ['Business', 'HR', 'Support'];
  }
  return [];
}

/**
 * Register the browse_templates tool using OpenAI's registerTool pattern.
 */
export function registerBrowseTemplates(server: McpServer): void {
  server.registerTool(
    'browse_templates',
    {
      title: 'Browse Templates',
      description: 'Browse form and workflow templates available in NetPad. Use this when users want to see what templates are available, find templates for specific use cases, or explore templates by category.',
      inputSchema: {
        type: z.enum(['form', 'workflow', 'application']).optional().describe('Type of template to browse'),
        category: z.string().optional().describe('Filter by category (e.g., Healthcare, Business, Events)'),
        search: z.string().optional().describe('Search query to filter templates'),
      },
      annotations: {
        readOnlyHint: true,  // Only retrieves data, no modifications
        openWorldHint: false, // Bounded to NetPad templates
        destructiveHint: false,
      },
    },
    async (args) => {
      const type = args.type || 'form';
      const { category, search } = args;

      let templates: TemplateItem[];
      if (type === 'form') {
        templates = formatFormTemplates(category, search);
      } else if (type === 'workflow') {
        templates = formatWorkflowTemplates(category, search);
      } else {
        templates = [];
      }

      const categories = getCategories(type);

      const categoryBreakdown = categories
        .map((cat) => {
          const count = templates.filter((t) => t.category === cat).length;
          return `${cat}: ${count}`;
        })
        .filter((s) => !s.endsWith(': 0'))
        .join(', ');

      const textSummary = `Found ${templates.length} ${type} templates across ${categories.length} categories${categoryBreakdown ? ` (${categoryBreakdown})` : ''}.

Top templates:
${templates
  .slice(0, 10)
  .map((t) => `- ${t.icon} **${t.name}** (${t.category}): ${t.description}${t.fieldCount ? ` [${t.fieldCount} fields]` : ''}`)
  .join('\n')}${templates.length > 10 ? `\n\n...and ${templates.length - 10} more templates available.` : ''}`;

      return {
        content: [{ type: 'text' as const, text: textSummary }],
        structuredContent: {
          templates,
          templateType: type,
          categories,
          selectedCategory: category,
          total: templates.length,
        },
      };
    }
  );
}

/**
 * Register the search_templates tool.
 */
export function registerSearchTemplates(server: McpServer): void {
  server.registerTool(
    'search_templates',
    {
      title: 'Search Templates',
      description: 'Search across all NetPad templates by keyword, use case, or industry. Use this when users have a specific need in mind.',
      inputSchema: {
        query: z.string().describe('Search query (e.g., "contact form", "patient intake", "feedback survey")'),
        type: z.enum(['form', 'workflow', 'application']).optional().describe('Limit search to specific template type'),
        limit: z.number().optional().describe('Maximum number of results to return'),
      },
      annotations: {
        readOnlyHint: true,  // Only retrieves data, no modifications
        openWorldHint: false, // Bounded to NetPad templates
        destructiveHint: false,
      },
    },
    async (args) => {
      const { query, type, limit = 10 } = args;
      const results: Array<TemplateItem & { type: string; score: number }> = [];

      // Search form templates
      if (!type || type === 'form') {
        const formMatches = formatFormTemplates(undefined, query);
        results.push(
          ...formMatches.map((t) => ({
            ...t,
            type: 'form' as const,
            score: calculateRelevanceScore(t, query),
          }))
        );
      }

      // Search workflow templates
      if (!type || type === 'workflow') {
        const workflowMatches = formatWorkflowTemplates(undefined, query);
        results.push(
          ...workflowMatches.map((t) => ({
            ...t,
            type: 'workflow' as const,
            score: calculateRelevanceScore(t, query),
          }))
        );
      }

      const sortedResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const textSummary = sortedResults.length > 0
        ? `Found ${sortedResults.length} templates matching "${query}":

${sortedResults
  .map((t) => `- [${t.type}] ${t.icon} **${t.name}**: ${t.description}`)
  .join('\n')}`
        : `No templates found matching "${query}". Try a different search term or browse all templates.`;

      return {
        content: [{ type: 'text' as const, text: textSummary }],
        structuredContent: {
          query,
          results: sortedResults,
          total: sortedResults.length,
        },
      };
    }
  );
}

/**
 * Simple relevance scoring for search results.
 */
function calculateRelevanceScore(template: TemplateItem, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  if (template.name.toLowerCase() === queryLower) {
    score += 100;
  } else if (template.name.toLowerCase().includes(queryLower)) {
    score += 50;
  }

  if (template.description.toLowerCase().includes(queryLower)) {
    score += 25;
  }

  if (template.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) {
    score += 30;
  }

  if (template.category.toLowerCase().includes(queryLower)) {
    score += 20;
  }

  return score;
}
