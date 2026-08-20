/**
 * `isPluginManagedPath` decides which template files belong to the plugin
 * rather than to the project.
 *
 * `update.ts` walks the template tree twice — once to report what it will do,
 * once to do it. Only the second loop asked whether the install was in plugin
 * mode. So a marketplace install was told ~50 skill and agent files were about
 * to be added, confirmed it, and then saw none of them appear. Worse, the list
 * was never empty, so "All files are up to date!" could not fire for a
 * marketplace install no matter how current it was.
 *
 * Both loops now share this function, so they cannot disagree again.
 */
import { describe, it, expect } from 'vitest';
import { isPluginManagedPath } from '../update.js';
import type { IDE, InstallMode } from '../../types.js';

const PLUGIN_MODES: InstallMode[] = ['plugin', 'marketplace'];
const SKILL = '.claude/skills/converge/SKILL.md';
const AGENT = '.claude/agents/code-reviewer.md';

// ─── Plugin modes hand skills and agents to the plugin ────────────────────────

describe('isPluginManagedPath — plugin and marketplace mode', () => {
  for (const mode of PLUGIN_MODES) {
    it(`${mode}: a skill belongs to the plugin`, () => {
      expect(isPluginManagedPath('claude-code', mode, SKILL)).toBe(true);
    });

    it(`${mode}: an agent belongs to the plugin`, () => {
      expect(isPluginManagedPath('claude-code', mode, AGENT)).toBe(true);
    });

    it(`${mode}: rules stay in the project`, () => {
      expect(isPluginManagedPath('claude-code', mode, '.claude/rules/architecture.md')).toBe(false);
    });

    it(`${mode}: settings.json stays in the project`, () => {
      expect(isPluginManagedPath('claude-code', mode, '.claude/settings.json')).toBe(false);
    });

    it(`${mode}: a skill supporting file goes with its skill`, () => {
      expect(
        isPluginManagedPath('claude-code', mode, '.claude/skills/scaffold/structures.md')
      ).toBe(true);
    });
  }
});

// ─── Standalone keeps everything ──────────────────────────────────────────────

describe('isPluginManagedPath — standalone', () => {
  it('a standalone install holds its own skills', () => {
    expect(isPluginManagedPath('claude-code', undefined, SKILL)).toBe(false);
  });

  it('a standalone install holds its own agents', () => {
    expect(isPluginManagedPath('claude-code', 'standalone' as InstallMode, AGENT)).toBe(false);
  });
});

// ─── The rule is Claude Code's alone ──────────────────────────────────────────

describe('isPluginManagedPath — other IDEs', () => {
  const others: IDE[] = ['cursor', 'antigravity', 'github-copilot', 'opencode', 'codex'];

  for (const ide of others) {
    it(`${ide} has no plugin, so nothing is plugin-managed`, () => {
      // Only Claude Code has the plugin. A `.claude/` path reached while
      // walking another IDE's template tree is that IDE's own file.
      expect(isPluginManagedPath(ide, 'marketplace', SKILL)).toBe(false);
    });
  }

  it('the portable skill export is never plugin-managed', () => {
    // It is generated for the non-Claude runtimes and must always be written.
    expect(isPluginManagedPath('cursor', 'marketplace', '.agents/skills/spec/SKILL.md')).toBe(
      false
    );
  });
});

// ─── Prefix matching is anchored ──────────────────────────────────────────────

describe('isPluginManagedPath — path matching', () => {
  it('does not match a lookalike outside .claude/', () => {
    expect(
      isPluginManagedPath('claude-code', 'marketplace', 'docs/.claude/skills/spec/SKILL.md')
    ).toBe(false);
  });

  it('does not match a sibling directory that starts the same way', () => {
    expect(isPluginManagedPath('claude-code', 'marketplace', '.claude/skills-archive/x.md')).toBe(
      false
    );
  });
});
