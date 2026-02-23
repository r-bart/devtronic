#!/usr/bin/env node
/**
 * Build script for agentic-marketplace.
 *
 * Copies skills, agents from the CLI templates and generates static
 * plugin metadata files (plugin.json, marketplace.json, hooks.json,
 * checkpoint.sh) so the package can be published to npm as a
 * standalone Claude Code plugin.
 *
 * Run: node scripts/build.mjs
 */

import { cpSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLI_ROOT = join(ROOT, '..', 'cli');
const TEMPLATES = join(CLI_ROOT, 'templates', 'claude-code', '.claude');

const PLUGIN_NAME = 'rbartronic';
const MARKETPLACE_NAME = 'rbartronic-local';

// Read version from CLI package.json
const cliPkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
const version = cliPkg.version;

// Output paths
const pluginDir = join(ROOT, PLUGIN_NAME);
const marketplaceMetaDir = join(ROOT, '.claude-plugin');

// Clean previous build
if (existsSync(pluginDir)) rmSync(pluginDir, { recursive: true });
if (existsSync(marketplaceMetaDir)) rmSync(marketplaceMetaDir, { recursive: true });

// 1. Marketplace descriptor
mkdirSync(marketplaceMetaDir, { recursive: true });
writeFileSync(
  join(marketplaceMetaDir, 'marketplace.json'),
  JSON.stringify(
    {
      name: MARKETPLACE_NAME,
      owner: {
        name: 'r-bart',
        url: 'https://github.com/r-bart/rbartronic',
      },
      plugins: [
        {
          name: PLUGIN_NAME,
          source: `./${PLUGIN_NAME}`,
          description: 'rbartronic — 18 skills, 8 agents, full workflow hooks',
        },
      ],
    },
    null,
    2
  )
);

// 2. Plugin metadata
const pluginMetaDir = join(pluginDir, '.claude-plugin');
mkdirSync(pluginMetaDir, { recursive: true });
writeFileSync(
  join(pluginMetaDir, 'plugin.json'),
  JSON.stringify(
    {
      name: PLUGIN_NAME,
      version,
      description:
        'rbartronic — 18 skills, 8 agents, full workflow hooks by rbart',
      author: {
        name: 'r-bart',
        url: 'https://github.com/r-bart/rbartronic',
      },
      repository: 'https://github.com/r-bart/rbartronic',
      license: 'MIT',
      keywords: ['agentic', 'architecture', 'clean-architecture', 'ddd', 'workflow', 'skills'],
    },
    null,
    2
  )
);

// 3. Copy skills from templates
cpSync(join(TEMPLATES, 'skills'), join(pluginDir, 'skills'), { recursive: true });

// 4. Copy agents from templates
cpSync(join(TEMPLATES, 'agents'), join(pluginDir, 'agents'), { recursive: true });

// 5. Generic hooks (uses npx eslint since PM is unknown at npm install time)
const hooksDir = join(pluginDir, 'hooks');
mkdirSync(hooksDir, { recursive: true });
writeFileSync(
  join(hooksDir, 'hooks.json'),
  JSON.stringify(
    {
      description: 'r-bart rbartronic — workflow hooks',
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
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: 'npx eslint --fix --quiet 2>/dev/null || true',
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
    },
    null,
    2
  )
);

// 6. Checkpoint script
const scriptsDir = join(pluginDir, 'scripts');
mkdirSync(scriptsDir, { recursive: true });
const checkpointScript = `#!/bin/bash
# Auto-checkpoint before context compaction
# Generated by rbartronic

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
writeFileSync(join(scriptsDir, 'checkpoint.sh'), checkpointScript);
chmodSync(join(scriptsDir, 'checkpoint.sh'), 0o755);

// 7. Pre-commit hook script
const preCommitScript = `#!/usr/bin/env bash
# pre-commit.sh — Git pre-commit hook for rbartronic projects
#
# Install:
#   cp packages/marketplace/rbartronic/scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or with a symlink:
#   ln -sf ../../packages/marketplace/rbartronic/scripts/pre-commit.sh .git/hooks/pre-commit

set -euo pipefail

# Detect package manager from lockfile
detect_pm() {
  if [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

PM=$(detect_pm)

echo "Pre-commit hook running with $PM..."

# Run typecheck
echo "Running typecheck..."
if ! $PM run typecheck; then
  echo ""
  echo "Typecheck failed. Fix type errors before committing."
  exit 1
fi

# Run lint
echo "Running lint..."
if ! $PM run lint; then
  echo ""
  echo "Lint failed. Fix lint errors before committing."
  exit 1
fi

echo "Pre-commit checks passed."
`;
writeFileSync(join(scriptsDir, 'pre-commit.sh'), preCommitScript);
chmodSync(join(scriptsDir, 'pre-commit.sh'), 0o755);

// 8. Stop-guard script (generic quality command for npm-only installs)
const stopGuardScript = `#!/bin/bash
# Quality gate: runs checks before allowing Claude to stop
# Generated by rbartronic

INPUT=$(cat)

# Prevent infinite loops: if already triggered by a stop hook, allow stop
if echo "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# Run quality checks (generic — use CLI init for personalized commands)
if ! npx tsc --noEmit > /dev/null 2>&1; then
  echo "TypeScript checks failed. Fix type errors before stopping." >&2
  exit 2
fi

if ! npx eslint . > /dev/null 2>&1; then
  echo "Lint checks failed. Fix lint errors before stopping." >&2
  exit 2
fi

exit 0
`;
writeFileSync(join(scriptsDir, 'stop-guard.sh'), stopGuardScript);
chmodSync(join(scriptsDir, 'stop-guard.sh'), 0o755);

console.log(`Built agentic-marketplace v${version}`);
console.log(`  .claude-plugin/marketplace.json`);
console.log(`  ${PLUGIN_NAME}/.claude-plugin/plugin.json`);
console.log(`  ${PLUGIN_NAME}/skills/ (18 skills)`);
console.log(`  ${PLUGIN_NAME}/agents/ (8 agents)`);
console.log(`  ${PLUGIN_NAME}/hooks/hooks.json (5 hooks)`);
console.log(`  ${PLUGIN_NAME}/scripts/checkpoint.sh`);
console.log(`  ${PLUGIN_NAME}/scripts/pre-commit.sh`);
console.log(`  ${PLUGIN_NAME}/scripts/stop-guard.sh`);
