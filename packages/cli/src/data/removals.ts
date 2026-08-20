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
 * Note: Versioning was reset to 1.0.0 for open-source launch.
 * Historical version numbers below (e.g. 1.6.0, 1.7.1) are from the pre-reset era.
 *
 * In v1.8.0 (pre-reset), .claude/skills/* and .claude/agents/* were migrated to the
 * devtronic plugin (.claude-plugins/devtronic/). This migration is handled directly
 * by migrateStandaloneToMarketplace() in update.ts, not through this removals registry.
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
  '.claude/skills/loop/SKILL.md': {
    reason: 'Renamed to /converge — /loop now belongs to a bundled Claude Code skill',
    version: '2.0.0',
    alternative: 'Use /converge (or /devtronic:converge). The CLI command stays `devtronic loop`',
  },
  '.claude/skills/recap/SKILL.md': {
    reason: 'Folded into /summary --quick — /recap is a built-in Claude Code command',
    version: '2.0.0',
    alternative: 'Use /summary --quick. It writes the same thoughts/RECAP.md',
  },
  '.claude/skills/design-system-sync/SKILL.md': {
    reason: 'Renamed to /design-tokens-sync — too close to the bundled /design-sync skill',
    version: '2.0.0',
    alternative: 'Use /design-tokens-sync (also reachable via /design-system --sync)',
  },
  '.claude/skills/scaffold.md': {
    reason: 'Converted to directory skill with supporting files',
    version: '1.7.1',
    alternative: 'Now at .claude/skills/scaffold/SKILL.md',
  },
};
