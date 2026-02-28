# Orchestration Addon Implementation

**Date**: 2026-02-28
**Branch**: `feat/orchestration-addon`
**Feature**: Addon system + orchestration workflow skills

## What Was Done

- Added addon type system (`AddonName`, `ADDONS` registry, `enabledAddons` in `ProjectConfig`)
- Made plugin generator filter skills by enabled addons (per-subdirectory copying)
- Added `promptForAddons()` multiselect during `devtronic init`
- Created 3 new skills: `/briefing`, `/recap`, `/handoff`
- Enhanced `/execute-plan` with visual progress indicators and inter-wave handoff
- Updated docs, README, CHANGELOG

## Key Decisions

- **Built-in addon, not separate plugin**: Addon skills live in the templates directory alongside core skills, filtered at generation time. Marketplace always includes all skills.
- **File-existence heuristic for orchestration mode**: `/execute-plan` checks for `thoughts/CONTEXT.md` to enable enhanced behavior. Simple but effective.
- **`enabledAddons` is optional**: All existing code uses `config.enabledAddons || []` for backward compat.
- **No separate `/stages` skill**: Enhanced `/execute-plan` instead to avoid duplication.

## Patterns Discovered

- **Per-subdirectory skill copying**: Changed from `copyTemplateDir(skills/)` to iterating `getSubdirectories(skills/)` and copying each. Enables filtering without changing the core copy logic.
- **Addon registry as source of truth**: `ADDONS` in `types.ts` drives everything — prompts, filtering, counts. Single place to add new addons.

## Issues Found in Review (Fixed)

1. `config reset` and `update --stack` were silently discarding `enabledAddons` — added `enabledAddons: manifest.projectConfig?.enabledAddons` preservation
2. `config set enabledAddons` accepted arbitrary strings — added validation against `ADDONS` keys
3. Addon prompt was firing in `--preview` mode — added `!options.preview` guard
4. `config.test.ts` had stale `ARRAY_KEYS` list — added `enabledAddons`

## Remaining Notes

- Marketplace `build.mjs` has hardcoded "19 core + 3 addon" counts — acceptable for now, will need updating when addons change
- `execute-plan` uses "Step 7.5" numbering — intentionally awkward to signal it's an augmentation, not a core step
