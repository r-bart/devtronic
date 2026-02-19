import type { ProjectConfig, PackageManager } from '../types.js';

interface HookEntry {
  type: 'command' | 'prompt' | 'agent';
  command?: string;
  prompt?: string;
  model?: string;
  timeout?: number;
  statusMessage?: string;
  async?: boolean;
}

interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

interface HooksConfig {
  description: string;
  hooks: Record<string, HookMatcher[]>;
}

/**
 * Generates a hooks.json configuration personalized by the project's
 * package manager and quality command.
 *
 * Hooks included:
 * - SessionStart: quick project orientation (prompt, haiku)
 * - PostToolUse(Write|Edit): auto-lint after each file change (command)
 * - Stop: quality gate (stop-guard.sh) + done criteria reminder (prompt, haiku)
 * - SubagentStop: validate subagent output (prompt, haiku)
 * - PreCompact: auto-checkpoint before context compaction (command)
 */
export function generateHooks(config: ProjectConfig, packageManager: PackageManager): string {
  const lintFixCmd = buildLintFixCommand(packageManager, config);

  const hooksConfig: HooksConfig = {
    description: 'Tutellus AI Agentic Architecture — workflow hooks',
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'prompt',
              prompt:
                'Quick project orientation: First check if thoughts/STATE.md exists — if so, read it and summarize the current project state. Then check git status, recent commits, and any in-progress work. Give a 3-line summary prioritizing STATE.md context if available.\n\nContext: $ARGUMENTS',
              model: 'haiku',
              timeout: 30,
            },
          ],
        },
      ],
      // Synchronous lint-fix: must complete before Claude reads the file again
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: `${lintFixCmd} 2>/dev/null || true`,
              timeout: 30,
              statusMessage: 'Auto-linting...',
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: '${CLAUDE_PLUGIN_ROOT}/scripts/stop-guard.sh',
              timeout: 60,
              statusMessage: 'Running quality checks...',
            },
            {
              type: 'prompt',
              prompt:
                'If thoughts/plans/ contains a recent plan with a "Done Criteria" section, quickly check: are there unmet criteria? If yes, list them as a brief reminder. Do NOT run a full review. If no plan or all criteria met, say nothing.',
              model: 'haiku',
              timeout: 15,
              statusMessage: 'Checking done criteria...',
            },
          ],
        },
      ],
      SubagentStop: [
        {
          hooks: [
            {
              type: 'prompt',
              prompt: [
                'A subagent has finished. Based on the metadata below, assess if it completed successfully.',
                'Consider the agent type and whether the session ended normally.',
                'Respond with {"ok": true} if it appears complete, or {"ok": false, "reason": "..."} if something seems off.',
                '',
                'IMPORTANT: If stop_hook_active is true, always respond {"ok": true} to prevent infinite loops.',
                '',
                'Context: $ARGUMENTS',
              ].join('\n'),
              model: 'haiku',
              timeout: 30,
            },
          ],
        },
      ],
      PreCompact: [
        {
          matcher: 'auto',
          hooks: [
            {
              type: 'command',
              command: '${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.sh',
              timeout: 30,
              statusMessage: 'Auto-checkpoint before compaction...',
            },
          ],
        },
      ],
    },
  };

  return JSON.stringify(hooksConfig, null, 2);
}

/**
 * Builds the lint-fix shell command for the detected package manager.
 */
function buildLintFixCommand(packageManager: PackageManager, config: ProjectConfig): string {
  const pm = packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  // If the project has a lint script, use lint:fix variant
  if (config.qualityCommand.includes('lint')) {
    return `${run} lint:fix -- --quiet`;
  }
  return `${run} lint --fix --quiet`;
}

/**
 * Generates the stop-guard.sh script used by the Stop hook.
 *
 * The script:
 * 1. Checks stop_hook_active to prevent infinite loops
 * 2. Runs the project's quality command
 * 3. Exits 2 (blocking) on failure, 0 (allow stop) on success
 */
export function generateStopGuardScript(config: ProjectConfig): string {
  // Escape single quotes in the quality command for safe shell embedding
  const safeCmd = config.qualityCommand.replace(/'/g, "'\\''");

  return `#!/bin/bash
# Quality gate: runs checks before allowing Claude to stop
# Generated by @tutellus/agentic-architecture

INPUT=$(cat)

# Prevent infinite loops: if already triggered by a stop hook, allow stop
if echo "$INPUT" | grep -q '"stop_hook_active"'; then
  if echo "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
    exit 0
  fi
fi

# Run quality checks
QUALITY_CMD='${safeCmd}'
if ! eval "$QUALITY_CMD" > /dev/null 2>&1; then
  echo "Quality checks failed. Run '$QUALITY_CMD' to see details." >&2
  exit 2
fi

exit 0
`;
}

/**
 * Generates the checkpoint.sh script used by the PreCompact hook.
 */
export function generateCheckpointScript(): string {
  return `#!/bin/bash
# Auto-checkpoint before context compaction
# Generated by @tutellus/agentic-architecture

CHECKPOINT_DIR="thoughts/checkpoints"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$CHECKPOINT_DIR"

{
  echo "# Auto-checkpoint: $TIMESTAMP"
  echo ""
  echo "## Git Status"
  git diff --stat 2>/dev/null || echo "Not a git repo"
  echo ""
  echo "## Recent Commits"
  git log --oneline -5 2>/dev/null || echo "No commits"
} > "$CHECKPOINT_DIR/\${TIMESTAMP}_pre-compact.md"

echo "Checkpoint saved: $CHECKPOINT_DIR/\${TIMESTAMP}_pre-compact.md"

# Update persistent state (minimal — skill-level checkpoint writes richer state)
STATE_FILE="thoughts/STATE.md"
mkdir -p "$(dirname "$STATE_FILE")"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
{
  echo "# Project State"
  echo ""
  echo "**Updated**: $(date '+%Y-%m-%d %H:%M') (auto-compact)"
  echo "**Branch**: $BRANCH"
  echo ""
  echo "## Last Auto-Checkpoint"
  echo ""
  echo "Context was compacted. See: \\\`$CHECKPOINT_DIR/\${TIMESTAMP}_pre-compact.md\\\`"
  echo ""
  echo "## Recent Commits"
  echo ""
  git log --oneline -5 2>/dev/null || echo "No commits"
} > "$STATE_FILE"
`;
}
