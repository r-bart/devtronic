# Implementation Plan: devtronic Command System Refactor

**Date**: 2026-03-06
**Status**: Draft
**Spec**: thoughts/specs/2026-03-06_command-system-refactor.md

---

## Overview

Rename the `auto-devtronic` addon skill to `/devtronic`, namespace all core skills as `devtronic:[skill]`, migrate install paths from `.claude/skills/` to `.claude/commands/`, and add format adapters for Gemini, OpenCode, Cursor, and Codex.

---

## Current State (research findings)

| What | Current | Target |
|------|---------|--------|
| Addon skill invocation | `/auto-devtronic` | `/devtronic` |
| Core skill invocation | `/brief`, `/spec`, ... | `/devtronic:brief`, `/devtronic:spec`, ... |
| Addon install path (Claude Code) | `.claude/skills/auto-devtronic/SKILL.md` | `.claude/commands/devtronic.md` |
| Core skills install path (Claude Code) | `.claude-plugins/devtronic/skills/[skill]/SKILL.md` | Same path, `name:` field updated |
| SKILL.md `name:` (addon) | `auto-devtronic` | `devtronic` |
| SKILL.md `name:` (core skills) | `brief`, `spec`, ... | `devtronic:brief`, `devtronic:spec`, ... |
| Cursor/Gemini/OpenCode/Codex | Addon only, same Markdown | Format-adapted per IDE |

**Key findings:**
- Core skills live in `.claude-plugins/devtronic/skills/*/SKILL.md` (plugin system). Namespace is controlled by the `name:` field. No code changes needed — only content changes in template SKILL.md files.
- The addon (`auto-devtronic`) uses `addonFiles.ts` to install separately from the plugin. That generator must change install path and add per-IDE format adapters.
- Cursor and OpenCode templates are currently empty (no skills). This refactor introduces the first cross-IDE skill installation for the addon.
- `addonFiles.ts` currently uses the same relative path for all agents. The refactor makes paths runtime-aware (`.claude/commands/devtronic.md` for Claude ≠ `.gemini/commands/devtronic.toml` for Gemini).

---

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `packages/cli/templates/claude-code/.claude/skills/*/SKILL.md` (34 files) | Modify `name:` field | 1 |
| `packages/cli/src/generators/rules.ts` | Update CORE_SKILLS `name` values | 1 |
| `packages/cli/src/addons/auto-devtronic/skills/auto-devtronic/SKILL.md` | Move to `devtronic/SKILL.md`, update `name:` | 2 |
| `packages/cli/src/addons/auto-devtronic/manifest.json` | Update `files.skills: ["devtronic"]` | 2 |
| `packages/cli/src/types.ts` | Update ADDONS label; add Codex/OpenCode to agent map | 2 |
| `packages/cli/src/generators/addonFiles.ts` | Runtime-aware install paths + format adapters | 3 |
| `packages/cli/src/commands/update.ts` | Migration: remove `.claude/skills/auto-devtronic/` | 4 |
| `packages/cli/src/data/removals.ts` | Register old skill paths as removed | 4 |
| `packages/cli/src/commands/__tests__/addon-v2.test.ts` | Update path assertions | 5 |
| `packages/cli/src/generators/__tests__/addon-file-generator.test.ts` | Update path assertions (if not @immutable) | 5 |

---

## Approach Analysis

### Option A: Runtime-aware `buildFileMap()`

Extend `buildFileMap(addonSourceDir, runtime)` to return different relative paths and content per runtime. Each entry in the map is `(relPath, content)` where both are runtime-specific.

**Pros**: Single source of truth; format transformation colocated with path logic.
**Cons**: `buildFileMap` signature changes, callers must pass runtime.

### Option B: Post-install transformer

`buildFileMap` stays unchanged. A new `adaptForRuntime(fileMap, runtime)` transforms the output.

**Pros**: Clean separation; `buildFileMap` stays pure.
**Cons**: Two-step process, slightly more indirection.

### Recommendation

**Option A** — runtime-aware `buildFileMap()`. The path and format are inseparable for Gemini (`.toml` suffix) and OpenCode (different parent directory). Keeping them together is clearer.

---

## Implementation Phases

### Phase 1: Namespace core skill SKILL.md files

**Scope**: Update `name:` frontmatter in all 34 core skill template files.

#### Task 1.1: Update skill `name:` fields in templates

**Files**: `packages/cli/templates/claude-code/.claude/skills/*/SKILL.md` (34 files)

For each skill, change:
```yaml
---
name: brief        # before
```
to:
```yaml
---
name: devtronic:brief   # after
```

Full mapping (skill dir → new name):
- `audit` → `devtronic:audit`
- `backlog` → `devtronic:backlog`
- `brief` → `devtronic:brief`
- `briefing` → `devtronic:briefing`
- `checkpoint` → `devtronic:checkpoint`
- `create-plan` → `devtronic:create-plan`
- `create-skill` → `devtronic:create-skill`
- `design` → `devtronic:design`
- `design-audit` → `devtronic:design-audit`
- `design-define` → `devtronic:design-define`
- `design-ia` → `devtronic:design-ia`
- `design-research` → `devtronic:design-research`
- `design-review` → `devtronic:design-review`
- `design-spec` → `devtronic:design-spec`
- `design-system` → `devtronic:design-system`
- `design-system-audit` → `devtronic:design-system-audit`
- `design-system-define` → `devtronic:design-system-define`
- `design-system-sync` → `devtronic:design-system-sync`
- `design-wireframe` → `devtronic:design-wireframe`
- `execute-plan` → `devtronic:execute-plan`
- `generate-tests` → `devtronic:generate-tests`
- `handoff` → `devtronic:handoff`
- `investigate` → `devtronic:investigate`
- `learn` → `devtronic:learn`
- `opensrc` → `devtronic:opensrc`
- `post-review` → `devtronic:post-review`
- `quick` → `devtronic:quick`
- `recap` → `devtronic:recap`
- `research` → `devtronic:research`
- `scaffold` → `devtronic:scaffold`
- `setup` → `devtronic:setup`
- `spec` → `devtronic:spec`
- `summary` → `devtronic:summary`
- `worktree` → `devtronic:worktree`

#### Task 1.2: Update `CORE_SKILLS` in `rules.ts`

**File**: `packages/cli/src/generators/rules.ts`

Update the `CORE_SKILLS` array: each `name` becomes `devtronic:[skill]`. The `desc` stays unchanged. Update the skill listing in `generateClaudeMd` / `generateAgentsMdFromConfig` to use `/devtronic:[skill]` format.

```typescript
// Before
{ name: 'brief', desc: 'Session orientation with pre-flight checks' },

// After
{ name: 'devtronic:brief', desc: 'Session orientation with pre-flight checks' },
```

---

### Phase 2: Rename addon skill → `/devtronic`

#### Task 2.1: Rename skill source directory and update SKILL.md

Move source files:
```
addons/auto-devtronic/skills/auto-devtronic/SKILL.md
→ addons/auto-devtronic/skills/devtronic/SKILL.md
```

In the SKILL.md frontmatter:
```yaml
# Before
name: auto-devtronic

# After
name: devtronic
```

Any self-references to `/auto-devtronic` in the SKILL.md body → update to `/devtronic`.

#### Task 2.2: Update addon manifest

**File**: `packages/cli/src/addons/auto-devtronic/manifest.json`

```json
{
  "files": {
    "skills": ["devtronic"]
  }
}
```

#### Task 2.3: Update `types.ts` ADDONS entry

**File**: `packages/cli/src/types.ts`

```typescript
'auto-devtronic': {
  name: 'auto-devtronic',
  label: 'auto-devtronic — Autonomous Engineering Loop',
  skills: ['devtronic'],          // was: ['auto-devtronic']
  agents: ['issue-parser', 'failure-analyst', 'quality-runner'],
},
```

---

### Phase 3: Runtime-aware install paths + format adapters

This is the core engineering change. `addonFiles.ts` must install the addon in the correct format and path for each runtime.

#### Task 3.1: Define runtime install specs

**File**: `packages/cli/src/generators/addonFiles.ts`

Add a runtime config map that defines, per agent, where and how to install:

```typescript
interface RuntimeInstallSpec {
  /** Parent directory relative to project root (e.g. '.claude') */
  baseDir: string;
  /** Function that maps (skillName, content) → { relPath, content } */
  adapter: (skillName: string, content: string) => { relPath: string; content: string };
}

const RUNTIME_SPECS: Record<string, RuntimeInstallSpec> = {
  claude: {
    baseDir: '.claude',
    adapter: (name, content) => ({
      relPath: `commands/${name}.md`,   // .claude/commands/devtronic.md
      content,                           // Markdown, unchanged
    }),
  },
  gemini: {
    baseDir: '.gemini',
    adapter: (name, content) => ({
      relPath: `commands/${name}.toml`, // .gemini/commands/devtronic.toml
      content: markdownToGeminiToml(content),
    }),
  },
  opencode: {
    baseDir: '.opencode',
    adapter: (name, content) => ({
      relPath: `command/${name}.md`,    // .opencode/command/devtronic.md
      content: stripFrontmatterName(content),
    }),
  },
  cursor: {
    baseDir: '.cursor',
    adapter: (name, content) => ({
      relPath: `rules/${name}.md`,      // .cursor/rules/devtronic.md
      content: stripFrontmatter(content),
    }),
  },
  codex: {
    baseDir: '.codex',
    adapter: (name, content) => ({
      relPath: `skills/${name}/SKILL.md`,  // .codex/skills/devtronic/SKILL.md
      content,
    }),
  },
};
```

#### Task 3.2: Implement format adapters

**File**: `packages/cli/src/generators/addonFiles.ts`

Implement the three format converters:

```typescript
/**
 * Converts a Markdown SKILL.md to Gemini CLI TOML format.
 * Extracts `description` from frontmatter, uses body as `prompt`.
 */
function markdownToGeminiToml(content: string): string {
  const frontmatter = parseFrontmatter(content);
  const body = stripFrontmatter(content).trim();
  const description = frontmatter.description ?? '';
  return [
    `description = ${JSON.stringify(description)}`,
    `prompt = """`,
    body,
    `"""`,
  ].join('\n');
}

/**
 * Strips the `name:` field from YAML frontmatter.
 * OpenCode uses the filename as the command name — explicit name causes conflicts.
 */
function stripFrontmatterName(content: string): string {
  return content.replace(/^(---\n)([\s\S]*?)(---)/m, (_, open, body, close) => {
    const cleaned = body.split('\n').filter(l => !l.startsWith('name:')).join('\n');
    return `${open}${cleaned}${close}`;
  });
}

/**
 * Removes the entire YAML frontmatter block.
 * Used for Cursor (rules don't use frontmatter).
 */
function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?---\n/, '').trim();
}
```

#### Task 3.3: Update `generateAddonFiles()` to use runtime specs

**File**: `packages/cli/src/generators/addonFiles.ts`

Replace the current loop that uses `AGENT_PATHS` with one that uses `RUNTIME_SPECS`:

```typescript
export function generateAddonFiles(
  projectDir: string,
  addonSourceDir: string,
  agents: string[]
): GenerateResult {
  const manifest = readManifest(addonSourceDir);
  const result: GenerateResult = { written: 0, skipped: 0, conflicts: [], checksums: {} };

  for (const agent of agents) {
    const spec = RUNTIME_SPECS[agent];
    if (!spec) continue; // unsupported runtime — skip silently

    for (const skillName of manifest.files.skills ?? []) {
      const skillFile = join(addonSourceDir, 'skills', skillName, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const rawContent = readFileSync(skillFile, 'utf-8');

      const { relPath, content } = spec.adapter(skillName, rawContent);
      const destPath = join(projectDir, spec.baseDir, relPath);

      if (existsSync(destPath)) {
        const existing = readFileSync(destPath, 'utf-8');
        if (existing === content) { result.skipped++; continue; }
        result.skipped++;
        continue;
      }

      ensureDir(dirname(destPath));
      writeFileSync(destPath, content);
      result.written++;
      result.checksums![relPath] = checksum(content);
    }

    // Agents: install to baseDir/agents/[agent].md (unchanged across runtimes)
    for (const agentName of manifest.files.agents ?? []) {
      const agentFile = join(addonSourceDir, 'agents', `${agentName}.md`);
      if (!existsSync(agentFile)) continue;
      const content = readFileSync(agentFile, 'utf-8');
      const destPath = join(projectDir, spec.baseDir, 'agents', `${agentName}.md`);
      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, content);
        result.written++;
      } else { result.skipped++; }
    }
  }

  return result;
}
```

#### Task 3.4: Update `removeAddonFiles()` and `syncAddonFiles()`

**File**: `packages/cli/src/generators/addonFiles.ts`

Update `removeAddonFiles()` to use `RUNTIME_SPECS` (derive the path per runtime to know what to delete).

Update `syncAddonFiles()` similarly.

---

### Phase 4: Migration in `devtronic update`

#### Task 4.1: Remove old skill paths on update

**File**: `packages/cli/src/commands/update.ts`

After the main update logic, add a migration step that removes old `.claude/skills/auto-devtronic/` (and any legacy `devtronic` skill paths from the transition period):

```typescript
// Migrate: remove old addon skill path
const oldAddonPath = join(targetDir, '.claude', 'skills', 'auto-devtronic');
if (existsSync(oldAddonPath)) {
  rmSync(oldAddonPath, { recursive: true, force: true });
  p.log.warn('Migrated: removed .claude/skills/auto-devtronic/ → now at .claude/commands/devtronic.md');
}
```

#### Task 4.2: Register old paths in `removals.ts`

**File**: `packages/cli/src/data/removals.ts`

```typescript
'.claude/skills/auto-devtronic/SKILL.md': {
  reason: 'Renamed to /devtronic command at .claude/commands/devtronic.md',
  version: '1.x.0',
  alternative: 'Run `npx devtronic addon enable auto-devtronic` to reinstall at new path',
},
```

---

### Phase 5: Tests

#### Task 5.1: Update addon install path tests

**Files**:
- `packages/cli/src/commands/__tests__/addon-v2.test.ts`
- `packages/cli/src/generators/__tests__/addon-file-generator.test.ts`

Update path assertions:
- Old: `expect(existsSync('.claude/skills/auto-devtronic/SKILL.md')).toBe(true)`
- New: `expect(existsSync('.claude/commands/devtronic.md')).toBe(true)`

Update content assertions to match new `name: devtronic` frontmatter.

Add new tests for multi-IDE installs:
- Gemini: `.gemini/commands/devtronic.toml` exists and is valid TOML
- OpenCode: `.opencode/command/devtronic.md` exists, no `name:` in frontmatter
- Cursor: `.cursor/rules/devtronic.md` exists, no frontmatter at all

#### Task 5.2: Add format adapter unit tests

**File**: `packages/cli/src/generators/__tests__/addonFileAdapters.test.ts` (new)

```typescript
describe('markdownToGeminiToml', () => {
  it('extracts description and uses body as prompt')
  it('handles missing description gracefully')
})

describe('stripFrontmatterName', () => {
  it('removes name: field only, keeps other frontmatter')
})

describe('stripFrontmatter', () => {
  it('removes entire --- block')
  it('handles content without frontmatter')
})
```

---

## Task Dependencies

```yaml
tasks:
  "1.1":
    description: Update name: in 34 template SKILL.md files
    depends_on: []
  "1.2":
    description: Update CORE_SKILLS in rules.ts
    depends_on: []
  "2.1":
    description: Rename addon skill dir + update SKILL.md name
    depends_on: []
  "2.2":
    description: Update addon manifest.json
    depends_on: ["2.1"]
  "2.3":
    description: Update types.ts ADDONS entry
    depends_on: ["2.1"]
  "3.1":
    description: Define RUNTIME_SPECS map in addonFiles.ts
    depends_on: ["2.1"]
  "3.2":
    description: Implement format adapters (TOML, stripName, stripFrontmatter)
    depends_on: ["3.1"]
  "3.3":
    description: Update generateAddonFiles() to use runtime specs
    depends_on: ["3.1", "3.2"]
  "3.4":
    description: Update removeAddonFiles() and syncAddonFiles()
    depends_on: ["3.1", "3.2"]
  "4.1":
    description: Migration cleanup in update.ts
    depends_on: ["3.3"]
  "4.2":
    description: Register old paths in removals.ts
    depends_on: []
  "5.1":
    description: Update addon install path tests
    depends_on: ["3.3", "4.1"]
  "5.2":
    description: Add format adapter unit tests
    depends_on: ["3.2"]
```

## Execution Phases

| Phase | Tasks | Notes |
|-------|-------|-------|
| 1 | 1.1, 1.2, 2.1, 4.2 | All independent, run in parallel |
| 2 | 2.2, 2.3, 3.1, 3.2 | Depends on 2.1 |
| 3 | 3.3, 3.4 | Depends on 3.1 + 3.2 |
| 4 | 4.1, 5.1, 5.2 | Depends on 3.x |

---

## Done Criteria

- [ ] `/devtronic` is invokable in a Claude Code session after `npx devtronic addon enable auto-devtronic`
- [ ] `/devtronic:brief` is invokable after `npx devtronic init`
- [ ] `.claude/commands/devtronic.md` exists (not `.claude/skills/auto-devtronic/SKILL.md`)
- [ ] `.gemini/commands/devtronic.toml` exists when `gemini` is in agents list
- [ ] `.opencode/command/devtronic.md` exists when `opencode` is in agents list, with no `name:` field
- [ ] `.cursor/rules/devtronic.md` exists when `cursor` is in agents list, with no frontmatter
- [ ] `npx devtronic update` removes `.claude/skills/auto-devtronic/` if present
- [ ] All 34 SKILL.md files in plugin have `name: devtronic:[skill]`
- [ ] `npm run typecheck && npm run lint && npm test` pass

---

## Risk Analysis

### Breaking change impact
Users who have installed `auto-devtronic` will see `/auto-devtronic` stop working after `npm update devtronic`. The migration in `devtronic update` automatically removes the old file and installs the new one. The change must be documented in CHANGELOG.md.

### TOML format completeness
The Gemini TOML adapter assumes the SKILL.md has a `description:` frontmatter field. All skills should have one — verify before implementing. If missing, the adapter must fall back to a generic description.

### Codex complexity
Codex uses a different skill format entirely (directory + TOML metadata file). The adapter for Codex may require a `skill.toml` metadata file in addition to the content file. De-risk by checking the GSD Codex implementation before Task 3.2.

---

## Verification

```bash
npm run typecheck && npm run lint && npm test
```

Package manager: `npm` (no `pnpm-lock.yaml`, no `yarn.lock`, no `bun.lockb`).
