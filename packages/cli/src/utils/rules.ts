import type { IDE } from '../types.js';
import type { GeneratedRules } from '../generators/architectureRules.js';

/**
 * Gets the appropriate rule content for a specific IDE
 */
export function getRuleContentForIDE(ide: IDE, rules: GeneratedRules): string | null {
  switch (ide) {
    case 'claude-code':
      return rules.claudeCode;
    case 'cursor':
      return rules.cursor;
    case 'antigravity':
      return rules.antigravity;
    case 'github-copilot':
      return rules.copilot;
    case 'opencode':
      return rules.opencode;
    default:
      return null;
  }
}
