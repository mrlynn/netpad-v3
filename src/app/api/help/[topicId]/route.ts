/**
 * Help API - Get Specific Topic
 * 
 * GET /api/help/[topicId] - Get full help topic content
 * GET /api/help/[topicId]?format=terminal - Get terminal-formatted content
 */

import { NextRequest, NextResponse } from 'next/server';
import { helpTopics } from '@/lib/helpContent';
import { HelpTopic, HelpContent } from '@/types/help';

export const dynamic = 'force-dynamic';

/**
 * Format help content for terminal display (ANSI colors)
 */
function formatForTerminal(topic: HelpTopic): string {
  const lines: string[] = [];

  // Title
  lines.push(`\x1b[1m\x1b[36m${topic.title}\x1b[0m`);
  lines.push(`\x1b[90m${'─'.repeat(Math.min(topic.title.length + 4, 60))}\x1b[0m`);
  lines.push('');

  // Description
  lines.push(`\x1b[37m${topic.description}\x1b[0m`);
  lines.push('');

  // Content
  for (const block of topic.content) {
    lines.push(formatContentBlock(block));
  }

  // Related topics
  if (topic.relatedTopics?.length) {
    lines.push('');
    lines.push(`\x1b[90mRelated topics:\x1b[0m`);
    lines.push(`  ${topic.relatedTopics.map(t => `\x1b[36m${t}\x1b[0m`).join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format a single content block for terminal
 */
function formatContentBlock(block: HelpContent): string {
  switch (block.type) {
    case 'heading':
      return `\n\x1b[1m\x1b[33m${block.content}\x1b[0m\n`;

    case 'text':
      return wrapText(String(block.content), 70);

    case 'list':
      if (Array.isArray(block.content)) {
        return block.content.map(item => `  \x1b[90m•\x1b[0m ${item}`).join('\n') + '\n';
      }
      return `  • ${block.content}\n`;

    case 'code':
      const code = Array.isArray(block.content) ? block.content.join('\n') : block.content;
      return `\n\x1b[48;5;236m\x1b[38;5;156m  ${code.split('\n').join('\n  ')}  \x1b[0m\n`;

    case 'tip':
      return `\n\x1b[42m\x1b[30m 💡 TIP \x1b[0m \x1b[32m${block.content}\x1b[0m\n`;

    case 'warning':
      return `\n\x1b[43m\x1b[30m ⚠️ WARNING \x1b[0m \x1b[33m${block.content}\x1b[0m\n`;

    case 'example':
      return `\n\x1b[90mExample:\x1b[0m\n  ${block.content}\n`;

    default:
      return String(block.content);
  }
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join('\n') + '\n';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  // Find the topic
  const topic = helpTopics[topicId as keyof typeof helpTopics];

  if (!topic) {
    // Try fuzzy match
    const lowerTopicId = topicId.toLowerCase().replace(/-/g, '');
    const matchedKey = Object.keys(helpTopics).find(
      key => key.toLowerCase().replace(/-/g, '') === lowerTopicId
    );

    if (matchedKey) {
      const matchedTopic = helpTopics[matchedKey as keyof typeof helpTopics];
      if (format === 'terminal') {
        return new NextResponse(formatForTerminal(matchedTopic), {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return NextResponse.json(matchedTopic);
    }

    return NextResponse.json(
      { 
        error: 'Topic not found',
        suggestion: `Try searching with: GET /api/help?search=${topicId}`,
      },
      { status: 404 }
    );
  }

  // Return terminal-formatted version if requested
  if (format === 'terminal') {
    return new NextResponse(formatForTerminal(topic), {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Return full topic JSON
  return NextResponse.json(topic);
}
