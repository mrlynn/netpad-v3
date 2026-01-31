/**
 * Help API - List and Search Help Topics
 * 
 * GET /api/help - List all help topics
 * GET /api/help?search=query - Search help topics
 */

import { NextRequest, NextResponse } from 'next/server';
import { helpTopics } from '@/lib/helpContent';
import { HelpTopic, HelpTopicId } from '@/types/help';

export const dynamic = 'force-dynamic';

interface HelpTopicSummary {
  id: string;
  title: string;
  description: string;
  keywords?: string[];
}

/**
 * Search help topics by query
 */
function searchTopics(query: string): HelpTopicSummary[] {
  const lowerQuery = query.toLowerCase();
  const results: { topic: HelpTopicSummary; score: number }[] = [];

  for (const [id, topic] of Object.entries(helpTopics)) {
    let score = 0;

    // Title match (highest weight)
    if (topic.title.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Description match
    if (topic.description.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }

    // Keyword match
    if (topic.keywords?.some(k => k.toLowerCase().includes(lowerQuery))) {
      score += 8;
    }

    // ID match
    if (id.toLowerCase().includes(lowerQuery)) {
      score += 3;
    }

    // Content match (lower weight, but still relevant)
    const contentText = topic.content
      .map(c => Array.isArray(c.content) ? c.content.join(' ') : c.content)
      .join(' ')
      .toLowerCase();
    if (contentText.includes(lowerQuery)) {
      score += 2;
    }

    if (score > 0) {
      results.push({
        topic: {
          id,
          title: topic.title,
          description: topic.description,
          keywords: topic.keywords,
        },
        score,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.map(r => r.topic);
}

/**
 * Get all topics organized by category
 */
function getAllTopics(): { category: string; topics: HelpTopicSummary[] }[] {
  const categories: Record<string, HelpTopicSummary[]> = {
    'Getting Started': [],
    'Forms': [],
    'Workflows': [],
    'RBAC & Access Control': [],
    'API': [],
    'Integrations': [],
    'Admin': [],
    'Other': [],
  };

  for (const [id, topic] of Object.entries(helpTopics)) {
    const summary: HelpTopicSummary = {
      id,
      title: topic.title,
      description: topic.description,
    };

    // Categorize based on ID prefix or keywords
    if (id.startsWith('getting-started') || id === 'getting-started') {
      categories['Getting Started'].push(summary);
    } else if (id.startsWith('form-') || id.includes('field') || id === 'form-builder') {
      categories['Forms'].push(summary);
    } else if (id.startsWith('workflow-') || id.startsWith('node-')) {
      categories['Workflows'].push(summary);
    } else if (id.startsWith('rbac-')) {
      categories['RBAC & Access Control'].push(summary);
    } else if (id.startsWith('api-')) {
      categories['API'].push(summary);
    } else if (id.startsWith('admin-')) {
      categories['Admin'].push(summary);
    } else if (id.includes('mongodb') || id.includes('google') || id.includes('atlas')) {
      categories['Integrations'].push(summary);
    } else {
      categories['Other'].push(summary);
    }
  }

  // Filter out empty categories and return
  return Object.entries(categories)
    .filter(([, topics]) => topics.length > 0)
    .map(([category, topics]) => ({ category, topics }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search') || searchParams.get('q');

  if (searchQuery) {
    const results = searchTopics(searchQuery);
    return NextResponse.json({
      query: searchQuery,
      count: results.length,
      results,
    });
  }

  // Return all topics organized by category
  const categories = getAllTopics();
  const totalCount = categories.reduce((sum, cat) => sum + cat.topics.length, 0);

  return NextResponse.json({
    count: totalCount,
    categories,
  });
}
