# Test Manifest: Addon System + Design Best Practices Addon

**Date**: 2026-03-05
**Spec**: thoughts/specs/2026-03-05_addon-system.md
**Status**: generated

---

## Traceability Matrix

| Spec Item | Description | Test File | Test Name | Status |
|-----------|-------------|-----------|-----------|--------|
| FR-2 | Parse valid addon manifest | addon-manifest.test.ts | should parse valid addon manifest | todo |
| FR-2 | Reject manifest missing name | addon-manifest.test.ts | should reject manifest with missing name | todo |
| FR-2 | Reject manifest missing version | addon-manifest.test.ts | should reject manifest with missing version | todo |
| FR-2 | Reject empty skills array | addon-manifest.test.ts | should reject manifest with empty skills array | todo |
| FR-2 | Accept manifest without attribution | addon-manifest.test.ts | should accept manifest without attribution field | todo |
| FR-4 | Read addon config | addon-manifest.test.ts | should read addon config from devtronic config file | todo |
| FR-4 | Write addon to config with tracking | addon-manifest.test.ts | should write installed addon to config with file tracking | todo |
| FR-4 | Remove addon from config | addon-manifest.test.ts | should remove addon from config | todo |
| FR-4 | Track file checksums | addon-manifest.test.ts | should track file checksums for each installed addon | todo |
| US-5/AC-1 | Store agent targets in config | addon-manifest.test.ts | should store agent targets in config | todo |
| US-5/AC-3 | Default to claude-only | addon-manifest.test.ts | should default to claude-only when no agents configured | todo |
| FR-3 | Generate claude skills | addon-file-generator.test.ts | should generate skill files in .claude/skills/ | todo |
| FR-3 | Generate claude rules | addon-file-generator.test.ts | should place rules in .claude/rules/ | todo |
| FR-3 | Nest reference docs | addon-file-generator.test.ts | should nest reference docs inside design-harden skill | todo |
| FR-3 | Generate cursor files | addon-file-generator.test.ts | should generate files in .cursor/skills/ | todo |
| FR-3 | Generate gemini files | addon-file-generator.test.ts | should generate files in .gemini/skills/ | todo |
| US-2/AC-2 | Generate for all agents | addon-file-generator.test.ts | should generate files for all configured agents | todo |
| US-5/AC-4 | Sync on agent config change | addon-file-generator.test.ts | should regenerate on sync when agent config changes | todo |
| US-2/AC-3 | Idempotent install | addon-file-generator.test.ts | should be idempotent — running twice produces identical output | todo |
| EC-1 | Detect customized files | addon-file-generator.test.ts | should detect customized files via checksum comparison | todo |
| EC-2 | Skip identical on reinstall | addon-file-generator.test.ts | should skip identical files silently on reinstall | todo |
| US-3/AC-1 | Remove addon files | addon-file-generator.test.ts | should remove all addon files for an agent | todo |
| US-3/AC-3 | Remove from all agents | addon-file-generator.test.ts | should remove from all configured agent directories | todo |
| EC-3 | Update unmodified on sync | addon-file-generator.test.ts | should update unmodified files during sync | todo |
| EC-4 | Preserve customized on sync | addon-file-generator.test.ts | should preserve customized files during sync and warn | todo |
| Attribution | Create NOTICE.md | addon-file-generator.test.ts | should create NOTICE.md on first attributed addon install | todo |
| Attribution | Clean NOTICE.md | addon-file-generator.test.ts | should clean up NOTICE.md when last attributed addon removed | todo |
| US-2/AC-1 | Add copies files | addon-v2.test.ts | should copy addon files to repo on add | todo |
| US-2/AC-2 | Add generates for all agents | addon-v2.test.ts | should generate files for all configured agents | todo |
| US-2/AC-3 | Add is idempotent | addon-v2.test.ts | should be idempotent — running twice does not duplicate files | todo |
| US-2/AC-4 | Add prompts confirmation | addon-v2.test.ts | should prompt for confirmation before writing files | todo |
| FR-5 | Reject unknown addon | addon-v2.test.ts | should reject unknown addon name | todo |
| US-3/AC-1 | Remove deletes files | addon-v2.test.ts | should delete addon files on remove | todo |
| US-3/AC-2 | Remove warns customized | addon-v2.test.ts | should warn about customized files before removing | todo |
| US-3/AC-3 | Remove from all agents | addon-v2.test.ts | should remove from all configured agent directories | todo |
| US-3/AC-4 | Remove updates config | addon-v2.test.ts | should update addon registry in config | todo |
| US-4/AC-1 | List available addons | addon-v2.test.ts | should show all available first-party addons | todo |
| US-4/AC-2 | List marks installed | addon-v2.test.ts | should mark installed addons | todo |
| US-4/AC-3 | List shows agent targets | addon-v2.test.ts | should show agent targets for installed addons | todo |
| FR-5 | Sync regenerates | addon-v2.test.ts | should regenerate addon files for current agent configuration | todo |
| FR-1 | Addon dir exists | design-best-practices.test.ts | addon source directory exists | todo |
| FR-2 | Valid manifest.json | design-best-practices.test.ts | manifest.json exists and is valid JSON | todo |
| FR-2 | Manifest 5 skills | design-best-practices.test.ts | manifest declares all 5 skills | todo |
| FR-2 | Manifest 7 references | design-best-practices.test.ts | manifest declares all 7 reference docs | todo |
| FR-2 | Manifest rule | design-best-practices.test.ts | manifest declares design-quality rule | todo |
| FR-2 | Manifest attribution | design-best-practices.test.ts | manifest includes attribution for Apache 2.0 content | todo |
| FR-6 | 5 skill files exist | design-best-practices.test.ts | design-init..design-harden/SKILL.md exists | todo |
| FR-6 | design-init invokable | design-best-practices.test.ts | design-init skill has user-invokable: true | todo |
| FR-6 | design-review invokable | design-best-practices.test.ts | design-review skill has user-invokable: true | todo |
| US-8/AC-1 | design-refine directions | design-best-practices.test.ts | design-refine skill accepts --direction argument | todo |
| US-9/AC-4 | design-system modes | design-best-practices.test.ts | design-system skill supports extract and normalize modes | todo |
| FR-7 | 7 reference docs exist | design-best-practices.test.ts | typography..ux-writing.md exists | todo |
| FR-7 | Typography covers scales | design-best-practices.test.ts | typography.md covers type scales and fluid sizing | todo |
| FR-7 | Color covers OKLCH/WCAG | design-best-practices.test.ts | color-and-contrast.md covers OKLCH and WCAG | todo |
| FR-7 | Motion covers reduced-motion | design-best-practices.test.ts | motion-design.md covers reduced motion | todo |
| FR-8 | Rule file exists | design-best-practices.test.ts | design-quality.md rule file exists | todo |
| FR-8 | Rule has AI slop detection | design-best-practices.test.ts | rule includes AI slop detection guidance | todo |
| FR-8 | Rule has DO/DON'T ref | design-best-practices.test.ts | rule includes DO/DON'T quick reference | todo |

---

## Test Files

| File | Tests | Todos | Layer |
|------|-------|-------|-------|
| src/utils/__tests__/addon-manifest.test.ts | 11 | 11 | Utils |
| src/generators/__tests__/addon-file-generator.test.ts | 16 | 16 | Generators |
| src/commands/__tests__/addon-v2.test.ts | 13 | 13 | Commands |
| src/addons/__tests__/design-best-practices.test.ts | 28 | 28 | Content |

---

## Coverage Summary

- **Total spec items**: 68 (across 10 user stories + 8 FRs + edge cases)
- **Tests generated**: 0 (failing) — all are `it.todo()` because modules don't exist yet
- **Tests as todo**: 68
- **Spec coverage**: 100% of acceptance criteria have tests

---

## Next Steps

Run `/create-plan` to create the implementation plan.
The plan will detect this manifest and include "make tests pass" in its done criteria.

### Immutability Rule
These test files are marked `@immutable`. If a test seems wrong:
1. Update the spec first
2. Re-run `/generate-tests` to regenerate
3. Never edit generated test files directly
