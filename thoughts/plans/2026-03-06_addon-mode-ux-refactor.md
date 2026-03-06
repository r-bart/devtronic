# Implementation Plan: Addon & Mode UX Refactor

**Date**: 2026-03-06
**Spec**: thoughts/specs/2026-03-06_addon-mode-ux-refactor.md
**Status**: Draft

---

## Overview

Refactor the addon system and add persistent mode management. Addons become toggleable features (`enable/disable`) instead of installable packages (`add/remove`). HITL/AFK becomes a per-project persistent mode stored in `.claude/devtronic.json`. A new `devtronic mode` command manages it. `devtronic status` is enhanced to show the full config picture.

---

## Current State

| Aspect | Current | Target |
|--------|---------|--------|
| Addon toggle | `addon add/remove` | `addon enable/disable` (keep `add/remove` as deprecated aliases) |
| Config location | `devtronic.json` (project root) | `.claude/devtronic.json` (inside `.claude/`) |
| Config schema | `{ agents, installed }` | `{ version, mode?, agents, installed }` |
| Mode | Per-invocation `--afk/--hitl` flag | Persistent per-project, overridable by flag |
| Status command | Shows file health only | Shows mode + addon states + file health |
| Mode command | Does not exist | `devtronic mode afk\|hitl\|show` |
| Auto-migration on update | No | Yes — registers orphaned addon files |

---

## Approach

### Option A: New standalone config file (`.claude/devtronic.json`)

Add `mode` to the existing `AddonConfig` interface. Move config file from project root to `.claude/devtronic.json`. `readAddonConfig` auto-migrates old root file on first read.

**Pros**: Semantically correct (Claude Code-specific config), co-located with skills/agents, clean schema extension
**Cons**: Migration step needed

### Option B: Reuse existing `devtronic.json` at root

Keep config at root, just add `mode` field.

**Pros**: No migration
**Cons**: Root-level config doesn't belong to Claude Code specifically; pollutes root

### Recommendation

**Option A** — Move to `.claude/devtronic.json` with auto-migration. The file is Claude Code-specific and belongs with its ecosystem. Migration is transparent: `readAddonConfig` checks new path first, falls back to root, migrates silently.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/cli/src/types.ts` | Modify | Add `mode` field to `AddonConfig`, add `DevtronicMode` type |
| `packages/cli/src/utils/addonConfig.ts` | Modify | Move config to `.claude/devtronic.json`, add `readMode`/`writeMode`, add auto-migration |
| `packages/cli/src/commands/mode.ts` | Create | New `devtronic mode afk\|hitl\|show` command |
| `packages/cli/src/commands/addon.ts` | Modify | Add `enable/disable` aliases, update `list` output language, add `enabled/disabled` terminology |
| `packages/cli/src/commands/status.ts` | Modify | Add mode + addon section to output |
| `packages/cli/src/commands/update.ts` | Modify | Add auto-migration of orphaned addon files post-update |
| `packages/cli/src/commands/init.ts` | Modify | Add mode note to post-init summary |
| `packages/cli/src/index.ts` | Modify | Register new `mode` command + `addon enable/disable` subcommands |
| `packages/cli/src/addons/auto-devtronic/skills/auto-devtronic/SKILL.md` | Modify | Add mode resolution instructions: read `.claude/devtronic.json` when no flag |
| `packages/cli/src/utils/__tests__/addon-manifest.test.ts` | Modify | Add tests for mode read/write, new config path, migration |
| `packages/cli/src/commands/__tests__/addon-v2.test.ts` | Modify | Add tests for `enable/disable` aliases |

---

## Implementation Phases

### Phase 1: Config Foundation

#### Task 1.1: Add `DevtronicMode` type and update `AddonConfig`
**File**: `packages/cli/src/types.ts`

```typescript
// Add after AddonOptions:
export type DevtronicMode = 'hitl' | 'afk';

// Update AddonConfig:
export interface AddonConfig {
  version?: 1;
  mode?: DevtronicMode;  // new — absent = HITL default
  agents: string[];
  installed: Record<string, AddonConfigEntry>;
}
```

#### Task 1.2: Update `addonConfig.ts` — new path, mode helpers, migration
**File**: `packages/cli/src/utils/addonConfig.ts`

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { AddonConfig, AddonConfigEntry, DevtronicMode } from '../types.js';

// New path: .claude/devtronic.json (was: devtronic.json at root)
const CONFIG_DIR = '.claude';
const CONFIG_FILE = 'devtronic.json';

function getConfigPath(targetDir: string): string {
  return join(targetDir, CONFIG_DIR, CONFIG_FILE);
}

// Legacy path for auto-migration
function getLegacyConfigPath(targetDir: string): string {
  return join(targetDir, CONFIG_FILE);
}

export function readAddonConfig(targetDir: string): AddonConfig {
  const configPath = getConfigPath(targetDir);
  const legacyPath = getLegacyConfigPath(targetDir);

  // Auto-migrate: if new path absent but old path exists, move it
  if (!existsSync(configPath) && existsSync(legacyPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    renameSync(legacyPath, configPath);
  }

  if (!existsSync(configPath)) {
    return { agents: ['claude'], installed: {} };
  }

  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  const data = raw.addons ?? raw;
  return {
    version: 1,
    mode: data.mode,
    agents: data.agents ?? ['claude'],
    installed: data.installed ?? {},
  };
}

export function writeAddonConfig(targetDir: string, config: AddonConfig): void {
  const configPath = getConfigPath(targetDir);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify({ version: 1, ...config }, null, 2) + '\n');
}

// Mode helpers
export function readMode(targetDir: string): DevtronicMode {
  const config = readAddonConfig(targetDir);
  return config.mode ?? 'hitl';  // default HITL
}

export function writeMode(targetDir: string, mode: DevtronicMode): void {
  const config = readAddonConfig(targetDir);
  config.mode = mode;
  writeAddonConfig(targetDir, config);
}

// Keep existing helpers unchanged: writeAddonToConfig, removeAddonFromConfig
```

---

### Phase 2: New `mode` Command

#### Task 2.1: Create `packages/cli/src/commands/mode.ts`

```typescript
import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { DevtronicMode } from '../types.js';
import { readMode, writeMode } from '../utils/addonConfig.js';
import { introTitle } from '../utils/ui.js';

export async function modeCommand(
  action: 'afk' | 'hitl' | 'show',
  options: { path?: string }
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Mode'));

  if (action === 'show') {
    const mode = readMode(targetDir);
    const isDefault = !/* check if config has mode set */ false;
    p.log.info(`Mode: ${chalk.cyan(mode)}${isDefault ? chalk.dim(' (default)') : ''}`);
    p.log.info(`Config: ${chalk.dim('.claude/devtronic.json')}`);
    p.outro('');
    return;
  }

  const newMode = action as DevtronicMode;
  writeMode(targetDir, newMode);

  const description = newMode === 'afk'
    ? 'Fully autonomous — no human gates'
    : 'Human-in-the-loop — pauses for approval at key stages';

  p.log.success(`Mode set to ${chalk.cyan(newMode)}`);
  p.log.info(chalk.dim(description));
  p.outro(`Change back anytime with ${chalk.cyan(`npx devtronic mode ${newMode === 'afk' ? 'hitl' : 'afk'}`)}`);
}
```

**Note**: `show` should read the raw config to distinguish "set to hitl" vs "defaulting to hitl". Update `readAddonConfig` to expose whether `mode` is explicitly set.

#### Task 2.2: Register `mode` in `index.ts`

```typescript
import { modeCommand } from './commands/mode.js';

// Add after the 'uninstall' command block:
program
  .command('mode')
  .description('Set or show the execution mode (hitl or afk)')
  .argument('<mode>', 'Mode to set: afk, hitl, or show')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (mode, options) => {
    if (!['afk', 'hitl', 'show'].includes(mode)) {
      console.error(`Invalid mode: ${mode}. Use: afk, hitl, or show`);
      process.exit(1);
    }
    await modeCommand(mode as 'afk' | 'hitl' | 'show', { path: options.path });
  });
```

Also add to the `help --all` sections table:
```typescript
{
  title: 'Mode',
  usage: 'mode <afk|hitl|show>',
  desc: 'Set or show the persistent execution mode',
  opts: ['--path <path>        Target directory'],
},
```

And add `mode` to the banner quick-reference.

---

### Phase 3: Addon `enable/disable` Aliases

#### Task 3.1: Add `enable/disable` to `addon.ts`

In `addon.ts`, export new action handler that maps `enable` → `add` and `disable` → `remove` for file-based addons, with no deprecation warning (they are the canonical new terms). Map `add/remove` to `enable/disable` with a deprecation notice.

```typescript
export async function addonCommand(
  action: 'add' | 'remove' | 'enable' | 'disable',
  addonName: string,
  options: AddonOptions
): Promise<void> {
  // ...existing validation...

  // Map deprecated actions to new canonical names
  let canonicalAction: 'enable' | 'disable' = action === 'add' || action === 'enable' ? 'enable' : 'disable';

  if (action === 'add' || action === 'remove') {
    p.log.warn(
      `"addon ${action}" is deprecated. Use "addon ${canonicalAction}" instead.`
    );
  }

  if (isFileBasedAddon(typedName)) {
    if (canonicalAction === 'enable') {
      await enableFileBasedAddon(targetDir, typedName, options);
    } else {
      await disableFileBasedAddon(targetDir, typedName, options);
    }
    return;
  }

  // Legacy plugin-based addons (orchestration) unchanged...
}
```

Rename internal functions: `addFileBasedAddon` → `enableFileBasedAddon`, `removeFileBasedAddon` → `disableFileBasedAddon`.

Update output language: "Adding addon" → "Enabling addon", "installed" → "enabled", etc.

Update `addonListCommand` output:
```
auto-devtronic     enabled    Autonomous engineering loop
design-best-practices  disabled   Frontend design quality
orchestration      disabled   Structured pre-planning
```

#### Task 3.2: Register `enable/disable` in `index.ts`

```typescript
addonCmd
  .command('enable')
  .description('Enable an addon (copies files to .claude/)')
  .argument('<name>', 'Addon name')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (name, options) => {
    await addonCommand('enable', name, { path: options.path });
  });

addonCmd
  .command('disable')
  .description('Disable an addon (removes files from .claude/)')
  .argument('<name>', 'Addon name')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (name, options) => {
    await addonCommand('disable', name, { path: options.path });
  });
```

Update `help --all` table to show `enable/disable` as primary, `add/remove` as deprecated.

---

### Phase 4: Enhance Existing Commands

#### Task 4.1: Update `status.ts`

Add a new section at the top (before file health) showing mode + addon states:

```typescript
import { readAddonConfig, readMode } from '../utils/addonConfig.js';
import { getAvailableAddons } from '../addons/registry.js';

// Add inside statusCommand, after basic info note:
const mode = readMode(targetDir);
const addonConfig = readAddonConfig(targetDir);
const allAddons = getAvailableAddons();

const modeLines = [
  `${formatKV('Mode:', chalk.cyan(mode))}`,
  `${formatKV('Config:', chalk.dim('.claude/devtronic.json'))}`,
];
p.note(modeLines.join('\n'), 'Execution Mode');

const addonLines = allAddons.map((addon) => {
  const isEnabled = !!addonConfig.installed[addon.name];
  const statusStr = isEnabled ? chalk.green('enabled') : chalk.dim('disabled');
  return `  ${chalk.bold(addon.name.padEnd(24))} ${statusStr}`;
});
p.note(addonLines.join('\n'), 'Addons');
```

#### Task 4.2: Update `update.ts` — auto-migration of orphaned addon files

At the end of the update flow (after core files are updated), add:

```typescript
import { detectOrphanedAddonFiles, registerAddonInConfig } from '../utils/addonConfig.js';
import { getAvailableAddons } from '../addons/registry.js';

// After core update completes:
const orphaned = detectOrphanedAddonFiles(targetDir);
if (orphaned.length > 0) {
  const spinner = p.spinner();
  spinner.start('Migrating detected addon files to config...');
  for (const addonName of orphaned) {
    registerAddonInConfig(targetDir, addonName);
  }
  spinner.stop(`Migrated: ${orphaned.join(', ')}`);
}

// Then sync enabled addons (update their files to latest bundle):
const config = readAddonConfig(targetDir);
const enabledAddons = Object.keys(config.installed);
if (enabledAddons.length > 0) {
  // Use existing addonSyncCommand logic inline, or call syncAddonFiles
}
```

**New helper** `detectOrphanedAddonFiles(targetDir)` in `addonConfig.ts`:
- For each known addon, check if its skill/agent files exist in `.claude/skills/` or `.claude/agents/`
- If they exist but the addon is not in `config.installed`, it's orphaned
- Return list of orphaned addon names

**New helper** `registerAddonInConfig(targetDir, addonName)` in `addonConfig.ts`:
- Reads manifest.json from addon source dir
- Writes entry to `config.installed` without copying files (files already exist)

#### Task 4.3: Update `init.ts` — add mode note to post-init summary

Find the post-init success output and add:

```typescript
p.note(
  [
    `${chalk.dim('Execution mode:')} HITL ${chalk.dim('(default — safe for unfamiliar codebases)')}`,
    `${chalk.dim('Change with:')}      ${chalk.cyan('npx devtronic mode afk')}`,
  ].join('\n'),
  'Autonomous Mode'
);
```

---

### Phase 5: Skill Update

#### Task 5.1: Update `/auto-devtronic` SKILL.md — mode resolution

In `packages/cli/src/addons/auto-devtronic/skills/auto-devtronic/SKILL.md`, update the "Modes" section to document config-based mode resolution:

```markdown
## Mode Resolution

Mode is resolved in this order (highest priority first):

1. **CLI flag** (`--afk` / `--hitl`) — overrides all
2. **Project config** (`.claude/devtronic.json` → `mode` field) — use `Read` tool on `.claude/devtronic.json`
3. **Default**: HITL

At pipeline start, before step 0:
- Read `.claude/devtronic.json` if it exists
- If `mode` field is set and no flag was passed, use it as the active mode
- Log: "Mode: afk (from project config)" or "Mode: hitl (default)"
```

---

### Phase 6: Tests

#### Task 6.1: Update `addon-manifest.test.ts`

Add test cases for:
- `readAddonConfig` returns default HITL when no config
- `readMode` returns `'hitl'` when mode is absent from config
- `writeMode` persists to `.claude/devtronic.json`
- Auto-migration: old `devtronic.json` at root is moved to `.claude/devtronic.json`
- `detectOrphanedAddonFiles` returns addon name when files present but not in config

#### Task 6.2: Update `addon-v2.test.ts`

Add test cases for:
- `addon enable <name>` calls the same logic as `addon add <name>`
- `addon disable <name>` calls the same logic as `addon remove <name>`
- `addon add` logs a deprecation warning

---

## Task Dependencies

```yaml
tasks:
  "1.1":
    description: "Add DevtronicMode type + update AddonConfig in types.ts"
    dependsOn: []

  "1.2":
    description: "Update addonConfig.ts — new path, mode helpers, migration"
    dependsOn: ["1.1"]

  "2.1":
    description: "Create commands/mode.ts"
    dependsOn: ["1.2"]

  "2.2":
    description: "Register mode command in index.ts"
    dependsOn: ["2.1"]

  "3.1":
    description: "Add enable/disable aliases to addon.ts"
    dependsOn: ["1.2"]

  "3.2":
    description: "Register addon enable/disable in index.ts"
    dependsOn: ["3.1", "2.2"]

  "4.1":
    description: "Enhance status.ts with mode + addon section"
    dependsOn: ["1.2"]

  "4.2":
    description: "Add auto-migration to update.ts"
    dependsOn: ["1.2"]

  "4.3":
    description: "Add mode note to init.ts post-init summary"
    dependsOn: ["1.2"]

  "5.1":
    description: "Update SKILL.md mode resolution docs"
    dependsOn: []

  "6.1":
    description: "Update addon-manifest.test.ts"
    dependsOn: ["1.2"]

  "6.2":
    description: "Update addon-v2.test.ts"
    dependsOn: ["3.1"]
```

---

## Execution Order

```
Phase 1 (foundation):   1.1 → 1.2
Phase 2 (parallel):     2.1, 3.1, 4.1, 4.2, 4.3, 5.1  [all depend on 1.2, independent of each other]
Phase 3 (registrations): 2.2, 3.2  [after 2.1 and 3.1]
Phase 4 (tests):        6.1, 6.2  [after 1.2 and 3.1]
```

---

## Risk Analysis

### Edge Cases

- [ ] User has both `devtronic.json` (root) AND `.claude/devtronic.json` — read new, ignore old (migration only runs if new doesn't exist)
- [ ] `devtronic update` called in project with no addons — migration step detects nothing, no-op
- [ ] `mode show` when no config exists — print "Mode: hitl (default, not configured)"
- [ ] `addon enable` on already-enabled addon — existing behavior: show warning, exit cleanly
- [ ] `addon disable` on orphaned addon (files present, not in config) — handle gracefully, remove files and skip config update

### Breaking Changes

- `devtronic.json` moves from project root to `.claude/devtronic.json` — mitigated by auto-migration on `readAddonConfig`
- `addon add/remove` still work with deprecation warning — no hard break

---

## Done Criteria

- [ ] `npx devtronic addon enable auto-devtronic` works and shows "enabled" language
- [ ] `npx devtronic addon disable auto-devtronic` works and shows "disabled" language
- [ ] `npx devtronic addon add auto-devtronic` still works with deprecation warning
- [ ] `npx devtronic mode afk` writes `mode: afk` to `.claude/devtronic.json`
- [ ] `npx devtronic mode hitl` writes `mode: hitl` to `.claude/devtronic.json`
- [ ] `npx devtronic mode show` prints current mode (with default label if unconfigured)
- [ ] `npx devtronic status` shows mode + addon states before file health section
- [ ] `npx devtronic update` auto-migrates orphaned addon files to config
- [ ] `npx devtronic init` post-summary includes mode note
- [ ] Old `devtronic.json` at project root is auto-migrated to `.claude/devtronic.json` on next read
- [ ] `/auto-devtronic` skill documents config-based mode resolution
- [ ] `npm run typecheck && npm run lint && npm test` all pass

---

## Verification

```bash
npm run typecheck && npm run lint && npm test
```

Manual smoke tests:
1. `npx devtronic init` in a new dir — see mode note in summary
2. `npx devtronic mode afk` → `npx devtronic mode show` → shows afk
3. `npx devtronic addon enable auto-devtronic` → `npx devtronic status` → shows enabled
4. `npx devtronic addon add auto-devtronic` → see deprecation warning
5. Create old `devtronic.json` at root → run `npx devtronic mode show` → file auto-migrated to `.claude/`
