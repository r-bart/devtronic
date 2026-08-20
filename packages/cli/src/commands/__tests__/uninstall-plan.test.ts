/**
 * `planUninstall` decides what an uninstall deletes.
 *
 * The distinction it encodes is the whole point: a *managed* file is one
 * devtronic wrote and owns, and it goes without asking; a *user-authored* file
 * is one devtronic seeded and the user then made theirs, and it only goes on an
 * explicit yes. A file in the wrong bucket is work the user cannot get back.
 *
 * This replaces a test file that reimplemented the uninstall loop inside itself
 * and never imported the command, so it passed no matter what the command did.
 */
import { describe, it, expect } from 'vitest';
import { planUninstall, USER_AUTHORED_FILES } from '../uninstall.js';
import type { UninstallInventory, UserContentChoices } from '../uninstall.js';
import type { InstallMode, ManifestFile } from '../../types.js';

function tracked(): ManifestFile {
  return { checksum: 'abc', originalChecksum: 'abc', modified: false };
}

function plan(
  trackedPaths: string[],
  opts: {
    onDisk?: string[];
    choices?: UserContentChoices;
    installMode?: InstallMode;
    hasPluginDir?: boolean;
    hasThoughts?: boolean;
  } = {}
) {
  // Everything tracked is on disk unless `onDisk` narrows it.
  const present = opts.onDisk ?? trackedPaths;
  const inventory: UninstallInventory = {
    manifest: {
      files: Object.fromEntries(trackedPaths.map((f) => [f, tracked()])),
      installMode: opts.installMode,
    },
    existsInProject: (path) => present.includes(path),
    hasPluginDir: opts.hasPluginDir ?? false,
    hasThoughts: opts.hasThoughts ?? false,
  };
  return planUninstall(inventory, opts.choices ?? {});
}

// ─── Managed files ────────────────────────────────────────────────────────────

describe('planUninstall — managed files', () => {
  it('removes the rules and templates devtronic owns', () => {
    const result = plan(['.claude/rules/architecture.md', '.cursor/rules/quality.mdc']);
    expect(result.managedFiles).toEqual([
      '.claude/rules/architecture.md',
      '.cursor/rules/quality.mdc',
    ]);
  });

  it('skips a tracked file that is already gone', () => {
    const result = plan(['.claude/rules/architecture.md', '.claude/rules/gone.md'], {
      onDisk: ['.claude/rules/architecture.md'],
    });
    expect(result.managedFiles).toEqual(['.claude/rules/architecture.md']);
    expect(result.missingFiles).toEqual(['.claude/rules/gone.md']);
  });

  it('leaves thoughts/ to its own question', () => {
    const result = plan(['thoughts/specs/auth.md', '.claude/rules/quality.md']);
    expect(result.managedFiles).toEqual(['.claude/rules/quality.md']);
  });

  it('leaves plugin files to the plugin directory removal', () => {
    const result = plan(['.claude-plugins/devtronic/hooks/hooks.json', 'AGENTS.md']);
    expect(result.managedFiles).toEqual([]);
  });

  it('removes exported portable skills as managed files', () => {
    // devtronic wrote them and owns them; nothing hand-edited lives there.
    const result = plan(['.agents/skills/audit/SKILL.md']);
    expect(result.managedFiles).toEqual(['.agents/skills/audit/SKILL.md']);
  });
});

// ─── User-authored files ──────────────────────────────────────────────────────

describe('planUninstall — user-authored files are never removed by default', () => {
  for (const file of USER_AUTHORED_FILES) {
    it(`keeps ${file} when the user did not say yes`, () => {
      const result = plan([file]);
      expect(result.managedFiles, `${file} leaked into the bulk sweep`).toEqual([]);
      expect(result.userFiles).toEqual([{ path: file, remove: false }]);
    });

    it(`removes ${file} only on an explicit yes`, () => {
      const result = plan([file], { choices: { [file]: true } });
      expect(result.userFiles).toEqual([{ path: file, remove: true }]);
    });
  }

  // Regression: loop.manifest.yaml used to fall through to the bulk sweep and
  // was deleted silently — it is the project's hand-tuned convergence policy.
  it('never deletes loop.manifest.yaml without asking', () => {
    const result = plan(['loop.manifest.yaml', '.claude/rules/quality.md']);
    expect(result.managedFiles).toEqual(['.claude/rules/quality.md']);
    expect(result.userFiles).toContainEqual({ path: 'loop.manifest.yaml', remove: false });
  });

  it('offers a user-authored file present on disk but absent from the manifest', () => {
    // An install predating the manifest entry still has the file to protect.
    const result = plan(['.claude/rules/quality.md'], {
      onDisk: ['.claude/rules/quality.md', 'CLAUDE.md'],
    });
    expect(result.userFiles).toEqual([{ path: 'CLAUDE.md', remove: false }]);
  });

  it('says nothing about a user-authored file that is not on disk', () => {
    expect(plan([]).userFiles).toEqual([]);
  });

  it('answers for one file do not leak to another', () => {
    const result = plan(['CLAUDE.md', 'AGENTS.md', 'loop.manifest.yaml'], {
      choices: { 'AGENTS.md': true },
    });
    expect(result.userFiles).toEqual([
      { path: 'CLAUDE.md', remove: false },
      { path: 'AGENTS.md', remove: true },
      { path: 'loop.manifest.yaml', remove: false },
    ]);
  });
});

// ─── thoughts/ ────────────────────────────────────────────────────────────────

describe('planUninstall — thoughts/', () => {
  it('keeps it unless the user said yes', () => {
    expect(plan([], { hasThoughts: true }).removeThoughts).toBe(false);
  });

  it('removes it on an explicit yes', () => {
    expect(plan([], { hasThoughts: true, choices: { thoughts: true } }).removeThoughts).toBe(true);
  });

  it('stays false when the directory is not there, whatever the answer', () => {
    expect(plan([], { hasThoughts: false, choices: { thoughts: true } }).removeThoughts).toBe(false);
  });
});

// ─── Plugin and marketplace ───────────────────────────────────────────────────

describe('planUninstall — plugin and marketplace', () => {
  it('unregisters a local plugin', () => {
    const result = plan([], { installMode: 'plugin', hasPluginDir: true });
    expect(result.unregisterPlugin).toBe(true);
    expect(result.unregisterMarketplace).toBe(false);
    expect(result.removePluginDir).toBe(true);
  });

  it('unregisters a marketplace install without a local directory', () => {
    const result = plan([], { installMode: 'marketplace' });
    expect(result.unregisterMarketplace).toBe(true);
    expect(result.unregisterPlugin).toBe(false);
    expect(result.removePluginDir).toBe(false);
  });

  it('does neither for a standalone install', () => {
    const result = plan([]);
    expect(result.unregisterPlugin).toBe(false);
    expect(result.unregisterMarketplace).toBe(false);
  });
});

// ─── A realistic install ──────────────────────────────────────────────────────

describe('planUninstall — a full install', () => {
  it('separates what devtronic owns from what the user made theirs', () => {
    const result = plan(
      [
        'CLAUDE.md',
        'AGENTS.md',
        'loop.manifest.yaml',
        '.claude/rules/architecture.md',
        '.claude/rules/quality.md',
        '.agents/skills/spec/SKILL.md',
        'thoughts/specs/auth.md',
        '.claude-plugins/devtronic/hooks/hooks.json',
      ],
      { installMode: 'marketplace', hasThoughts: true }
    );

    expect(result.managedFiles).toEqual([
      '.claude/rules/architecture.md',
      '.claude/rules/quality.md',
      '.agents/skills/spec/SKILL.md',
    ]);
    expect(result.userFiles.every((f) => !f.remove)).toBe(true);
    expect(result.removeThoughts).toBe(false);
  });
});
