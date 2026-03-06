# Implementation Plan: Addon System + Design Best Practices Addon

**Date**: 2026-03-05
**Status**: Draft
**Spec**: thoughts/specs/2026-03-05_addon-system.md
**Tests**: thoughts/tests/2026-03-05_addon-system.md

---

## Overview

Extend devtronic's addon system to support multi-agent generation, config-tracked file management, and multiple addons. Ship `design-best-practices` as the first new addon. Update all documentation.

## Key Decisions

- **Evolve, don't replace**: The current orchestration addon keeps working. We extend the system.
- **Follow existing patterns**: No new architecture layers (domain/application/etc). Use the existing flat structure (commands/, generators/, utils/, types.ts).
- **devtronic.json as addon config**: New config file separate from the existing `.ai-template/manifest.json` for addon-specific state.

---

## Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `src/addons/registry.ts` | Addon registry with all available addons + manifest loader |
| `src/addons/design-best-practices/manifest.json` | Addon manifest |
| `src/addons/design-best-practices/skills/design-init/SKILL.md` | Design initialization skill |
| `src/addons/design-best-practices/skills/design-review/SKILL.md` | Design critique + audit skill |
| `src/addons/design-best-practices/skills/design-refine/SKILL.md` | Directional refinement skill |
| `src/addons/design-best-practices/skills/design-system/SKILL.md` | Design system extraction skill |
| `src/addons/design-best-practices/skills/design-harden/SKILL.md` | Production hardening skill |
| `src/addons/design-best-practices/reference/*.md` | 7 reference docs |
| `src/addons/design-best-practices/rules/design-quality.md` | Auto-loaded design rule |
| `src/generators/addonFiles.ts` | Multi-agent addon file generator |
| `src/utils/addonConfig.ts` | Read/write devtronic.json addon config |

### Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add `design-best-practices` to `AddonName`, add new addon to `ADDONS`, add `AddonManifest` type |
| `src/commands/addon.ts` | Refactor to support multi-agent, config tracking, new addons |
| `src/commands/init.ts` | Offer design-best-practices addon during init |
| `src/index.ts` | Add `addon list`, `addon sync` subcommands |
| `docs/skills.md` | Add 5 design skills documentation |
| `docs/cli-reference.md` | Add `addon list`, `addon sync` commands |
| `docs/customization.md` | Add addon customization section |
| `docs/plugins.md` | Update skill counts, mention addons |
| `README.md` | Add addon system to features |
| `packages/cli/README.md` | Add addon section |
| `CHANGELOG.md` | Add addon system entry |

---

## Implementation Phases

### Phase 1: Types & Registry (no deps)

> Goal: Define the addon system's data model.

#### Task 1.1: Extend types.ts

**File**: `packages/cli/src/types.ts`

```typescript
// Add to AddonName union
export type AddonName = 'orchestration' | 'design-best-practices';

// Add AddonManifest type
export interface AddonManifest {
  name: string;
  description: string;
  version: string;
  license: string;
  attribution?: string;
  files: {
    skills: string[];
    reference?: string[];
    rules?: string[];
  };
}

// Add to ADDONS record
export const ADDONS: Record<AddonName, AddonInfo> = {
  orchestration: { /* existing */ },
  'design-best-practices': {
    name: 'design-best-practices',
    label: 'Design Best Practices',
    description: 'Frontend design quality skills: typography, color, layout, accessibility, motion, and UX writing.',
    skills: ['design-init', 'design-review', 'design-refine', 'design-system', 'design-harden'],
    agents: [],
  },
};
```

#### Task 1.2: Create addon registry

**File**: `packages/cli/src/addons/registry.ts`

- Export `getAddonManifest(name: AddonName): AddonManifest` — reads manifest.json from the bundled addon directory
- Export `getAddonSourceDir(name: AddonName): string` — returns absolute path to bundled addon content
- Export `getAvailableAddons(): AddonInfo[]` — returns all addons from ADDONS
- Use `import.meta.dirname` to resolve paths relative to the package

**Tests to satisfy**: addon-manifest.test.ts (FR-2 tests)

---

### Phase 2: Config & Utilities (depends on Phase 1)

> Goal: Read/write addon config, checksum utilities.

#### Task 2.1: Create addonConfig.ts

**File**: `packages/cli/src/utils/addonConfig.ts`

```typescript
interface AddonConfigEntry {
  version: string;
  files: string[];
  checksums: Record<string, string>;
}

interface AddonConfig {
  agents: string[];  // ['claude', 'cursor', 'gemini']
  installed: Record<string, AddonConfigEntry>;
}

export function readAddonConfig(targetDir: string): AddonConfig
export function writeAddonConfig(targetDir: string, config: AddonConfig): void
export function writeAddonToConfig(targetDir: string, name: string, entry: AddonConfigEntry): void
export function removeAddonFromConfig(targetDir: string, name: string): void
```

- Config file: `devtronic.json` in project root
- Default agents: `['claude']` when not specified
- Creates file if it doesn't exist

**Tests to satisfy**: addon-manifest.test.ts (FR-4, US-5 tests)

---

### Phase 3: Multi-Agent File Generator (depends on Phase 1, 2)

> Goal: Generate addon files for any configured agent.

#### Task 3.1: Create addonFiles.ts

**File**: `packages/cli/src/generators/addonFiles.ts`

```typescript
interface GenerateResult {
  written: number;
  skipped: number;
  conflicts: string[];
}

// Agent path mapping
const AGENT_PATHS: Record<string, string> = {
  claude: '.claude',
  cursor: '.cursor',
  gemini: '.gemini',
};

export function generateAddonFiles(
  projectDir: string,
  addonSourceDir: string,
  agents: string[]
): GenerateResult

export function removeAddonFiles(
  projectDir: string,
  addonName: string,
  agents: string[]
): void

export function syncAddonFiles(
  projectDir: string,
  addonSourceDir: string,
  agents: string[]
): GenerateResult

export function detectModifiedAddonFiles(
  projectDir: string,
  addonName: string
): string[]
```

Logic:
- For each agent, map to the correct base path (`.claude/`, `.cursor/`, `.gemini/`)
- Skills → `{agentPath}/skills/{skillName}/SKILL.md`
- Rules → `{agentPath}/rules/{ruleName}`
- References → `{agentPath}/skills/design-harden/reference/{refName}`
- Use checksums from addonConfig to detect modifications
- Idempotent: skip files that match source checksum
- NOTICE.md: create/update global `NOTICE.md` if addon has attribution

**Tests to satisfy**: addon-file-generator.test.ts (all 16 tests)

---

### Phase 4: CLI Commands (depends on Phase 2, 3)

> Goal: Refactor addon commands for new system.

#### Task 4.1: Refactor addon.ts for multi-addon support

**File**: `packages/cli/src/commands/addon.ts`

Changes:
- Keep backward compatibility with orchestration addon (plugin mode)
- Add code path for non-plugin mode using addonConfig.ts + addonFiles.ts
- `addonCommand('add', name, options)`:
  1. Read devtronic.json (or create if first addon)
  2. Validate addon name against registry
  3. Check if already installed (idempotent)
  4. Prompt confirmation
  5. Call `generateAddonFiles()` for configured agents
  6. Update devtronic.json with file tracking
  7. Create/update NOTICE.md if attribution needed
- `addonCommand('remove', name, options)`:
  1. Read devtronic.json
  2. Check if installed
  3. Detect modified files, warn user
  4. Call `removeAddonFiles()` for all agents
  5. Update devtronic.json
  6. Clean up NOTICE.md if no more attributed addons

#### Task 4.2: Add list and sync subcommands

**File**: `packages/cli/src/commands/addon.ts`

```typescript
export async function addonListCommand(options: AddonOptions): Promise<void>
export async function addonSyncCommand(options: AddonOptions): Promise<void>
```

- `list`: Read registry + devtronic.json, display table
- `sync`: For each installed addon, call `syncAddonFiles()` with current agent config

#### Task 4.3: Register new subcommands in CLI

**File**: `packages/cli/src/index.ts`

Add under `addon` parent command:
- `addon list` — list available and installed addons
- `addon sync` — regenerate addon files for current agent config

#### Task 4.4: Update init to offer design addon

**File**: `packages/cli/src/commands/init.ts`

After core setup, offer available addons (not just orchestration). Use `ADDONS` from registry.

**Tests to satisfy**: addon-v2.test.ts (all 13 tests)

---

### Phase 5: Design Best Practices Addon Content (no deps — can run in parallel with Phase 1-4)

> Goal: Create all addon content files.

#### Task 5.1: Create manifest.json

**File**: `packages/cli/src/addons/design-best-practices/manifest.json`

Exact content as specified in FR-2 of the spec.

#### Task 5.2: Create 5 skill files

Each skill needs a `SKILL.md` with frontmatter (name, description, user-invokable, args):

| Skill | Key Sections |
|-------|-------------|
| **design-init** | Context gathering interview, codebase scan, write Design Context to CLAUDE.md |
| **design-review** | AI Slop Test, visual hierarchy, info architecture, emotional resonance, actionable report |
| **design-refine** | `--direction` arg (bolder/quieter/minimal/delightful), mandatory context, anti-patterns |
| **design-system** | Extract mode (find patterns/tokens) + normalize mode (apply system), migration |
| **design-harden** | Text overflow, i18n, error states, a11y, responsive, edge cases, severity report |

Content derived from impeccable-style-universal analysis, consolidated and adapted. Skills reference the reference docs via relative paths.

#### Task 5.3: Create 7 reference docs

**Directory**: `packages/cli/src/addons/design-best-practices/reference/`

Derive from impeccable-style-universal reference docs with Apache 2.0 attribution. Adapt structure to be more concise and actionable. Content covers:

| File | Key Topics |
|------|-----------|
| typography.md | Vertical rhythm, modular scale, font selection, fluid type, OpenType features |
| color-and-contrast.md | OKLCH, functional palettes, 60-30-10, WCAG contrast, dark mode |
| spatial-design.md | 4pt base, grids, visual hierarchy, container queries, optical adjustments |
| motion-design.md | 100/300/500 rule, easing curves, reduced motion, perceived performance |
| interaction-design.md | 8 interactive states, focus rings, forms, loading, keyboard nav |
| responsive-design.md | Mobile-first, content-driven breakpoints, input detection, safe areas |
| ux-writing.md | Error messages, labels, CTAs, empty states, loading copy |

#### Task 5.4: Create design-quality rule

**File**: `packages/cli/src/addons/design-best-practices/rules/design-quality.md`

Auto-loaded rule with:
- AI Slop Detection quick reference (DON'T list)
- DO list for good design
- Links to reference docs
- Trigger: active during frontend file editing

**Tests to satisfy**: design-best-practices.test.ts (all 28 tests)

---

### Phase 6: Documentation (depends on Phase 1-5)

> Goal: Update all documentation to reflect the addon system and design addon.

#### Task 6.1: Update docs/skills.md

Add section for design addon skills:
- `/design-init` — one-time project design context setup
- `/design-review` — design critique with AI slop detection
- `/design-refine` — directional design adjustment
- `/design-system` — design system extraction and normalization
- `/design-harden` — production hardening for edge cases

#### Task 6.2: Update docs/cli-reference.md

Add commands:
- `devtronic addon list` — list available and installed addons
- `devtronic addon sync` — regenerate addon files for current agent config
- Update `devtronic addon add` with new addon names
- Update `devtronic addon remove` with new addon names

#### Task 6.3: Update docs/customization.md

Add "Customizing Addons" section:
- How addon files are tracked
- How to customize addon skills (edit in `.claude/skills/`)
- How `addon sync` handles customized vs unmodified files
- How to change agent targets

#### Task 6.4: Update docs/plugins.md

- Update skill count references
- Add addon system architecture section
- Explain how addons interact with plugin mode

#### Task 6.5: Update README.md (root)

- Add "Addon System" to features list
- Add brief mention of design-best-practices addon
- Update any skill counts

#### Task 6.6: Update packages/cli/README.md

- Add "Addons" section with available addons
- Show `devtronic addon add design-best-practices` example
- List addon commands

#### Task 6.7: Update CHANGELOG.md

Add entry under `## [Unreleased]`:
```markdown
### Added
- Addon system with multi-agent support (`.claude/`, `.cursor/`, `.gemini/`)
- `devtronic addon list` — list available and installed addons
- `devtronic addon sync` — regenerate addon files for current agent config
- `design-best-practices` addon: 5 design skills + 7 reference docs + 1 quality rule
- Design skills: `/design-init`, `/design-review`, `/design-refine`, `/design-system`, `/design-harden`
- `devtronic.json` config file for addon tracking
- `NOTICE.md` global attribution file for licensed addon content
```

#### Task 6.8: Update CLAUDE.md

Add to Quick Start or References:
- Mention addon system
- Reference design skills if `design-best-practices` is installed

---

### Phase 7: Verification (depends on all phases)

> Goal: Make all generated tests pass. Ensure quality.

#### Task 7.1: Convert it.todo() tests to real tests

For each test file, uncomment the test bodies and add proper imports:
- `addon-manifest.test.ts` — 11 tests
- `addon-file-generator.test.ts` — 16 tests
- `addon-v2.test.ts` — 13 tests
- `design-best-practices.test.ts` — 28 tests

#### Task 7.2: Run quality checks

```bash
npm run typecheck && npm run lint && npm test
```

#### Task 7.3: Manual verification

- [ ] `devtronic addon list` shows both orchestration and design-best-practices
- [ ] `devtronic addon add design-best-practices` generates files in `.claude/skills/`
- [ ] Generated skills have correct frontmatter and content
- [ ] `devtronic addon remove design-best-practices` cleans up all files
- [ ] `devtronic addon sync` regenerates when agent config changes
- [ ] Existing orchestration addon still works in plugin mode
- [ ] `devtronic init` offers addon selection

---

## Dependency Graph

```
Phase 1 (Types & Registry)
    │
    ├──→ Phase 2 (Config & Utils) ──→ Phase 4 (CLI Commands)
    │                                       │
    └──→ Phase 3 (File Generator) ──────────┘
                                            │
Phase 5 (Content) ─────────────────────────→│
  [can run in parallel with 1-4]            │
                                            ↓
                                    Phase 6 (Documentation)
                                            │
                                            ↓
                                    Phase 7 (Verification)
```

**Parallel execution opportunities**:
- Phase 5 (content) can run entirely in parallel with Phases 1-4
- Phase 1 tasks 1.1 and 1.2 can run in parallel
- Phase 6 tasks are all independent of each other

---

## Risk Analysis

### Edge Cases
- [ ] What if devtronic.json doesn't exist yet? → Create on first addon add
- [ ] What if user runs old orchestration addon commands? → Backward compatible
- [ ] What if `.claude/skills/design-init/` already exists from manual creation? → Treat as conflict, warn
- [ ] What if agent path doesn't exist (e.g., no `.cursor/` dir)? → Create it

### Technical Risks
- [ ] Cursor/Gemini skill loading from `skills/` path — verify works before release
- [ ] Reference docs nested in design-harden — verify agents can reference them
- [ ] Large content files may slow down addon add — test with real content

---

## Testing Strategy

**Generated tests** (thoughts/tests/2026-03-05_addon-system.md):
- 68 total test cases across 4 files
- All currently `it.todo()` — implementation makes them pass
- No test modification needed (just uncomment bodies, add imports)

**Existing tests** (must not break):
- addon.test.ts — 13 tests for current orchestration addon
- plugin-addons.test.ts — 10 tests for plugin addon filtering
- files-addons.test.ts — 5 tests for subdirectory utility

---

## Verification

After implementation:
```bash
cd packages/cli
npm run typecheck && npm run lint && npm test
```

All 68 new tests + 378 existing tests must pass.
Then run `/post-review` for final quality check.
