/**
 * Shell Prompt Builder
 * 
 * Creates context-aware prompts based on current path
 */

import chalk from 'chalk';

/**
 * Build a prompt string based on the current virtual filesystem path
 * 
 * Examples:
 * - / → "netpad ❯ "
 * - /my-org → "netpad my-org ❯ "
 * - /my-org/my-project → "netpad my-org/my-project ❯ "
 * - /my-org/my-project/my-app → "netpad my-org/.../my-app ❯ "
 */
export function buildPrompt(path: string): string {
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return `${chalk.cyan('netpad')} ${chalk.green('❯')} `;
  }
  
  // Show abbreviated path for deep nesting
  let pathDisplay: string;
  
  if (parts.length <= 2) {
    pathDisplay = parts.join('/');
  } else if (parts.length === 3) {
    // org/project/app → org/.../app
    pathDisplay = `${parts[0]}/.../${parts[parts.length - 1]}`;
  } else {
    // Longer paths → .../last-two
    pathDisplay = `.../${parts.slice(-2).join('/')}`;
  }
  
  return `${chalk.cyan('netpad')} ${chalk.blue(pathDisplay)} ${chalk.green('❯')} `;
}

/**
 * Get a colorized representation of the current context
 */
export function getContextString(path: string): string {
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return chalk.gray('(root)');
  }
  
  // Colorize each part based on level
  // org / project / app / type / item
  const colors = [
    chalk.magenta,  // org
    chalk.blue,     // project
    chalk.cyan,     // app
    chalk.yellow,   // type (forms, workflows, etc.)
    chalk.green,    // item
  ];
  
  return parts.map((part, i) => {
    const colorFn = colors[Math.min(i, colors.length - 1)];
    return colorFn(part);
  }).join(chalk.gray('/'));
}

/**
 * Format path for display with type indicators
 */
export function formatPath(path: string, metadata?: { type?: string }): string {
  const type = metadata?.type || detectType(path);
  
  const icons: Record<string, string> = {
    org: '🏢',
    project: '📁',
    application: '📱',
    form: '📝',
    workflow: '⚡',
    directory: '📂',
    file: '📄',
  };
  
  const icon = icons[type] || '📄';
  return `${icon} ${path}`;
}

function detectType(path: string): string {
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) return 'directory';
  if (parts.length === 1) return 'org';
  if (parts.length === 2) return 'project';
  if (parts.length === 3) return 'application';
  
  const typeSegment = parts[3]?.toLowerCase();
  if (typeSegment === 'forms') return 'form';
  if (typeSegment === 'workflows') return 'workflow';
  
  return 'file';
}
