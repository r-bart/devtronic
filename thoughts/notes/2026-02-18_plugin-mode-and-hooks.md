# Notes: Plugin Mode (tut-ai) + Hooks

**Date**: 2026-02-18
**Branch**: develop

## Key Decisions

- **Plugin name**: `tut-ai` (namespaced skills: `/tut-ai:brief`, `/tut-ai:spec`, etc.)
- **Marketplace name**: `tutellus-local`
- **Plugin location**: `.claude-plugins/tut-ai/` (local marketplace)
- **Rules remain standalone**: `.claude/rules/` stays outside the plugin (plugins don't support rules)
- **Bifurcation approach**: Plugin mode only for claude-code IDE; other IDEs unchanged
- **Stop hook as command**: Changed from `type: "prompt"` (can't run commands) to `type: "command"` with `stop-guard.sh` that actually executes quality checks
- **PostToolUse synchronous**: Lint-fix must complete before Claude reads the file again — `async: true` would cause race conditions

## Patterns

- **Save-restore for user-modified files**: When `generatePlugin()` overwrites all files (side effect), save user-modified content before calling it, then restore after. **MUST compare disk content against `originalChecksum`, NOT compare manifest fields** (`checksum === originalChecksum` is always true since `createManifestEntry` sets both identically).
- **Idempotent settings**: `registerPlugin()` checks before writing — doesn't overwrite user-disabled plugins.
- **Manifest normalization**: `readManifest()` fills in missing `installMode` and `pluginPath` for legacy manifests.
- **Script chmod**: ALL generated scripts (checkpoint.sh, stop-guard.sh) must be chmod'd 0o755 at every call site (init, update, migrate, regenerate).
- **Shell injection prevention**: Use single-quoted variable assignment + `eval` for user-provided commands in generated scripts. Escape single quotes with `'\\''`.

## Bugs Found & Fixed

- **generatePlugin overwrites user mods**: `generatePlugin()` writes unconditionally to disk. In update flows, user-modified plugin files need to be saved before and restored after. Fixed with save-restore pattern.
- **Save-restore compared wrong fields**: Original code compared `fileInfo.checksum !== fileInfo.originalChecksum` which is always false. Fixed to read disk content and compare against `originalChecksum`.
- **stop-guard.sh not executable**: Only `checkpoint.sh` was chmod'd at each call site. Fixed to chmod both scripts.
- **Command injection in stop-guard.sh**: `qualityCommand` was interpolated directly into bash. Fixed with single-quoted variable + eval pattern.
- **Stop hook was prompt, not command**: Prompt hooks can't execute commands — "Run quality checks" was impossible. Changed to command type with stop-guard.sh.
- **stop_hook_active grep brittle**: `"stop_hook_active".*true` didn't handle minified JSON. Fixed with `[[:space:]]*:[[:space:]]*true`.
- **SubagentStop prompt over-promised**: Claimed to check code syntax (impossible for prompt hooks). Reworded to evaluate agent metadata only.
- **Lint error in test**: Used `require()` instead of ESM `import` for `createHash`. Fixed.
- **Test mock incomplete**: `ProjectAnalysis` mocks missing `hasTypescript`, `hasGit`, `hasTests`, `build`, `dev`, `api` fields. Fixed with `createAnalysis()` factory helper.

## Gotchas

- `pnpm run typecheck` fails from project root because parent `package.json` has `"packageManager": "yarn"`. Run from `packages/cli/` using `npm run typecheck`.
- `dist/index.js` is tracked in git — changes show up in diff after build.
- Plugin hooks use `${CLAUDE_PLUGIN_ROOT}` (single-quoted in JSON) which Claude Code resolves at runtime.
- `extraKnownMarketplaces` in settings.json uses object format (`{ source: { source: 'directory', path: '...' } }`), not array.
- Prompt hooks receive JSON on stdin but **cannot execute commands or read files**. Only agent hooks (`type: "agent"`) can use tools.
- `$ARGUMENTS` in prompt hooks injects the hook's JSON input. If omitted, input is appended to the prompt.

## Files Created

- `src/utils/settings.ts` — .claude/settings.json read/write
- `src/generators/hooks.ts` — 5 hooks + stop-guard.sh + checkpoint.sh generators
- `src/generators/plugin.ts` — full plugin structure generator
- `packages/marketplace/` — standalone npm distribution
- `docs/plugins.md` — comprehensive plugin documentation

## Test Coverage

- 14 tests for settings utility
- 31 tests for hooks generator (was 23)
- 21 tests for plugin generator (was 20)
- 14 tests for update command helpers
- Total: 265 tests (was 185 before)
