# PRD: Addon System + Design Best Practices Addon

**Date**: 2026-03-05
**Status**: draft

---

## Executive Summary

Devtronic needs a first-party addon system that lets users install curated skill packs for specific domains. The first addon, `design-best-practices`, packages frontend design knowledge (typography, color, layout, accessibility, motion, interaction, UX writing) as skills and reference docs. This establishes devtronic's extensibility model and delivers immediate value to frontend teams.

---

## Problem Statement

### Current State
Devtronic ships a fixed set of skills focused on engineering workflow (spec, plan, test, execute, review). Users building frontend products lack design guidance — the AI agent writes functional code but produces generic, "AI slop" interfaces with no design point of view.

### Pain Points
- No mechanism to extend devtronic with domain-specific knowledge
- Frontend users get no design quality guidance from the toolchain
- AI agents default to generic aesthetics (purple gradients, glassmorphism, card grids)
- Users who want design skills must manually create and maintain them
- No way to share curated skill packs across projects

---

## Goals & Non-Goals

### Goals
1. Create a first-party addon system: install, remove, list, and generate addon files
2. Support multi-agent generation (configurable: .claude, .cursor, .gemini, etc.)
3. Ship `design-best-practices` as the first addon, proving the system works
4. Addon files live in the user's repo (versionable, customizable)

### Non-Goals
- Third-party addon registry or npm publishing (future consideration)
- Runtime addon resolution from node_modules
- Modifying existing devtronic skills (addons are independent, not pipeline-integrated)
- Framework-specific content (React, Vue, etc.) — design addon is framework-agnostic

---

## User Stories

### Addon System

**US-1: Install addon during onboarding**
**As a** developer setting up devtronic
**I want to** select optional addons during `devtronic init`
**So that** my project gets domain-specific skills from day one

Acceptance Criteria:
- [ ] `devtronic init` presents available addons after core setup
- [ ] User can select zero or more addons
- [ ] Selected addons generate files in the configured agent directories
- [ ] Skipping addons is the default (no addons forced)

**US-2: Add addon post-setup**
**As a** developer with devtronic already configured
**I want to** run `devtronic addon add design-best-practices`
**So that** I can extend my project with design skills at any time

Acceptance Criteria:
- [ ] `devtronic addon add <name>` copies addon files to repo
- [ ] Files generated for all configured agents
- [ ] Idempotent: running twice doesn't duplicate files
- [ ] Confirmation prompt before writing files

**US-3: Remove addon**
**As a** developer who no longer needs an addon
**I want to** run `devtronic addon remove design-best-practices`
**So that** addon files are cleaned from my project

Acceptance Criteria:
- [ ] `devtronic addon remove <name>` deletes addon files
- [ ] Warns if user has customized any addon files
- [ ] Removes from all configured agent directories
- [ ] Updates addon registry in config

**US-4: List available and installed addons**
**As a** developer
**I want to** run `devtronic addon list`
**So that** I can see what's available and what's installed

Acceptance Criteria:
- [ ] Shows all first-party addons with descriptions
- [ ] Marks installed addons
- [ ] Shows agent targets for installed addons

**US-5: Configure agent targets**
**As a** developer using multiple AI tools
**I want to** choose which agents get addon files
**So that** only the tools I use get configured

Acceptance Criteria:
- [ ] Configuration stored in devtronic config
- [ ] Supported targets: claude, cursor, gemini (extensible)
- [ ] Default: claude only
- [ ] Can be changed at any time; `devtronic addon sync` regenerates

### Design Best Practices Addon

**US-6: Design initialization**
**As a** frontend developer
**I want to** run `/design-init` to gather my project's design context
**So that** all design skills have the right context for my brand/audience

Acceptance Criteria:
- [ ] Interactive interview about users, brand, aesthetic direction
- [ ] Scans codebase first for existing design tokens, fonts, colors
- [ ] Writes `## Design Context` section to CLAUDE.md (or equivalent)
- [ ] Only needs to run once per project

**US-7: Design review**
**As a** developer who just built UI
**I want to** run `/design-review` to get design critique
**So that** I catch design quality issues before shipping

Acceptance Criteria:
- [ ] Evaluates visual hierarchy, information architecture, emotional resonance
- [ ] Includes "AI Slop Test" — detects generic AI aesthetics
- [ ] Generates actionable report with priority issues
- [ ] Suggests which refine direction to use (bolder, quieter, minimal, etc.)

**US-8: Design refinement**
**As a** developer iterating on UI
**I want to** run `/design-refine --direction=bolder` to adjust design intensity
**So that** I can dial the design in the right direction

Acceptance Criteria:
- [ ] Supports directions: bolder, quieter, minimal, delightful
- [ ] Gathers context before making changes (mandatory)
- [ ] References design principles and anti-patterns
- [ ] Each direction has clear guidelines for what changes

**US-9: Design system extraction**
**As a** developer with growing UI
**I want to** run `/design-system` to extract reusable patterns
**So that** my design stays consistent as the project grows

Acceptance Criteria:
- [ ] Identifies repeated components, hard-coded values, inconsistent variations
- [ ] Suggests tokens to create (colors, spacing, typography)
- [ ] Can normalize existing UI to match design system
- [ ] Supports extract mode (find patterns) and normalize mode (apply system)

**US-10: Design hardening**
**As a** developer preparing for production
**I want to** run `/design-harden` to catch edge cases
**So that** my UI handles real-world conditions

Acceptance Criteria:
- [ ] Tests text overflow, i18n, error states, empty states
- [ ] Checks accessibility (contrast, keyboard nav, ARIA)
- [ ] Validates responsive behavior and touch targets
- [ ] Reports issues with severity and fix suggestions

---

## Functional Requirements

### FR-1: Addon Registry

Addons are defined in the devtronic package at a known location:

```
packages/cli/src/addons/
  registry.ts           # List of available addons with metadata
  design-best-practices/
    manifest.json       # Addon metadata (name, description, version, files)
    skills/
      design-init/SKILL.md
      design-review/SKILL.md
      design-refine/SKILL.md
      design-system/SKILL.md
      design-harden/SKILL.md
    reference/
      typography.md
      color-and-contrast.md
      spatial-design.md
      motion-design.md
      interaction-design.md
      responsive-design.md
      ux-writing.md
    rules/
      design-quality.md
```

### FR-2: Addon Manifest

Each addon has a `manifest.json`:

```json
{
  "name": "design-best-practices",
  "description": "Frontend design quality skills: typography, color, layout, accessibility, motion, and UX writing",
  "version": "1.0.0",
  "license": "MIT",
  "attribution": "Reference docs derived from Anthropic's frontend-design skill (Apache 2.0). See NOTICE.",
  "files": {
    "skills": [
      "design-init",
      "design-review",
      "design-refine",
      "design-system",
      "design-harden"
    ],
    "reference": [
      "typography.md",
      "color-and-contrast.md",
      "spatial-design.md",
      "motion-design.md",
      "interaction-design.md",
      "responsive-design.md",
      "ux-writing.md"
    ],
    "rules": [
      "design-quality.md"
    ]
  }
}
```

### FR-3: File Generation

When an addon is installed, files are copied to **standard agent paths** (not a separate addons/ dir) to guarantee compatibility:

```
# For Claude Code (.claude/)
.claude/
  skills/
    design-init/SKILL.md
    design-review/SKILL.md
    design-refine/SKILL.md
    design-system/SKILL.md
    design-harden/SKILL.md
    design-harden/reference/
      typography.md
      color-and-contrast.md
      spatial-design.md
      motion-design.md
      interaction-design.md
      responsive-design.md
      ux-writing.md
  rules/
    design-quality.md

# For Cursor (.cursor/) - same structure
.cursor/
  skills/
    design-init/SKILL.md
    ...
  rules/
    design-quality.md
```

Devtronic config tracks which files belong to which addon for clean add/remove/sync.

### FR-4: Config Tracking

Installed addons are tracked in devtronic's config:

```json
{
  "addons": {
    "installed": ["design-best-practices"],
    "agents": ["claude", "cursor"]
  }
}
```

### FR-5: CLI Commands

```bash
# During onboarding
devtronic init
# ... core setup ...
# "Would you like to install optional addons?"
# [x] design-best-practices - Frontend design quality skills

# Post-setup management
devtronic addon list                          # List available/installed
devtronic addon add design-best-practices     # Install addon
devtronic addon remove design-best-practices  # Remove addon
devtronic addon sync                          # Regenerate for current agent config
```

### FR-6: Design Addon Skills (5 skills)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/design-init` | Once per project | Gather design context, write to CLAUDE.md |
| `/design-review` | After UI work | Critique + audit + AI slop detection |
| `/design-refine` | During iteration | Directional adjustment (--direction arg) |
| `/design-system` | Growing projects | Extract tokens + normalize to system |
| `/design-harden` | Pre-production | Edge cases, a11y, i18n, responsive |

### FR-7: Reference Docs (7 files)

Loaded by skills as needed. Content derived from industry best practices with Apache 2.0 attribution:

| Reference | Covers |
|-----------|--------|
| typography.md | Type scales, pairing, fluid sizing, loading, accessibility |
| color-and-contrast.md | OKLCH, palettes, WCAG contrast, dark mode, tinted neutrals |
| spatial-design.md | Spacing systems, grids, hierarchy, container queries, optical adjustments |
| motion-design.md | Duration/easing rules, reduced motion, perceived performance |
| interaction-design.md | 8 interactive states, focus rings, forms, loading, keyboard nav |
| responsive-design.md | Mobile-first, breakpoints, input detection, safe areas, images |
| ux-writing.md | Error messages, labels, CTAs, empty states, microcopy |

### FR-8: Design Quality Rule (auto-loaded)

A rule file that's automatically loaded by the agent, providing passive design guidance:

- Anti-pattern detection ("AI Slop" tells)
- DO/DON'T quick reference
- Link to reference docs for deeper guidance
- Active during any frontend file editing

---

## Technical Considerations

### Architecture Alignment

The addon system lives in the Application layer:

```
packages/cli/src/
  domain/
    addon/
      Addon.ts              # Addon entity
      AddonManifest.ts       # Value object for manifest
      AddonRepository.ts     # Interface
  application/
    addon/
      InstallAddonUseCase.ts
      RemoveAddonUseCase.ts
      ListAddonsUseCase.ts
      SyncAddonsUseCase.ts
  infrastructure/
    addon/
      FileSystemAddonRepository.ts  # Reads from bundled addons
      AgentFileGenerator.ts          # Writes to .claude/.cursor/.gemini
  presentation/
    commands/
      addon.ts               # CLI command handlers
```

### Addon Content Storage

Addon content (SKILL.md files, references, rules) is bundled with the npm package. They're static text files read at install time and written to the user's project.

### Multi-Agent Generation

Each agent has slightly different conventions. The generator needs to handle:
- **Path mapping**: `.claude/skills/` vs `.cursor/skills/` vs `.gemini/skills/`
- **Skill format**: All three currently support markdown skill files
- **Rule loading**: Claude loads from `.claude/rules/`, Cursor from `.cursor/rules/`, etc.

For v1, the content is identical across agents (same markdown files, different paths). Agent-specific adaptations can come later.

### File Placement Strategy (RESOLVED)

Addon files go to **standard agent paths** (not a separate `addons/` directory) to guarantee agent compatibility:

```
.claude/
  skills/
    design-init/SKILL.md          # addon-owned
    design-review/SKILL.md        # addon-owned
    design-refine/SKILL.md        # addon-owned
    design-system/SKILL.md        # addon-owned
    design-harden/SKILL.md        # addon-owned
    design-harden/reference/      # refs nested in consuming skill
      typography.md
      color-and-contrast.md
      spatial-design.md
      motion-design.md
      interaction-design.md
      responsive-design.md
      ux-writing.md
  rules/
    design-quality.md             # addon-owned
```

Devtronic config tracks which files belong to which addon:

```json
{
  "addons": {
    "agents": ["claude"],
    "installed": {
      "design-best-practices": {
        "version": "1.0.0",
        "files": [
          "skills/design-init",
          "skills/design-review",
          "skills/design-refine",
          "skills/design-system",
          "skills/design-harden",
          "rules/design-quality.md"
        ]
      }
    }
  }
}
```

This enables clean `addon remove` (delete tracked files) and `addon sync` (regenerate/update).

### File Conflict Handling

When installing an addon where files already exist:
- If files are identical to source: skip silently
- If files differ (user customized): warn and ask to overwrite or skip
- Track original checksums to detect customization

### Addon Sync & Updates (RESOLVED)

`devtronic addon sync` updates addon content when a new devtronic version ships updated files:
- Compares current file checksum against stored "original" checksum
- If file is unmodified: update silently
- If file was customized by user: warn, offer to overwrite or keep custom version
- Updates version in config tracking

### Attribution (RESOLVED)

A single global `NOTICE.md` file in the project root tracks all attribution. When the first addon with attribution requirements is installed, devtronic creates/updates `NOTICE.md`. When the last such addon is removed, the file is cleaned up.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Addon install works cleanly | 100% of installs succeed | CI test suite |
| Multi-agent generation correct | Files appear in all configured agent dirs | Integration tests |
| Design addon skill count | 5 skills + 7 refs + 1 rule | File count check |
| Addon add/remove idempotent | No duplicates, clean removal | Integration tests |

---

## Open Questions

All resolved. See RESOLVED tags in Technical Considerations.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent path conventions change | Medium | Abstract path mapping in AgentFileGenerator, easy to update |
| Addon files mixed with core skills | Low | `design-` prefix on all addon skills; config tracks ownership |
| Design content becomes stale | Medium | Version in manifest, `addon sync` updates with checksum diffing |
| Users confuse addon skills with core skills | Low | Clear `design-` prefix naming convention |
| Addon remove misses files | Medium | Config tracks exact file list; integration tests verify clean removal |
