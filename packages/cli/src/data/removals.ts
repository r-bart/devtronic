/**
 * Information about files that have been removed from templates.
 * Used by the update command to inform users about removals.
 */
export interface RemovalInfo {
  /** Human-readable reason for removal */
  reason: string;
  /** Version in which the file was removed */
  version: string;
  /** Alternative solution or migration path */
  alternative?: string;
}

/**
 * Registry of files removed from templates.
 * Key is the relative path from project root.
 *
 * Note: In v1.8.0, .claude/skills/* and .claude/agents/* are migrated to the
 * tut-ai plugin (.claude-plugins/tut-ai/). This migration is handled directly
 * by migrateToPlugin() in update.ts, not through this removals registry.
 */
export const REMOVED_FILES: Record<string, RemovalInfo> = {
  '.claude/agents/db-reader.md': {
    reason: 'Replaced by database MCPs',
    version: '1.6.1',
    alternative: 'Configure a database MCP like postgres-mcp or sqlite-mcp',
  },
  '.claude/skills/elegant.md': {
    reason: 'Converted to prompting tip',
    version: '1.6.0',
    alternative:
      'Use the prompt: "Knowing everything you know now, implement the elegant solution"',
  },
  '.claude/skills/audit.md': {
    reason: 'Converted to directory skill with supporting files',
    version: '1.7.1',
    alternative: 'Now at .claude/skills/audit/SKILL.md',
  },
  '.claude/skills/scaffold.md': {
    reason: 'Converted to directory skill with supporting files',
    version: '1.7.1',
    alternative: 'Now at .claude/skills/scaffold/SKILL.md',
  },
};
