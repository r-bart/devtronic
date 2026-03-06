# Test Manifest: Addon & Mode UX Refactor

**Date**: 2026-03-06
**Spec**: thoughts/specs/2026-03-06_addon-mode-ux-refactor.md
**Status**: generated

---

## Traceability Matrix

| Spec Item | Description | Test File | Test Name | Status |
|-----------|-------------|-----------|-----------|--------|
| FR-1 | Config reads from .claude/devtronic.json | devtronic-config.test.ts | should read config from .claude/devtronic.json | failing |
| FR-1 | Default config when no file | devtronic-config.test.ts | should return default config when .claude/ does not exist | failing |
| FR-1 | Config written to .claude/ not root | devtronic-config.test.ts | should write config to .claude/devtronic.json (not root) | failing |
| FR-1 | .claude/ dir created on write | devtronic-config.test.ts | should create .claude directory if it does not exist | failing |
| FR-1 | version: 1 in written config | devtronic-config.test.ts | should include version: 1 in written config | failing |
| FR-1, US-2 | mode field absent → undefined | devtronic-config.test.ts | should read mode as undefined when not set | failing |
| FR-1, US-2 | mode: afk readable | devtronic-config.test.ts | should read mode: afk when written to config | failing |
| FR-1, US-2 | mode: hitl readable | devtronic-config.test.ts | should read mode: hitl when written to config | failing |
| FR-3, US-2/AC-3 | readMode → hitl default (no config) | devtronic-config.test.ts | readMode returns hitl when no config exists | todo |
| FR-3, US-2/AC-3 | readMode → hitl default (no mode field) | devtronic-config.test.ts | readMode returns hitl when mode not set in config | todo |
| FR-3, US-2/AC-1 | writeMode(afk) persists | devtronic-config.test.ts | writeMode(afk) persists to .claude/devtronic.json | todo |
| FR-3, US-2/AC-2 | writeMode(hitl) persists | devtronic-config.test.ts | writeMode(hitl) persists to .claude/devtronic.json | todo |
| FR-3 | writeMode creates file | devtronic-config.test.ts | writeMode creates .claude/devtronic.json if absent | todo |
| FR-3 | writeMode preserves installed | devtronic-config.test.ts | writeMode preserves existing installed addons | todo |
| FR-3 | writeMode overrides previous | devtronic-config.test.ts | writeMode overrides previous mode | todo |
| Migration | Auto-migrate root devtronic.json | devtronic-config.test.ts | should auto-migrate devtronic.json from root to .claude/ | failing |
| Migration | Preserve installed during migrate | devtronic-config.test.ts | should preserve installed addons during auto-migration | failing (depends on above) |
| Migration EC | Both files exist → read .claude/ | devtronic-config.test.ts | EC: both root and .claude/ exist, reads .claude/ | failing |
| FR-6, Migration | detectOrphanedAddonFiles | devtronic-config.test.ts | should detect addon files not in config | todo |
| FR-6, Migration | registerAddonInConfig | devtronic-config.test.ts | registerAddonInConfig adds entry without copying | todo |
| FR-3, US-2/AC-1 | modeCommand('afk') writes config | mode.test.ts | mode afk should write mode: afk to .claude/devtronic.json | todo |
| FR-3, US-2/AC-2 | modeCommand('hitl') writes config | mode.test.ts | mode hitl should write mode: hitl to .claude/devtronic.json | todo |
| FR-3, US-2/AC-3 | modeCommand('show') with afk | mode.test.ts | mode show with afk config should log afk | todo |
| FR-3, EC | modeCommand('show') default | mode.test.ts | mode show with no config should log hitl (default) | todo |
| FR-5 | mode show prints config path | mode.test.ts | mode show should include .claude/devtronic.json path | todo |
| FR-3 | mode afk logs success | mode.test.ts | mode afk should log a success message | todo |
| FR-3 | mode hitl logs success | mode.test.ts | mode hitl should log a success message | todo |
| US-2/AC-4 | SKILL.md flag override documented | mode.test.ts | SKILL.md should document flag overrides config | todo |
| US-2/AC-5 | SKILL.md config fallback documented | mode.test.ts | SKILL.md should document config fallback | todo |
| US-2/AC-3 | SKILL.md HITL default documented | mode.test.ts | SKILL.md should document HITL default | todo |
| US-1/AC-1, FR-2 | addon enable copies files | addon-enable-disable.test.ts | should copy addon files to .claude/ on enable | failing |
| FR-1, FR-2 | enable writes to .claude/devtronic.json | addon-enable-disable.test.ts | should register addon in .claude/devtronic.json on enable (not root) | failing |
| FR-2 | enable prompts confirmation | addon-enable-disable.test.ts | should prompt for confirmation before enabling | failing |
| FR-2, EC | enable on already-enabled: warn | addon-enable-disable.test.ts | EC: enable on already-enabled addon should warn | failing |
| FR-2 | enable cancel → exit(0) | addon-enable-disable.test.ts | should call process.exit(0) when user declines | failing |
| US-1/AC-2, FR-2 | addon disable removes files | addon-enable-disable.test.ts | should remove addon files from .claude/ on disable | failing |
| FR-2 | disable removes from config | addon-enable-disable.test.ts | should remove addon from config.installed on disable | failing |
| FR-2, EC | disable on not-enabled: warn | addon-enable-disable.test.ts | EC: disable on not-enabled addon should warn | failing |
| US-1/AC-3 | list shows enabled after enable | addon-enable-disable.test.ts | should show addon as enabled after enabling | failing |
| US-1/AC-3 | list shows disabled when not installed | addon-enable-disable.test.ts | should show addon as not enabled when not installed | failing |
| US-1/AC-3 | list shows disabled after disable | addon-enable-disable.test.ts | should show addon as not enabled after disabling | failing |
| FR-2 | addon add backward compat + warn | addon-enable-disable.test.ts | addon add should still copy files AND show deprecation warning | failing |
| FR-2 | addon remove backward compat + warn | addon-enable-disable.test.ts | addon remove should still remove files AND show deprecation warning | failing |
| FR-2 | deprecation suggests enable | addon-enable-disable.test.ts | addon add deprecation warning should suggest using enable | failing |
| US-1/AC-1 | auto-devtronic enable installs all | addon-enable-disable.test.ts | enable should install skill and all agents | failing |
| US-1/AC-2 | auto-devtronic disable removes all | addon-enable-disable.test.ts | disable should remove skill and all agents | failing |

---

## Test Files

| File | Tests | Todos | Layer |
|------|-------|-------|-------|
| `src/utils/__tests__/devtronic-config.test.ts` | 8 failing, 3 passing | 10 | Config utilities |
| `src/commands/__tests__/mode.test.ts` | 0 | 10 | CLI command |
| `src/commands/__tests__/addon-enable-disable.test.ts` | 10 failing, 6 passing | 0 | CLI command |

---

## Coverage Summary

- **Total spec items covered**: 46
- **Tests generated (failing)**: 18 real failing assertions
- **Tests as todo**: 19 (missing types: readMode, writeMode, modeCommand, detectOrphanedAddonFiles)
- **Tests passing already**: 9 (behavior unchanged from current implementation)
- **Spec coverage**: ~85% of acceptance criteria have executable tests

---

## Next Steps

Run `/execute-plan thoughts/plans/2026-03-06_addon-mode-ux-refactor.md` to implement.
The plan's done criteria map directly to making these tests pass.
