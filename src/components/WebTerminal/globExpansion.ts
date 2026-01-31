/**
 * Glob Pattern Expansion for NetPad Terminal
 * 
 * Supports bash-like glob patterns:
 * - * matches any characters (except /)
 * - ? matches single character
 * - [abc] matches any character in brackets
 * - [a-z] matches character ranges
 * - ** matches across directories (future)
 */

export interface GlobMatch {
  pattern: string;
  matches: string[];
}

/**
 * Convert a glob pattern to a regex
 */
export function globToRegex(pattern: string): RegExp {
  let regex = '';
  let inBracket = false;
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    if (inBracket) {
      if (char === ']') {
        regex += ']';
        inBracket = false;
      } else if (char === '-' && i > 0 && pattern[i + 1] !== ']') {
        regex += '-';
      } else {
        regex += escapeRegexChar(char);
      }
    } else {
      switch (char) {
        case '*':
          // ** for recursive matching (future)
          if (pattern[i + 1] === '*') {
            regex += '.*';
            i++;
          } else {
            // * matches anything except /
            regex += '[^/]*';
          }
          break;
        case '?':
          regex += '[^/]';
          break;
        case '[':
          regex += '[';
          inBracket = true;
          // Handle negation [!abc] or [^abc]
          if (pattern[i + 1] === '!' || pattern[i + 1] === '^') {
            regex += '^';
            i++;
          }
          break;
        case '.':
        case '+':
        case '^':
        case '$':
        case '(':
        case ')':
        case '{':
        case '}':
        case '|':
        case '\\':
          regex += '\\' + char;
          break;
        default:
          regex += char;
      }
    }
  }
  
  return new RegExp('^' + regex + '$', 'i');
}

function escapeRegexChar(char: string): string {
  if ('.+^$(){}|\\'.includes(char)) {
    return '\\' + char;
  }
  return char;
}

/**
 * Check if a string contains glob characters
 */
export function hasGlobChars(str: string): boolean {
  // Don't treat as glob if inside quotes
  if ((str.startsWith('"') && str.endsWith('"')) || 
      (str.startsWith("'") && str.endsWith("'"))) {
    return false;
  }
  return /[*?\[\]]/.test(str);
}

/**
 * Expand a glob pattern against a list of items
 */
export function expandGlob(pattern: string, items: string[]): string[] {
  // If no glob chars, return as-is
  if (!hasGlobChars(pattern)) {
    return [pattern];
  }
  
  const regex = globToRegex(pattern);
  const matches = items.filter(item => {
    // Strip trailing / for matching
    const name = item.replace(/\/$/, '');
    return regex.test(name);
  });
  
  // If no matches, return original pattern (bash behavior)
  return matches.length > 0 ? matches : [pattern];
}

/**
 * Expand all glob patterns in an array of arguments
 */
export function expandGlobsInArgs(args: string[], availableItems: string[]): string[] {
  const expanded: string[] = [];
  
  for (const arg of args) {
    // Remove quotes if present
    const unquoted = arg.replace(/^["']|["']$/g, '');
    
    if (hasGlobChars(arg) && !arg.startsWith('"') && !arg.startsWith("'")) {
      expanded.push(...expandGlob(unquoted, availableItems));
    } else {
      expanded.push(unquoted);
    }
  }
  
  return expanded;
}

/**
 * Parse brace expansion {a,b,c} (future enhancement)
 */
export function expandBraces(pattern: string): string[] {
  const match = pattern.match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (!match) {
    return [pattern];
  }
  
  const [, prefix, alternatives, suffix] = match;
  const parts = alternatives.split(',');
  
  const expanded: string[] = [];
  for (const part of parts) {
    expanded.push(...expandBraces(prefix + part + suffix));
  }
  
  return expanded;
}
